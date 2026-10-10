from datetime import datetime

import pytest
from django.core.cache import cache
from django.test import Client

from ufobalapp.models import Goal, Match, Player, Team, TeamOnTournament, Tournament


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_hall_of_glory_empty_database():
    data = Client().get('/api_frontend/hall_of_glory').json()
    assert data['max_teams_per_tournament'] == {'value': None, 'instances': []}
    assert data['max_goals_per_team'] == {'value': None, 'instances': []}


@pytest.mark.django_db
def test_hall_of_glory_goal_without_assistance_and_no_women():
    t = Tournament.objects.create(
        category=Tournament.BRNO, date=datetime(2023, 6, 10), registration_to=datetime(2023, 6, 1),
        name='T', location='L', field_count=1, description='d',
    )
    shooter = Player.objects.create(name='a', lastname='a', nickname='A', gender=Player.MAN)
    one = TeamOnTournament.objects.create(team=Team.objects.create(name='A'), tournament=t)
    two = TeamOnTournament.objects.create(team=Team.objects.create(name='B'), tournament=t)
    match = Match.objects.create(tournament=t, team_one=one, team_two=two, start=datetime(2023, 6, 10, 10))
    Goal.objects.create(match=match, shooter=shooter, assistance=None, time=datetime(2023, 6, 10, 10, 5).time())

    response = Client().get('/api_frontend/hall_of_glory')

    assert response.status_code == 200
    data = response.json()
    assert data['max_assistance_per_tournament_player'] == {'value': None, 'instances': []}
    assert data['max_goal_per_tournament_player_female'] == {'value': None, 'instances': []}
    assert data['max_goal_per_tournament_player']['value'] == 1
