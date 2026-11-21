import pytest
from django.contrib.auth.models import User

from ufobalapp.models import Player


@pytest.mark.django_db
def test_player_change_page_does_not_list_all_users(client):
    admin = User.objects.create_superuser('admin', 'admin@example.com', 'x')
    User.objects.create_user('unrelated-user')
    player = Player.objects.create(name='n', lastname='l', nickname='P')
    client.force_login(admin)

    response = client.get(f'/admin/ufobalapp/player/{player.pk}/change/')

    assert response.status_code == 200
    assert 'unrelated-user' not in response.content.decode()


@pytest.mark.django_db
def test_user_autocomplete_finds_user_for_player(client):
    admin = User.objects.create_superuser('admin', 'admin@example.com', 'x')
    User.objects.create_user('findme')
    client.force_login(admin)

    response = client.get(
        '/admin/autocomplete/',
        {'term': 'find', 'app_label': 'ufobalapp', 'model_name': 'player', 'field_name': 'user'},
    )

    assert response.status_code == 200
    assert [r['text'] for r in response.json()['results']] == ['findme']
