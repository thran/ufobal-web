from datetime import datetime

import pytest
from django.core.exceptions import ValidationError

from ufobalapp.admin import merge
from ufobalapp.models import Player, Team, TeamOnTournament, Tournament


def make_tournament(name='Test', year=2021):
    return Tournament.objects.create(
        category=Tournament.BRNO,
        date=datetime(year=year, month=1, day=1),
        name=name,
        location='Zamilec',
        field_count=3,
    )


def make_player(nickname):
    return Player.objects.create(nickname=nickname)


@pytest.fixture()
def tournament():
    yield make_tournament()


class FakeModelAdmin:
    """Just enough of a ModelAdmin for the action to report back to."""

    def __init__(self):
        self.messages = []

    def message_user(self, request, message, level=None):
        self.messages.append(message)


@pytest.mark.django_db
def test_merge_players_repoints_registrations(tournament):
    survivor = make_player('Pepa')
    duplicate = make_player('Pepa duplicate')

    registration = TeamOnTournament.objects.create(
        team=Team.objects.create(name='The team'), tournament=tournament, captain=duplicate
    )
    registration.players.add(duplicate)

    survivor.merge_duplicates([duplicate])

    registration.refresh_from_db()
    assert registration.captain == survivor
    assert list(registration.players.all()) == [survivor]
    assert not Player.objects.filter(pk=duplicate.pk).exists()


@pytest.mark.django_db
def test_merge_teams_moves_registrations_to_the_survivor():
    survivor = Team.objects.create(name='Team A')
    duplicate = Team.objects.create(name='Team A again')
    registration = TeamOnTournament.objects.create(team=duplicate, tournament=make_tournament())

    survivor.merge_duplicates([duplicate])

    registration.refresh_from_db()
    assert registration.team == survivor
    assert not Team.objects.filter(pk=duplicate.pk).exists()


@pytest.mark.django_db
def test_merge_teams_refuses_when_they_played_the_same_tournament(tournament):
    survivor = Team.objects.create(name='Team A')
    rival = Team.objects.create(name='Team B')
    TeamOnTournament.objects.create(team=survivor, tournament=tournament)
    TeamOnTournament.objects.create(team=rival, tournament=tournament)

    with pytest.raises(ValidationError, match='Nelze sloučit týmy'):
        survivor.merge_duplicates([rival])

    assert Team.objects.count() == 2
    assert TeamOnTournament.objects.count() == 2


@pytest.mark.django_db
def test_merge_teams_refuses_when_two_duplicates_played_each_other(tournament):
    survivor = Team.objects.create(name='Team A')
    first = Team.objects.create(name='Team B')
    second = Team.objects.create(name='Team C')
    TeamOnTournament.objects.create(team=first, tournament=tournament)
    TeamOnTournament.objects.create(team=second, tournament=tournament)

    with pytest.raises(ValidationError):
        survivor.merge_duplicates([first, second])

    assert Team.objects.count() == 3


@pytest.mark.django_db
def test_merge_teams_allows_registrations_on_different_tournaments(tournament):
    survivor = Team.objects.create(name='Team A')
    duplicate = Team.objects.create(name='Team A again')

    TeamOnTournament.objects.create(team=survivor, tournament=tournament)
    TeamOnTournament.objects.create(team=duplicate, tournament=make_tournament('Other', year=2022))

    survivor.merge_duplicates([duplicate])

    assert survivor.tournaments.count() == 2
    assert Team.objects.count() == 1


@pytest.mark.django_db
def test_merge_several_duplicates_at_once():
    survivor = Team.objects.create(name='Team A')
    duplicates = [Team.objects.create(name=f'dup {i}') for i in range(3)]
    for i, duplicate in enumerate(duplicates):
        TeamOnTournament.objects.create(team=duplicate, tournament=make_tournament(f'T{i}', year=2020 + i))

    survivor.merge_duplicates(duplicates)

    assert Team.objects.count() == 1
    assert survivor.tournaments.count() == 3


@pytest.mark.django_db
def test_merge_action_keeps_the_lowest_id_whatever_the_sorting():
    oldest = Team.objects.create(name='Oldest')
    newest = Team.objects.create(name='Newest')
    TeamOnTournament.objects.create(team=oldest, tournament=make_tournament('First'))
    TeamOnTournament.objects.create(team=newest, tournament=make_tournament('Second', year=2022))

    # a changelist sorted newest-first must not change which team survives
    merge(FakeModelAdmin(), None, Team.objects.order_by('-id'))

    assert list(Team.objects.all()) == [oldest]
    assert oldest.tournaments.count() == 2


@pytest.mark.django_db
def test_merge_action_reports_the_refusal_instead_of_crashing(tournament):
    survivor = Team.objects.create(name='Team A')
    rival = Team.objects.create(name='Team B')
    TeamOnTournament.objects.create(team=survivor, tournament=tournament)
    TeamOnTournament.objects.create(team=rival, tournament=tournament)
    modeladmin = FakeModelAdmin()

    merge(modeladmin, None, Team.objects.all())

    assert modeladmin.messages == ['Nelze sloučit týmy, které spolu byly na turnaji: Test 2021-01-01']
    assert Team.objects.count() == 2


@pytest.mark.django_db
def test_merge_action_warns_on_a_single_selection():
    Team.objects.create(name='Alone')
    modeladmin = FakeModelAdmin()

    merge(modeladmin, None, Team.objects.all())

    assert modeladmin.messages == ['Vyberte alespoň dva objekty ke sloučení']
    assert Team.objects.count() == 1
