import json
from datetime import date, time

from unittest import mock

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache

from ufobalapp import views
from ufobalapp.models import Goal, GoalieInMatch, Match, Penalty, Player, Shot, Team, TeamOnTournament, Tournament


@pytest.fixture()
def setup(client):
    t = Tournament.objects.create(
        category=Tournament.BRNO,
        date=date(2023, 6, 10),
        registration_to=date(2023, 6, 1),
        name='T',
        location='L',
        field_count=1,
        description='d',
    )
    a1 = Player.objects.create(name='a', lastname='a', nickname='A1')
    b1 = Player.objects.create(name='b', lastname='b', nickname='B1')
    team_a = TeamOnTournament.objects.create(team=Team.objects.create(name='A'), tournament=t)
    team_a.players.add(a1)
    team_b = TeamOnTournament.objects.create(team=Team.objects.create(name='B'), tournament=t)
    team_b.players.add(b1)
    m = Match.objects.create(tournament=t, team_one=team_a, team_two=team_b, referee_team=team_b)
    client.force_login(User.objects.create_user('admin', password='x', is_staff=True))
    return {'m': m, 'a1': a1, 'b1': b1, 'team_a': team_a, 'team_b': team_b}


def post(client, url, data):
    return client.post(url, json.dumps(data), content_type='application/json')


@pytest.mark.django_db
def test_add_goal_is_idempotent_by_client_id(client, setup):
    body = {'match': setup['m'].pk, 'shooter': setup['a1'].pk, 'time': '00:01:00', 'client_id': 'uuid-1'}
    first = post(client, '/api_frontend/add_goal', body)
    second = post(client, '/api_frontend/add_goal', body)
    assert first.status_code == second.status_code == 200
    assert first.content == second.content
    assert Goal.objects.count() == 1


@pytest.mark.django_db
def test_add_shot_and_penalty_idempotent(client, setup):
    shot = {'match': setup['m'].pk, 'team': setup['team_a'].pk, 'time': '00:02:00', 'client_id': 's-1'}
    post(client, '/api_frontend/add_shot', shot)
    post(client, '/api_frontend/add_shot', shot)
    assert Shot.objects.count() == 1
    pen = {
        'match': setup['m'].pk,
        'player': setup['b1'].pk,
        'card': 'yellow',
        'reason': 'x',
        'time': '00:03:00',
        'client_id': 'p-1',
    }
    post(client, '/api_frontend/add_penalty', pen)
    post(client, '/api_frontend/add_penalty', pen)
    assert Penalty.objects.count() == 1


@pytest.mark.django_db
def test_change_goalie_idempotent(client, setup):
    url = f'/api_frontend/change_goalie/{setup["m"].pk}-{setup["team_a"].pk}'
    body = {'goalie': setup['a1'].pk, 'time': '00:04:00', 'client_id': 'g-1'}
    assert post(client, url, body).status_code == 200
    assert post(client, url, body).status_code == 200
    assert GoalieInMatch.objects.filter(match=setup['m']).count() == 1


@pytest.mark.django_db
def test_without_client_id_still_creates(client, setup):
    body = {'match': setup['m'].pk, 'shooter': setup['a1'].pk, 'time': '00:01:00'}
    post(client, '/api_frontend/add_goal', body)
    post(client, '/api_frontend/add_goal', body)
    assert Goal.objects.count() == 2


@pytest.mark.django_db
def test_goal_save_clears_goalie_stats_cache(setup):
    cache.set('goalie_stats', ['x'])
    Goal.objects.create(match=setup['m'], shooter=setup['a1'], time=time(0, 1))
    assert cache.get('goalie_stats') is None


@pytest.mark.django_db
def test_empty_client_id_is_treated_as_missing(client, setup):
    body = {'match': setup['m'].pk, 'shooter': setup['a1'].pk, 'time': '00:01:00', 'client_id': ''}
    assert post(client, '/api_frontend/add_goal', body).status_code == 200
    assert post(client, '/api_frontend/add_goal', body).status_code == 200
    assert Goal.objects.count() == 2


@pytest.mark.django_db
def test_replay_with_different_payload_returns_original(client, setup):
    body = {'match': setup['m'].pk, 'shooter': setup['a1'].pk, 'time': '00:01:00', 'client_id': 'uuid-2'}
    first = post(client, '/api_frontend/add_goal', body)
    second = post(client, '/api_frontend/add_goal', {**body, 'shooter': setup['b1'].pk, 'time': '00:09:00'})
    assert first.content == second.content
    goal = Goal.objects.get()
    assert goal.shooter_id == setup['a1'].pk
    assert goal.time == time(0, 1)


@pytest.mark.django_db
def test_integrity_error_race_returns_existing_goal(client, setup):
    existing = Goal.objects.create(
        match=setup['m'], shooter=setup['a1'], time=time(0, 1), client_id='race-1'
    )
    body = {'match': setup['m'].pk, 'shooter': setup['a1'].pk, 'time': '00:05:00', 'client_id': 'race-1'}
    with mock.patch.object(views, '_find_by_client_id', side_effect=[None, existing]):
        response = post(client, '/api_frontend/add_goal', body)
    assert response.status_code == 200
    assert response.content == str(existing.pk).encode()
    assert Goal.objects.count() == 1


@pytest.mark.django_db
def test_change_goalie_race_rolls_back_and_returns_ok(client, setup):
    first = GoalieInMatch.objects.create(goalie=setup['a1'], match=setup['m'], start=time(0, 0))
    GoalieInMatch.objects.create(goalie=setup['b1'], match=setup['m'], start=time(0, 0), client_id='race-g')
    url = f'/api_frontend/change_goalie/{setup["m"].pk}-{setup["team_a"].pk}'
    body = {'goalie': setup['a1'].pk, 'time': '00:04:00', 'client_id': 'race-g'}
    with mock.patch.object(views, '_find_by_client_id', side_effect=[None, object()]):
        response = post(client, url, body)
    assert response.status_code == 200
    first.refresh_from_db()
    assert first.end is None
    assert GoalieInMatch.objects.count() == 2


@pytest.mark.django_db
def test_match_json_carries_client_id(setup):
    m = setup['m']
    Goal.objects.create(match=m, shooter=setup['a1'], time=time(0, 1), client_id='cg')
    Goal.objects.create(match=m, shooter=setup['a1'], time=time(0, 2))
    Shot.objects.create(match=m, team=setup['team_a'], time=time(0, 3), client_id='cs')
    Penalty.objects.create(match=m, player=setup['b1'], card='yellow', reason='x', time=time(0, 4), client_id='cp')
    GoalieInMatch.objects.create(goalie=setup['a1'], match=m, start=time(0, 0), client_id='ci')
    data = m.to_json()
    assert {g['client_id'] for g in data['goals']} == {'cg', None}
    assert data['shots'][0]['client_id'] == 'cs'
    assert data['penalties'][0]['client_id'] == 'cp'
    assert data['goalies'][0]['client_id'] == 'ci'
