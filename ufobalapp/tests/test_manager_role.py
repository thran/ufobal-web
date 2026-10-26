import importlib
from datetime import date

import pytest
from django.apps import apps
from django.contrib.auth.models import AnonymousUser, Permission, User
from django.core.cache import cache

from ufobalapp.models import Match, Player, Team, TeamOnTournament, Tournament
from ufobalapp.permissions import is_manager
from ufobalapp.tests.helpers import create_manager

MANAGESTATS_PAGES = ['/managestats/', '/managestats/players', '/managestats/pairing_requests/']


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def plain_user():
    return User.objects.create_user('plain', password='x')


@pytest.mark.django_db
def test_is_manager_for_anonymous_and_plain_users(plain_user):
    assert not is_manager(AnonymousUser())
    assert not is_manager(plain_user)


@pytest.mark.django_db
def test_is_manager_for_manager_superuser_and_staff_only():
    assert is_manager(create_manager())
    assert is_manager(User.objects.create_superuser('root', password='x'))
    assert not is_manager(User.objects.create_user('staff', password='x', is_staff=True))


@pytest.mark.django_db
@pytest.mark.parametrize('url', MANAGESTATS_PAGES)
def test_managestats_requires_manager(client, plain_user, url):
    assert client.get(url).status_code == 302

    client.force_login(plain_user)
    assert client.get(url).status_code == 302

    client.force_login(User.objects.create_user('staff', password='x', is_staff=True))
    assert client.get(url).status_code == 302

    client.force_login(create_manager())
    assert client.get(url).status_code == 200


@pytest.mark.django_db
def test_managestats_open_for_superuser(client):
    client.force_login(User.objects.create_superuser('root', password='x'))
    assert client.get('/managestats/').status_code == 200


@pytest.mark.django_db
def test_user_payload_exposes_roles(client, plain_user):
    assert client.get('/api_frontend/user_profile').json() is None

    client.force_login(plain_user)
    data = client.get('/api_frontend/user_profile').json()
    assert (data['is_manager'], data['is_admin']) == (False, False)

    client.force_login(create_manager())
    data = client.get('/api_frontend/user_profile').json()
    assert (data['is_manager'], data['is_admin']) == (True, False)

    client.force_login(User.objects.create_user('staff', password='x', is_staff=True))
    data = client.get('/api_frontend/user_profile').json()
    assert (data['is_manager'], data['is_admin']) == (False, True)

    client.force_login(User.objects.create_superuser('root', password='x'))
    data = client.get('/api_frontend/user_profile').json()
    assert (data['is_manager'], data['is_admin']) == (True, True)


@pytest.mark.django_db
def test_birthdate_visible_to_manager_only(client):
    Player.objects.create(name='a', lastname='b', nickname='n', birthdate=date(2000, 1, 1))
    client.force_login(User.objects.create_user('staff', password='x', is_staff=True))
    assert 'birthdate' not in client.get('/api_frontend/players').json()[0]
    client.force_login(create_manager())
    assert 'birthdate' in client.get('/api_frontend/players').json()[0]


@pytest.mark.django_db
def test_manager_can_save_any_player(client, plain_user):
    player = Player.objects.create(name='a', lastname='b', nickname='n')
    payload = {'pk': player.pk, 'nickname': 'new', 'lastname': 'b', 'name': 'a', 'gender': 'M'}

    client.force_login(plain_user)
    response = client.post('/api_frontend/save_player', payload, content_type='application/json')
    assert response.status_code == 401

    client.force_login(create_manager())
    response = client.post('/api_frontend/save_player', payload, content_type='application/json')
    assert response.status_code == 200
    player.refresh_from_db()
    assert player.nickname == 'new'


@pytest.mark.django_db
def test_remove_match_is_manager_only(client, plain_user):
    t = Tournament.objects.create(
        category=Tournament.BRNO, date=date(2023, 6, 10), registration_to=date(2023, 6, 1), name='T', location='L',
        field_count=1, description='d',
    )
    team_a = TeamOnTournament.objects.create(team=Team.objects.create(name='A'), tournament=t)
    team_b = TeamOnTournament.objects.create(team=Team.objects.create(name='B'), tournament=t)
    for_manager = Match.objects.create(tournament=t, team_one=team_a, team_two=team_b, referee_team=team_b)

    client.force_login(plain_user)
    assert client.delete(f'/api_frontend/remove_match/{for_manager.pk}').status_code == 401

    client.force_login(User.objects.create_user('staff', password='x', is_staff=True))
    assert client.delete(f'/api_frontend/remove_match/{for_manager.pk}').status_code == 401

    client.force_login(create_manager())
    assert client.delete(f'/api_frontend/remove_match/{for_manager.pk}').status_code == 200
    assert not Match.objects.exists()


@pytest.mark.django_db
def test_migration_grants_manage_permission_to_non_superuser_staff():
    migration = importlib.import_module('ufobalapp.migrations.0041_manager_permission')
    staff = User.objects.create_user('staff', password='x', is_staff=True)
    superuser = User.objects.create_superuser('root', password='x')
    plain = User.objects.create_user('plain', password='x')

    migration.grant_manage_to_staff(apps, None)

    assert is_manager(User.objects.get(pk=staff.pk))
    assert not User.objects.get(pk=superuser.pk).user_permissions.exists()
    assert not User.objects.get(pk=plain.pk).user_permissions.exists()
    assert Permission.objects.filter(codename='manage').count() == 1
