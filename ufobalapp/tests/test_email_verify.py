import json
import re

import pytest
from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache

from ufobalapp.models import PendingEmailVerification

STRONG = 'Ufobal-heslo-2026'
SIGNUP = {'username': 'novy', 'email': 'Novy@example.cz', 'password': STRONG, 'password_check': STRONG}


def post(client, url, data):
    return client.post(f'/api_frontend/{url}', json.dumps(data), content_type='application/json')


@pytest.fixture(autouse=True)
def clear_rate_limits():
    cache.clear()
    yield
    cache.clear()


def verify_token():
    return re.search(r'/verify-email/(\S+)', mail.outbox[-1].body).group(1)


def logged_in(client):
    return client.session.get('_auth_user_id')


@pytest.mark.django_db
def test_signup_sends_link_and_does_not_log_in(client, settings):
    settings.SITE_URL = 'https://is.ufobal.cz'
    response = post(client, 'signup', SIGNUP)
    assert response.json() == {'verification_sent': True, 'email': 'Novy@example.cz'}
    assert logged_in(client) is None
    assert mail.outbox[0].to == ['Novy@example.cz']
    assert 'https://is.ufobal.cz/verify-email/' in mail.outbox[0].body
    assert PendingEmailVerification.objects.filter(user__username='novy').exists()


@pytest.mark.django_db
def test_login_waits_for_the_confirmation(client):
    post(client, 'signup', SIGNUP)
    response = post(client, 'login', {'username': 'novy', 'password': STRONG})
    assert response.status_code == 403
    assert response.json()['error_type'] == 'email_not_verified'
    assert logged_in(client) is None


@pytest.mark.django_db
def test_link_confirms_logs_in_and_works_once(client):
    post(client, 'signup', SIGNUP)
    token = verify_token()
    response = post(client, 'email_verify', {'token': token})
    assert response.status_code == 200
    assert response.json()['first_name'] == 'novy'
    assert logged_in(client) == str(User.objects.get(username='novy').pk)
    assert not PendingEmailVerification.objects.exists()

    client.logout()
    assert post(client, 'email_verify', {'token': token}).json()['error_type'] == 'already_verified'
    assert logged_in(client) is None
    assert post(client, 'login', {'username': 'novy@example.cz', 'password': STRONG}).status_code == 200


@pytest.mark.django_db
@pytest.mark.parametrize('token', ['', 'garbage', None])
def test_bad_link(client, token):
    post(client, 'signup', SIGNUP)
    assert post(client, 'email_verify', {'token': token}).json()['error_type'] == 'token_invalid'


@pytest.mark.django_db
def test_link_dies_when_the_email_changed(client):
    post(client, 'signup', SIGNUP)
    token = verify_token()
    User.objects.filter(username='novy').update(email='jiny@example.cz')
    assert post(client, 'email_verify', {'token': token}).json()['error_type'] == 'token_invalid'


@pytest.mark.django_db
def test_resend_only_to_unconfirmed_accounts_with_the_same_answer(client):
    post(client, 'signup', SIGNUP)
    User.objects.create_user('stary', email='stary@example.cz', password=STRONG)
    for login in ('NOVY@example.cz', 'novy', 'stary', 'nikdo@example.cz'):
        assert post(client, 'email_verify_resend', {'login': login}).json() == {'ok': True}
    # the signup e-mail plus one per lookup of the unconfirmed account
    assert [m.to for m in mail.outbox] == [['Novy@example.cz']] * 3


@pytest.mark.django_db
def test_resend_rate_limited(client):
    post(client, 'signup', SIGNUP)
    statuses = [post(client, 'email_verify_resend', {'login': 'novy'}).status_code for _ in range(6)]
    assert statuses == [200] * 5 + [429]


@pytest.mark.django_db
def test_password_reset_confirms_the_email(client):
    post(client, 'signup', SIGNUP)
    post(client, 'password_reset', {'email': 'novy@example.cz'})
    uid, token = re.search(r'/reset-password/([^/\s]+)/([^/\s]+)', mail.outbox[-1].body).groups()
    response = post(
        client, 'password_reset_confirm', {'uid': uid, 'token': token, 'password': STRONG, 'password_check': STRONG}
    )
    assert response.status_code == 200
    assert not PendingEmailVerification.objects.exists()


@pytest.mark.django_db
def test_existing_accounts_need_no_confirmation(client):
    User.objects.create_user('stary', email='stary@example.cz', password=STRONG)
    assert post(client, 'login', {'username': 'stary', 'password': STRONG}).status_code == 200
