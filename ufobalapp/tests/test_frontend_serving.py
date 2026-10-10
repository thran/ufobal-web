import json
import re
from datetime import datetime

import pytest
from django.contrib.auth.models import User
from django.urls import reverse

from ufobalapp.models import Player, Tournament


def test_old_api_mounted_under_old_prefix():
    assert reverse('api:get_players') == '/old/api/players'
    assert reverse('api_frontend:get_players') == '/api_frontend/players'


@pytest.mark.django_db
def test_old_frontend_served_under_old(client):
    response = client.get('/old/hraci')
    assert response.status_code == 200
    assert b'<base href="/old/">' in response.content
    assert b'ng-app="ufoIS"' in response.content


@pytest.mark.django_db
def test_old_frontend_root(client):
    response = client.get('/old/')
    assert response.status_code == 200
    assert b'<base href="/old/">' in response.content


@pytest.mark.django_db
def test_unknown_api_frontend_endpoint_is_404(client):
    assert client.get('/api_frontend/does_not_exist').status_code == 404


SPA_STUB = '<script id="initial-data" type="application/json">{{ initial_json|safe }}</script>'


@pytest.fixture()
def spa_template(settings, tmp_path):
    (tmp_path / 'spa.html').write_text(SPA_STUB)
    settings.TEMPLATES = [
        {**settings.TEMPLATES[0], 'DIRS': [str(tmp_path), *settings.TEMPLATES[0]['DIRS']]},
    ]


def _initial(response):
    match = re.search(rb'<script id="initial-data" type="application/json">(.*)</script>', response.content)
    return json.loads(match.group(1))


@pytest.mark.django_db
def test_spa_served_at_root_without_tournaments(client, spa_template):
    response = client.get('/players')
    assert response.status_code == 200
    assert _initial(response) == {'user': None, 'liveTournamentPk': None, 'test': False}
    assert 'csrftoken' in response.cookies


@pytest.mark.django_db
def test_spa_live_tournament(client, spa_template):
    t = Tournament.objects.create(
        category=Tournament.BRNO, date=datetime(2021, 1, 1), registration_to=datetime(2020, 1, 1),
        name='T', location='L', field_count=1, description='d',
    )
    assert _initial(client.get('/'))['liveTournamentPk'] == t.pk


@pytest.mark.django_db
def test_spa_initial_json_escapes_script_end(client, spa_template):
    user = User.objects.create_user('pepa', password='x')
    Player.objects.create(name='a', lastname='b', nickname='</script><b>x', user=user)
    client.force_login(user)
    response = client.get('/')
    assert b'</script><b>x' not in response.content
    assert _initial(response)['user']['player']['nickname'] == '</script><b>x'


@pytest.mark.django_db
def test_intro_is_spa_route(client, spa_template):
    assert b'id="initial-data"' in client.get('/intro').content


@pytest.mark.django_db
def test_close_login_popup_posts_message(client):
    response = client.get('/login/close_login_popup')
    assert response.status_code == 200
    assert b'ufo-social-login' in response.content
