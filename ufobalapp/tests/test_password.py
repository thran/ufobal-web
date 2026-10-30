import json
import re

import pytest
from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from social_django.models import UserSocialAuth

STRONG = 'Ufobal-heslo-2026'


def post(client, url, data):
    return client.post(f'/api_frontend/{url}', json.dumps(data), content_type='application/json')


@pytest.fixture(autouse=True)
def clear_rate_limits():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture()
def user():
    return User.objects.create_user('wizy', email='Wizy@Example.cz', password='stare-heslo-123')


def reset_link():
    """uid and token from the last sent reset e-mail."""
    match = re.search(r'/reset-password/([^/\s]+)/([^/\s]+)', mail.outbox[-1].body)
    return {'uid': match.group(1), 'token': match.group(2)}


# login


@pytest.mark.django_db
@pytest.mark.parametrize('login', ['wizy', 'wizy@example.cz', ' WIZY@EXAMPLE.CZ'])
def test_login_by_username_or_email(client, user, login):
    response = post(client, 'login', {'username': login, 'password': 'stare-heslo-123'})
    assert response.status_code == 200
    assert response.json()['has_password'] is True


@pytest.mark.django_db
def test_login_wrong_password_or_unknown_email(client, user):
    assert post(client, 'login', {'username': 'wizy@example.cz', 'password': 'x'}).status_code == 401
    assert post(client, 'login', {'username': 'nobody@example.cz', 'password': 'x'}).status_code == 401


@pytest.mark.django_db
def test_login_by_email_skips_inactive_duplicate(client, user):
    User.objects.create_user('wizy-old', email='wizy@example.cz', password='stare-heslo-123', is_active=False)
    response = post(client, 'login', {'username': 'wizy@example.cz', 'password': 'stare-heslo-123'})
    assert response.status_code == 200
    assert client.session['_auth_user_id'] == str(user.pk)


# reset


@pytest.mark.django_db
def test_reset_sends_link_built_from_site_url(client, user, settings):
    settings.SITE_URL = 'https://is.ufobal.cz'
    response = client.post(
        '/api_frontend/password_reset',
        json.dumps({'email': 'WIZY@example.cz'}),
        content_type='application/json',
        HTTP_HOST='evil.example',
    )
    assert response.status_code == 200
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [user.email]
    assert 'https://is.ufobal.cz/reset-password/' in mail.outbox[0].body
    assert 'evil.example' not in mail.outbox[0].body


@pytest.mark.django_db
def test_reset_same_answer_for_unknown_and_inactive_email(client, user):
    User.objects.create_user('old', email='old@example.cz', is_active=False)
    for email in ('nobody@example.cz', 'old@example.cz'):
        response = post(client, 'password_reset', {'email': email})
        assert response.status_code == 200
        assert response.json() == {'ok': True}
    assert mail.outbox == []


@pytest.mark.django_db
def test_reset_works_for_social_only_account(client):
    social = User.objects.create_user('google-user', email='g@example.cz')  # unusable password
    UserSocialAuth.objects.create(user=social, provider='google-oauth2', uid='g@example.cz')
    post(client, 'password_reset', {'email': 'g@example.cz'})
    link = reset_link()
    check = post(client, 'password_reset_check', link).json()
    assert check == {'valid': True, 'username': 'google-user', 'has_password': False}
    response = post(client, 'password_reset_confirm', {**link, 'password': STRONG, 'password_check': STRONG})
    assert response.status_code == 200
    social.refresh_from_db()
    assert social.check_password(STRONG)
    assert UserSocialAuth.objects.filter(user=social).exists()


@pytest.mark.django_db
def test_reset_confirm_sets_password_logs_in_and_link_dies(client, user):
    post(client, 'password_reset', {'email': 'wizy@example.cz'})
    link = reset_link()
    response = post(client, 'password_reset_confirm', {**link, 'password': STRONG, 'password_check': STRONG})
    assert response.status_code == 200
    assert client.session['_auth_user_id'] == str(user.pk)
    user.refresh_from_db()
    assert user.check_password(STRONG)
    assert post(client, 'password_reset_check', link).json() == {'valid': False}
    again = post(
        client, 'password_reset_confirm', {**link, 'password': 'Jine-heslo-2026', 'password_check': 'Jine-heslo-2026'}
    )
    assert again.status_code == 400
    assert again.json()['error_type'] == 'token_invalid'


@pytest.mark.django_db
@pytest.mark.parametrize('password, check', [('kratke', 'kratke'), ('12345678901', '12345678901'), (STRONG, 'jine')])
def test_reset_confirm_rejects_weak_or_mismatched_password(client, user, password, check):
    post(client, 'password_reset', {'email': 'wizy@example.cz'})
    response = post(client, 'password_reset_confirm', {**reset_link(), 'password': password, 'password_check': check})
    assert response.status_code == 400
    assert response.json()['error_type'] == 'password_invalid'
    user.refresh_from_db()
    assert user.check_password('stare-heslo-123')


@pytest.mark.django_db
@pytest.mark.parametrize('link', [{}, {'uid': 'x', 'token': 'y'}, {'uid': 'MQ', 'token': 'abc-def'}])
def test_reset_check_rejects_garbage(client, user, link):
    assert post(client, 'password_reset_check', link).json() == {'valid': False}


@pytest.mark.django_db
def test_reset_rate_limited_per_email(client, user):
    statuses = [post(client, 'password_reset', {'email': 'wizy@example.cz'}).status_code for _ in range(6)]
    assert statuses == [200] * 5 + [429]
    assert len(mail.outbox) == 5


@pytest.mark.django_db
def test_reset_requires_email_and_post(client):
    assert post(client, 'password_reset', {'email': ' '}).status_code == 400
    assert client.get('/api_frontend/password_reset').status_code == 405


# change


@pytest.mark.django_db
def test_change_password_needs_old_password(client, user):
    client.force_login(user)
    wrong = post(client, 'password_change', {'old_password': 'x', 'password': STRONG, 'password_check': STRONG})
    assert wrong.status_code == 400
    ok = post(
        client, 'password_change', {'old_password': 'stare-heslo-123', 'password': STRONG, 'password_check': STRONG}
    )
    assert ok.status_code == 200
    user.refresh_from_db()
    assert user.check_password(STRONG)
    # the session survives the password change
    assert client.get('/api_frontend/user_profile').json() is not None


@pytest.mark.django_db
def test_social_only_account_sets_first_password_without_old_one(client):
    social = User.objects.create_user('fb-user', email='fb@example.cz')
    client.force_login(social)
    response = post(client, 'password_change', {'password': STRONG, 'password_check': STRONG})
    assert response.status_code == 200
    assert response.json()['has_password'] is True


@pytest.mark.django_db
def test_change_password_anonymous_is_401(client):
    assert post(client, 'password_change', {'password': STRONG, 'password_check': STRONG}).status_code == 401


# signup


@pytest.mark.django_db
def test_signup_rejects_existing_email_any_case_and_weak_password(client, user):
    data = {'username': 'novy', 'email': 'WIZY@example.cz', 'password': STRONG, 'password_check': STRONG}
    assert post(client, 'signup', data).json()['error_type'] == 'email_exists'
    weak = {**data, 'email': 'novy@example.cz', 'password': 'heslo', 'password_check': 'heslo'}
    assert post(client, 'signup', weak).json()['error_type'] == 'password_invalid'
    assert post(client, 'signup', {**data, 'email': 'novy@example.cz'}).status_code == 200
