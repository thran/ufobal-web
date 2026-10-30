import json
import re
from unittest import mock
from urllib.parse import parse_qs, urlsplit

import pytest
from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from social_django.models import UserSocialAuth

from ufobalapp.models import PendingEmailVerification
from ufobalapp.social_pipeline import EmailAccountExists, associate_by_email


def post(client, url, data):
    return client.post(f'/api_frontend/{url}', json.dumps(data), content_type='application/json')


@pytest.fixture(autouse=True)
def clear_rate_limits():
    cache.clear()
    yield
    cache.clear()


def google_login(client, profile, next_url='/settings'):
    """Runs the whole Google login with Google itself mocked out; returns the final redirect URL."""
    start = client.get(f'/login/google-oauth2/?next={next_url}')
    state = parse_qs(urlsplit(start['Location']).query)['state'][0]
    with mock.patch(
        'social_core.backends.google.GoogleOAuth2.request_access_token', return_value={'access_token': 'x'}
    ), mock.patch('social_core.backends.google.GoogleOAuth2.user_data', return_value=profile):
        response = client.get(f'/complete/google-oauth2/?state={state}&code=c')
    assert response.status_code == 302
    return response['Location']


def profile(email, verified=True, **extra):
    return {'email': email, 'email_verified': verified, 'given_name': 'Google', 'family_name': 'Name', **extra}


def logged_in_user(client):
    user_id = client.session.get('_auth_user_id')
    return User.objects.get(pk=user_id) if user_id else None


# associate_by_email pipeline step


class Backend:
    def __init__(self, name):
        self.name = name


@pytest.mark.django_db
@pytest.mark.parametrize(
    'backend, has_password', [('google-oauth2', True), ('google-oauth2', False), ('facebook', True)]
)
def test_known_email_joins_the_account(backend, has_password):
    account = User.objects.create_user(
        'pepa', email='Pepa@Example.cz', password='heslo-123456' if has_password else None
    )
    result = associate_by_email(Backend(backend), {'email': 'pepa@example.cz'}, response={'email_verified': True})
    assert result == {'user': account, 'is_new': False}
    account.refresh_from_db()
    assert account.has_usable_password() == has_password


@pytest.mark.django_db
def test_unverified_google_email_or_two_accounts_stop_the_login():
    User.objects.create_user('pepa', email='pepa@example.cz', password='heslo-123456')
    with pytest.raises(EmailAccountExists):
        associate_by_email(Backend('google-oauth2'), {'email': 'pepa@example.cz'}, response={'email_verified': False})
    User.objects.create_user('pepa2', email='PEPA@example.cz')
    with pytest.raises(EmailAccountExists):
        associate_by_email(Backend('facebook'), {'email': 'pepa@example.cz'})


@pytest.mark.django_db
def test_unconfirmed_registration_is_taken_over_without_its_password():
    squatted = User.objects.create_user('squat', email='pepa@example.cz', password='heslo-123456')
    PendingEmailVerification.objects.create(user=squatted)
    result = associate_by_email(Backend('facebook'), {'email': 'pepa@example.cz'})
    assert result['user'] == squatted
    squatted.refresh_from_db()
    assert not squatted.has_usable_password()
    assert not PendingEmailVerification.objects.exists()


@pytest.mark.django_db
def test_unknown_or_inactive_email_and_logged_in_user_pass_through():
    User.objects.create_user('old', email='old@example.cz', is_active=False)
    google = Backend('google-oauth2')
    assert associate_by_email(google, {'email': 'old@example.cz'}, response={'email_verified': True}) is None
    assert associate_by_email(google, {'email': 'new@example.cz'}, response={'email_verified': True}) is None
    assert associate_by_email(google, {'email': ''}) is None
    someone = User.objects.create_user('someone', email='someone@example.cz', password='heslo-123456')
    assert associate_by_email(google, {'email': 'someone@example.cz'}, user=someone) is None


# the whole login


@pytest.mark.django_db
def test_cancelled_login_returns_to_the_page_with_an_error(client):
    client.get('/login/google-oauth2/?next=/settings')
    response = client.get('/complete/google-oauth2/?error=access_denied')
    assert response.status_code == 302
    assert response['Location'] == '/settings?login_error=cancelled'


@pytest.mark.django_db
def test_next_to_another_host_is_ignored(client):
    client.get('/login/google-oauth2/?next=https://evil.example/x')
    response = client.get('/complete/google-oauth2/?error=access_denied')
    assert not response['Location'].startswith('https://evil.example')


@pytest.mark.django_db
def test_new_google_login_creates_an_account(client):
    location = google_login(client, profile('new@example.cz'), next_url='/players')
    assert location == '/players'
    user = logged_in_user(client)
    assert (user.email, user.first_name) == ('new@example.cz', 'Google')
    assert user.social_auth.get().uid == 'new@example.cz'


@pytest.mark.django_db
def test_google_login_joins_facebook_only_account_with_the_same_email(client):
    fb_account = User.objects.create_user('fb-account', email='pepa@example.cz', first_name='Pepa')
    UserSocialAuth.objects.create(user=fb_account, provider='facebook', uid='123')
    google_login(client, profile('pepa@example.cz'))
    assert logged_in_user(client) == fb_account
    assert User.objects.count() == 1
    assert set(fb_account.social_auth.values_list('provider', flat=True)) == {'facebook', 'google-oauth2'}
    fb_account.refresh_from_db()
    assert fb_account.first_name == 'Pepa'  # the name from Google does not overwrite it


@pytest.mark.django_db
def test_google_login_joins_password_account_with_the_same_email(client):
    account = User.objects.create_user('pepa', email='pepa@example.cz', password='heslo-123456')
    assert google_login(client, profile('pepa@example.cz')) == '/settings'
    assert logged_in_user(client) == account
    assert User.objects.count() == 1 and account.social_auth.get().provider == 'google-oauth2'


@pytest.mark.django_db
def test_google_login_with_unverified_email_of_known_account_stops(client):
    User.objects.create_user('pepa', email='pepa@example.cz', password='heslo-123456')
    location = google_login(client, profile('pepa@example.cz', verified=False))
    assert location == '/settings?login_error=email_exists'
    assert logged_in_user(client) is None
    assert User.objects.count() == 1 and not UserSocialAuth.objects.exists()


@pytest.mark.django_db
def test_logged_in_user_connects_google_with_another_email(client):
    user = User.objects.create_user('pepa', email='pepa@seznam.cz', password='heslo-123456')
    client.force_login(user)
    assert google_login(client, profile('pepa.jiny@gmail.com')) == '/settings'
    assert user.social_auth.get().uid == 'pepa.jiny@gmail.com'
    user.refresh_from_db()
    assert user.email == 'pepa@seznam.cz'


@pytest.mark.django_db
def test_connecting_google_linked_to_another_account_fails(client):
    other = User.objects.create_user('other', email='other@example.cz')
    UserSocialAuth.objects.create(user=other, provider='google-oauth2', uid='shared@gmail.com')
    client.force_login(User.objects.create_user('pepa', email='pepa@example.cz', password='heslo-123456'))
    assert google_login(client, profile('shared@gmail.com')) == '/settings?login_error=already_linked'
    assert UserSocialAuth.objects.get().user == other


# account settings


@pytest.fixture()
def user(client):
    user = User.objects.create_user('pepa', email='pepa@example.cz', password='heslo-123456', first_name='Pepa')
    client.force_login(user)
    return user


@pytest.mark.django_db
def test_account_needs_login(client):
    assert client.get('/api_frontend/account').status_code == 401


@pytest.mark.django_db
def test_account_shows_linked_logins(client, user):
    UserSocialAuth.objects.create(user=user, provider='google-oauth2', uid='pepa@gmail.com')
    data = client.get('/api_frontend/account').json()
    assert data['username'] == 'pepa' and data['has_password'] is True
    assert [(s['provider'], s['uid']) for s in data['social']] == [('google-oauth2', 'pepa@gmail.com')]


@pytest.mark.django_db
def test_email_change_needs_the_link_from_the_new_address(client, user, settings):
    settings.SITE_URL = 'https://is.ufobal.cz'
    assert post(client, 'email_change', {'email': 'novy@example.cz'}).status_code == 200
    user.refresh_from_db()
    assert user.email == 'pepa@example.cz'
    assert mail.outbox[0].to == ['novy@example.cz']
    token = re.search(r'https://is\.ufobal\.cz/confirm-email/(\S+)', mail.outbox[0].body).group(1)
    client.logout()  # the link works from any browser
    assert post(client, 'email_change_confirm', {'token': token}).json() == {'email': 'novy@example.cz'}
    assert post(client, 'email_change_confirm', {'token': token}).status_code == 200  # reloaded page
    user.refresh_from_db()
    assert user.email == 'novy@example.cz'


@pytest.mark.django_db
def test_email_change_refuses_taken_same_or_invalid(client, user):
    User.objects.create_user('jiny', email='Jiny@example.cz')
    assert post(client, 'email_change', {'email': 'jiny@example.cz'}).json()['error_type'] == 'email_exists'
    assert post(client, 'email_change', {'email': 'PEPA@example.cz'}).json()['error_type'] == 'email_same'
    assert post(client, 'email_change', {'email': 'nic'}).json()['error_type'] == 'email_invalid'
    assert mail.outbox == []


@pytest.mark.django_db
def test_email_change_link_dies_when_email_changed_otherwise_or_tampered(client, user):
    post(client, 'email_change', {'email': 'prvni@example.cz'})
    first = re.search(r'/confirm-email/(\S+)', mail.outbox[-1].body).group(1)
    post(client, 'email_change', {'email': 'druhy@example.cz'})
    second = re.search(r'/confirm-email/(\S+)', mail.outbox[-1].body).group(1)
    assert post(client, 'email_change_confirm', {'token': second}).status_code == 200
    assert post(client, 'email_change_confirm', {'token': first}).json()['error_type'] == 'token_invalid'
    assert post(client, 'email_change_confirm', {'token': second[:-2] + 'xx'}).json()['error_type'] == 'token_invalid'
    user.refresh_from_db()
    assert user.email == 'druhy@example.cz'


@pytest.mark.django_db
def test_disconnect(client, user):
    google = UserSocialAuth.objects.create(user=user, provider='google-oauth2', uid='pepa@gmail.com')
    response = post(client, 'social_disconnect', {'id': google.pk})
    assert response.status_code == 200
    assert response.json()['social'] == []


@pytest.mark.django_db
def test_disconnect_refuses_last_login_method_and_foreign_login(client):
    social_only = User.objects.create_user('fb', email='fb@example.cz')
    facebook = UserSocialAuth.objects.create(user=social_only, provider='facebook', uid='1')
    client.force_login(social_only)
    assert post(client, 'social_disconnect', {'id': facebook.pk}).json()['error_type'] == 'last_login_method'
    other = UserSocialAuth.objects.create(user=User.objects.create_user('x'), provider='google-oauth2', uid='x@x.cz')
    assert post(client, 'social_disconnect', {'id': other.pk}).status_code == 404
    assert UserSocialAuth.objects.count() == 2
