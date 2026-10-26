import json
from datetime import date

import pytest

from ufobalapp.models import Match, Player, Team, TeamOnTournament, Tournament
from ufobalapp.tests.helpers import create_manager


def make_tournament():
    return Tournament.objects.create(
        category=Tournament.BRNO, date=date(2023, 6, 10), registration_to=date(2023, 6, 1),
        name='T', location='L', field_count=2, description='d',
    )


@pytest.fixture()
def setup():
    t = make_tournament()
    tots = []
    for name in ('A', 'B', 'C'):
        tot = TeamOnTournament.objects.create(team=Team.objects.create(name=name), tournament=t)
        tots.append(tot)
    referee = Player.objects.create(name='r', lastname='r', nickname='Ref')
    return {'t': t, 'tots': tots, 'referee': referee}


def post(client, url, data):
    return client.post(url, json.dumps(data), content_type='application/json')


@pytest.mark.django_db
def test_extended_match_json_has_referee_object(setup):
    a, b, c = setup['tots']
    m = Match.objects.create(tournament=setup['t'], team_one=a, team_two=b, referee_team=c, referee=setup['referee'])
    data = m.to_json(events=False, extended=True)
    assert data['referee']['pk'] == setup['referee'].pk
    m.referee = None
    assert m.to_json(events=False, extended=True)['referee'] is None


@pytest.mark.django_db
def test_anonymous_pairing_request_is_401(client, setup):
    response = post(client, f'/api_frontend/create_pairing_request/{setup["referee"].pk}', {'text': None})
    assert response.status_code == 401


@pytest.mark.django_db
def test_referee_feedbacks_for_staff_without_player_is_400(client, setup):
    client.force_login(create_manager('admin'))
    response = client.get(f'/api_frontend/get_referee_feedbacks/{setup["t"].pk}')
    assert response.status_code == 400
    assert response.content.decode() == 'Nejsi v žádném týmu'
    response = post(client, '/api_frontend/save_referee_feedback', {'match': 1, 'feedback': {}})
    assert response.status_code == 400


@pytest.mark.django_db
def test_add_match_with_bad_goalie_creates_nothing(client, setup):
    a, b, c = setup['tots']
    client.force_login(create_manager('admin'))
    outsider = Player.objects.create(name='o', lastname='o', nickname='Out')
    response = post(client, '/api_frontend/add_match', {
        'tournament': setup['t'].pk, 'team_one': a.pk, 'team_two': b.pk, 'referee_team': c.pk,
        'place': '1', 'goalie_one': outsider.pk,
    })
    assert response.status_code == 400
    assert Match.objects.count() == 0
    response = post(client, '/api_frontend/add_match', {
        'tournament': setup['t'].pk, 'team_one': a.pk, 'team_two': b.pk, 'referee_team': c.pk,
        'place': '1', 'goalie_one': 999999,
    })
    assert response.status_code == 404
    assert Match.objects.count() == 0
