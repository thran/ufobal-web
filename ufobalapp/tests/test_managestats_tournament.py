from datetime import datetime, time

import pytest
from django.contrib.auth.models import User
from django.urls import reverse

from ufobalapp.models import Goal, Match, Player, Team, TeamOnTournament, Tournament


@pytest.mark.django_db
def test_tournament_page_lists_scoring_players_missing_from_rosters(client):
    client.force_login(User.objects.create(username='staff', is_staff=True))
    tournament = Tournament.objects.create(
        category=Tournament.BRNO, date=datetime(2023, 6, 10), name='T', location='L', field_count=1
    )
    team_a = TeamOnTournament.objects.create(team=Team.objects.create(name='A'), tournament=tournament)
    team_b = TeamOnTournament.objects.create(team=Team.objects.create(name='B'), tournament=tournament)
    rostered = Player.objects.create(nickname='Rostered')
    team_a.players.add(rostered)
    stranger_shooter = Player.objects.create(nickname='Stranger shooter')
    stranger_assistant = Player.objects.create(nickname='Stranger assistant')
    Player.objects.create(nickname='Bystander')
    match = Match.objects.create(tournament=tournament, team_one=team_a, team_two=team_b, length=time(0, 20))
    Goal.objects.create(match=match, shooter=stranger_shooter, assistance=rostered, time=time(0, 5))
    Goal.objects.create(match=match, shooter=rostered, assistance=stranger_assistant, time=time(0, 6))
    Goal.objects.create(match=match, shooter=rostered, time=time(0, 7))

    response = client.get(reverse('managestats:tournament', args=[tournament.pk]))

    assert response.status_code == 200
    assert [p.nickname for p in response.context['unknowns']] == ['Stranger assistant', 'Stranger shooter']
