from datetime import datetime, time

import pytest
from django.core.cache import cache

from ufobalapp.models import Goal, GoalieInMatch, Match, Player, Shot, Team, TeamOnTournament, Tournament


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


def make_tournament(name='T'):
    return Tournament.objects.create(
        category=Tournament.BRNO, date=datetime(2023, 6, 10), registration_to=datetime(2023, 6, 1),
        name=name, location='L', field_count=1, description='d',
    )


@pytest.fixture()
def setup():
    t = make_tournament()
    goalie = Player.objects.create(name='g', lastname='g', nickname='Goalie')
    a1 = Player.objects.create(name='a', lastname='a', nickname='A1')
    b1 = Player.objects.create(name='b', lastname='b', nickname='B1')
    team_a = TeamOnTournament.objects.create(team=Team.objects.create(name='A'), tournament=t)
    team_a.players.add(goalie, a1)
    team_b = TeamOnTournament.objects.create(team=Team.objects.create(name='B'), tournament=t)
    team_b.players.add(b1)
    m = Match.objects.create(tournament=t, team_one=team_a, team_two=team_b, length=time(0, 20))
    GoalieInMatch.objects.create(goalie=goalie, match=m, start=time(0, 0), end=time(0, 20))
    Goal.objects.create(match=m, shooter=b1, time=time(0, 5))       # against goalie
    Goal.objects.create(match=m, shooter=a1, time=time(0, 6))       # own team
    Goal.objects.create(match=m, shooter=b1, time=time(0, 25))      # outside window
    Shot.objects.create(match=m, team=team_b, time=time(0, 7))      # against goalie
    Shot.objects.create(match=m, team=team_a, time=time(0, 8))      # own team
    unfinished = Match.objects.create(tournament=t, team_one=team_a, team_two=team_b)
    GoalieInMatch.objects.create(goalie=goalie, match=unfinished, start=time(0, 0), end=time(0, 20))
    fake = Match.objects.create(tournament=t, team_one=team_a, team_two=team_b, length=time(0, 20), fake=True)
    GoalieInMatch.objects.create(goalie=goalie, match=fake, start=time(0, 0), end=time(0, 20))
    return {'t': t, 'goalie': goalie, 'team_a': team_a}


@pytest.mark.django_db
def test_goalie_stats_counts_goals_and_shots_against(client, setup):
    data = client.get('/api_frontend/goalie_stats').json()
    assert data == [{
        'goalie': setup['goalie'].pk, 'tournament': setup['t'].pk, 'team': setup['team_a'].pk,
        'matches': 1, 'shots': 2, 'goals': 1,
    }]


@pytest.mark.django_db
def test_goalie_stats_filter_by_tournament(client, setup):
    other = make_tournament('Other')
    assert client.get(f'/api_frontend/goalie_stats?tournament={other.pk}').json() == []
    assert len(client.get(f'/api_frontend/goalie_stats?tournament={setup["t"].pk}').json()) == 1


@pytest.mark.django_db
def test_goalie_without_end_gets_no_shots(client, setup):
    GoalieInMatch.objects.filter(match__length=time(0, 20), match__fake=False).update(end=None)
    row = client.get('/api_frontend/goalie_stats').json()[0]
    assert (row['matches'], row['shots'], row['goals']) == (1, 0, 0)


@pytest.mark.django_db
def test_goalie_stats_non_integer_tournament_is_400(client, setup):
    assert client.get('/api_frontend/goalie_stats?tournament=abc').status_code == 400


@pytest.mark.django_db
def test_goalie_stats_cache_is_invalidated_on_new_goal(client, setup):
    assert client.get('/api_frontend/goalie_stats').json()[0]['goals'] == 1
    match = Match.objects.get(tournament=setup['t'], length=time(0, 20), fake=False)
    shooter = Player.objects.get(nickname='B1')
    Goal.objects.create(match=match, shooter=shooter, time=time(0, 10))
    assert client.get('/api_frontend/goalie_stats').json()[0]['goals'] == 2
    assert client.get(f'/api_frontend/goalie_stats?tournament={setup["t"].pk}').json()[0]['goals'] == 2
