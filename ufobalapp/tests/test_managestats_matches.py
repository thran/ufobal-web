from datetime import date

import pytest
from django.contrib.auth.models import User
from django.db import connection
from django.test.utils import CaptureQueriesContext

from ufobalapp.models import Match, Team, TeamOnTournament, Tournament


@pytest.fixture
def tournament():
    return Tournament.objects.create(name='Brno', date=date(2023, 5, 27), category=Tournament.BRNO)


@pytest.fixture
def teams(tournament):
    return [
        TeamOnTournament.objects.create(team=Team.objects.create(name=name), tournament=tournament)
        for name in ('Alpha', 'Bravo', 'Charlie', 'Delta')
    ]


@pytest.fixture
def staff_client(client):
    client.force_login(User.objects.create_user('staff', password='x', is_staff=True))
    return client


@pytest.mark.django_db
def test_tournament_page_does_not_list_matches(staff_client, tournament, teams):
    Match.objects.create(tournament=tournament, team_one=teams[0], team_two=teams[1])

    response = staff_client.get(f'/managestats/tournament/{tournament.pk}/')

    assert response.status_code == 200
    assert 'matches' not in response.context
    assert f'/managestats/tournament/{tournament.pk}/matches/' in response.content.decode()


@pytest.mark.django_db
def test_matches_page_lists_matches_with_constant_query_count(
    staff_client, tournament, teams, django_assert_max_num_queries
):
    url = f'/managestats/tournament/{tournament.pk}/matches/'
    Match.objects.create(tournament=tournament, team_one=teams[0], team_two=teams[1])
    staff_client.get(url)  # warm up content types / permissions
    with CaptureQueriesContext(connection) as one_match:
        staff_client.get(url)

    for i in range(6):
        Match.objects.create(tournament=tournament, team_one=teams[i % 4], team_two=teams[(i + 1) % 4])
    with django_assert_max_num_queries(len(one_match)):
        response = staff_client.get(url)

    assert response.status_code == 200
    assert len(response.context['matches']) == 7
    assert 'Alpha' in response.content.decode()


@pytest.mark.django_db
def test_matches_page_requires_staff(client, tournament):
    client.force_login(User.objects.create_user('plain', password='x'))

    response = client.get(f'/managestats/tournament/{tournament.pk}/matches/')

    assert response.status_code == 302
