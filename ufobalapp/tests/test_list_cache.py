from datetime import date

import pytest
from django.core.cache import cache

from ufobalapp.models import Player, list_cache_key
from ufobalapp.tests.helpers import create_manager


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_manager_request_does_not_leak_birthdate_to_public(client):
    Player.objects.create(name='a', lastname='b', nickname='n', birthdate=date(2000, 1, 1))
    manager = create_manager('admin')
    client.force_login(manager)
    assert 'birthdate' in client.get('/api_frontend/players').json()[0]
    client.logout()
    assert 'birthdate' not in client.get('/api_frontend/players').json()[0]


@pytest.mark.django_db
def test_public_cache_does_not_hide_birthdate_from_manager(client):
    Player.objects.create(name='a', lastname='b', nickname='n', birthdate=date(2000, 1, 1))
    assert 'birthdate' not in client.get('/api_frontend/players').json()[0]
    client.force_login(create_manager('admin'))
    assert 'birthdate' in client.get('/api_frontend/players').json()[0]


@pytest.mark.django_db
def test_save_resets_both_cache_variants():
    cache.set(list_cache_key(Player, False), ['x'])
    cache.set(list_cache_key(Player, True), ['x'])
    Player.objects.create(name='a', lastname='b', nickname='n')
    assert cache.get(list_cache_key(Player, False)) is None
    assert cache.get(list_cache_key(Player, True)) is None
