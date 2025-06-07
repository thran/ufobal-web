from datetime import datetime, timedelta

import pytest
from django.contrib.auth.models import User

from ufobalapp.models import Player, Tournament, TeamOnTournament, Team, Match

from django.urls import reverse


@pytest.fixture()
def tournament():
    yield Tournament.objects.create(
        category=Tournament.BRNO,
        date=datetime(year=2021, month=1, day=1),
        registration_to=datetime(year=2020, month=1, day=1),
        name='Test',
        location='Zamilec',
        field_count=3,
        description='description',
    )


@pytest.fixture()
def team():
    yield Team.objects.create(name='The team', name_short='TT', description='description')


@pytest.fixture()
def team1():
    yield Team.objects.create(name='Team B', name_short='A', description='description')


@pytest.fixture()
def team2():
    yield Team.objects.create(name='Team B', name_short='B', description='description')


@pytest.mark.django_db
def test_get_players(django_assert_num_queries, client):
    player = Player.objects.create(
        name='Josef',
        lastname='Novák',
        nickname='Pepa',
        gender=Player.WOMAN,
        birthdate=datetime.now() - timedelta(days=365 * 10 + 100),
    )
    for i in range(20):
        Player.objects.create(
            name=f'Josef_{i}',
            lastname=f'Novák_{i}',
            nickname=f'Pepa_{i}',
            gender=Player.MAN,
            birthdate=datetime.now() - timedelta(days=365 * 10 + 100 + i),
        )
    expected_response = {
        'pk': player.pk,
        'name': 'Josef',
        'lastname': 'Novák',
        'nickname': 'Pepa',
        'age': 10,
        'full_name': 'Pepa - Josef Novák',
        'gender': 'woman',
        'is_paired': False,
        'penalties': [],
        'tournaments': [],
    }

    response = client.get(reverse('api:get_player', kwargs={'pk': player.pk}))
    assert response.status_code == 200
    assert response.json() == expected_response

    player.user = User.objects.create_user(username='test', password='test')
    player.save()
    response = client.get(reverse('api:get_player', kwargs={'pk': player.pk}))
    expected_response['is_paired'] = True
    assert response.status_code == 200
    assert response.json() == expected_response

    with django_assert_num_queries(3):
        response = client.get(reverse('api:get_players'))
    assert response.status_code == 200
    assert len(response.json()) == 21
    del expected_response['tournaments']
    assert response.json()[0] == expected_response


@pytest.mark.django_db
def test_get_tournaments(django_assert_num_queries, client, tournament):
    expected_response = {
        'category': 'Brno',
        'category_slugname': 'brno',
        'closed_edit': False,
        'date': '2021-01-01',
        'description': 'description',
        'field_count': 3,
        'full_name': 'Test 2021',
        'halftime_length': 8,
        'is_after_tournament': True,
        'is_tournament_open': True,
        'location': 'Zamilec',
        'name': 'Test',
        'pk': tournament.pk,
        'registration_open': False,
        'registration_to': '2020-01-01',
        'year': 2021,
    }

    response = client.get(reverse('api:get_tournament', kwargs={'pk': tournament.pk}))
    assert response.status_code == 200
    assert response.json() == expected_response

    with django_assert_num_queries(2):
        response = client.get(reverse('api:get_tournaments'))
    assert response.status_code == 200
    assert len(response.json()) == 1
    expected_response['teams'] = []
    assert response.json()[0] == expected_response


@pytest.mark.django_db
def test_get_teams_on_tournaments(django_assert_num_queries, client, tournament, team):
    tot = TeamOnTournament.objects.create(
        tournament=tournament,
        team=team,
        name='The teameee',
        name_short='TTeee',
    )
    expected_response = {
        'captain': None,
        'default_goalie': None,
        'name': 'The teameee (The team)',
        'name_pure': 'TTeee',
        'name_short': 'TTeee',
        'pk': tot.pk,
        'players': [],
        'rank': None,
        'team': {
            'description': 'description',
            'name': 'The team',
            'name_pure': 'TT',
            'name_short': 'TT',
            'pk': team.pk,
        },
        'tournament': {
            'category': 'Brno',
            'category_slugname': 'brno',
            'closed_edit': False,
            'date': '2021-01-01',
            'description': 'description',
            'field_count': 3,
            'full_name': 'Test 2021',
            'halftime_length': 8,
            'is_after_tournament': True,
            'is_tournament_open': True,
            'location': 'Zamilec',
            'name': 'Test',
            'pk': tournament.pk,
            'registration_open': False,
            'registration_to': '2020-01-01',
            'year': 2021,
        },
    }

    response = client.get(reverse('api:get_teamontournament', kwargs={'pk': tot.pk}))
    assert response.status_code == 200
    assert response.json() == expected_response

    with django_assert_num_queries(2):
        response = client.get(reverse('api:get_teamontournaments'))
    assert response.status_code == 200
    del expected_response['players']
    expected_response['player_pks'] = []
    assert len(response.json()) == 1
    assert response.json()[0] == expected_response


@pytest.mark.django_db
def test_get_matches(django_assert_num_queries, client, tournament, team, team1, team2):
    team_one = TeamOnTournament.objects.create(tournament=tournament, team=team1)
    team_two = TeamOnTournament.objects.create(tournament=tournament, team=team2)
    team_ref = TeamOnTournament.objects.create(tournament=tournament, team=team)
    match = Match.objects.create(
        tournament=tournament,
        team_one=team_one,
        team_two=team_two,
        referee_team=team_ref,
        place='1',
    )
    Match.objects.create(
        tournament=tournament,
        team_one=team_one,
        team_two=team_two,
        referee_team=team_ref,
        place='1',
    )
    expected_response = {
        'end': None,
        'fake': False,
        'goalies': [],
        'goals': [],
        'halftime_length': None,
        'length': None,
        'penalties': [],
        'pk': match.pk,
        'place': '1',
        'referee': None,
        'referee_team': team_ref.pk,
        'score_one': 0,
        'score_two': 0,
        'shots': [],
        'start': None,
        'team_one': team_one.pk,
        'team_two': team_two.pk,
        'tournament': tournament.pk,
        'with_shootout': False,
    }

    response = client.get(reverse('api:get_match', kwargs={'pk': match.pk}))
    assert response.status_code == 200
    assert response.json() == expected_response

    with django_assert_num_queries(9):
        response = client.get(reverse('api:get_matchs'))
    assert response.status_code == 200
    assert len(response.json()) == 2
    assert response.json()[0] == expected_response
