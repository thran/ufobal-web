from datetime import date

import pytest
from django.contrib.auth.models import User

from ufobalapp.models import Match, Player, Team, TeamOnTournament, Tournament


@pytest.fixture
def paired_player():
    user = User.objects.create_user('victim', email='victim@example.com', password='secret')
    return Player.objects.create(name='a', lastname='b', nickname='n', user=user)


@pytest.mark.django_db
@pytest.mark.parametrize(
    'query',
    [
        'user__email__startswith=victim',
        'user__password__startswith=pbkdf2',
        'nickname=n',
        'pk=1',
    ],
)
def test_players_list_rejects_filters(client, paired_player, query):
    response = client.get(f'/api_frontend/players?{query}')
    assert response.status_code == 400


@pytest.mark.django_db
@pytest.mark.parametrize('model', ['tournaments', 'teamontournaments'])
def test_other_lists_reject_filters(client, model):
    assert client.get(f'/api_frontend/{model}?name=x').status_code == 400


@pytest.mark.django_db
def test_players_list_without_filters_still_works(client, paired_player):
    response = client.get('/api_frontend/players')
    assert response.status_code == 200
    assert len(response.json()) == 1


@pytest.mark.django_db
def test_html_param_is_not_a_filter(client, paired_player):
    assert client.get('/api_frontend/players?html=1').status_code == 200


def _match(tournament, name):
    one = TeamOnTournament.objects.create(team=Team.objects.create(name=f'{name}1'), tournament=tournament)
    two = TeamOnTournament.objects.create(team=Team.objects.create(name=f'{name}2'), tournament=tournament)
    return Match.objects.create(tournament=tournament, team_one=one, team_two=two, referee_team=one)


@pytest.mark.django_db
def test_matches_can_be_filtered_by_tournament(client):
    first = Tournament.objects.create(name='A', date=date(2026, 1, 1))
    second = Tournament.objects.create(name='B', date=date(2026, 2, 1))
    match = _match(first, 'a')
    _match(second, 'b')

    response = client.get(f'/api_frontend/matchs?tournament={first.pk}')

    assert response.status_code == 200
    assert [m['pk'] for m in response.json()] == [match.pk]


@pytest.mark.django_db
@pytest.mark.parametrize('query', ['tournament=abc', 'tournament__name__startswith=A', 'referee__user__email=x'])
def test_matches_reject_other_filters(client, query):
    assert client.get(f'/api_frontend/matchs?{query}').status_code == 400
