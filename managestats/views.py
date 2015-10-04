#!/usr/bin/python
# -*- coding: UTF-8 -*-

from django.shortcuts import render, get_object_or_404, get_list_or_404, redirect
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import HttpResponse
from django.views.decorators.http import require_http_methods
from django.contrib import messages

from django.db.models import Q

from ufobalapp.models import Player, Tournament, Team, TeamOnTournament, Match, Goal

import datetime

def is_staff_check(user):
    return user.is_staff


@user_passes_test(is_staff_check)
def index(request):
    return render(request, 'index.html')


@user_passes_test(is_staff_check)
def players(request):
    player_list = Player.objects.order_by('nickname').all()

    context = {'players': player_list}
    return render(request, 'players.html', context)


@user_passes_test(is_staff_check)
def players_edit(request):
    if request.POST:
        id = request.POST.get("id")
        player = get_object_or_404(Player.objects, id=id)
        player.nickname = request.POST.get("nickname")
        player.name = request.POST.get("name")
        player.lastname = request.POST.get("lastname")
        birthdate = request.POST.get("birthdate")
        if birthdate:
            try:
                birthdate = datetime.datetime.strptime(birthdate, "%d.%m.%Y").date()
                player.birthdate = birthdate
            except ValueError:
                messages.warning("Špatně zadaný tvar data. Použijte formát D.M.Y")
        player.gender = request.POST.get("gender")
        player.save()


    player_list = Player.objects.order_by('nickname').all()

    context = {'players': player_list}
    return render(request, 'players_edit.html', context)


@user_passes_test(is_staff_check)
def tournaments(request):
    tournament_list = Tournament.objects.order_by('-date').all()

    context = {'tournaments': tournament_list}
    return render(request, 'tournaments.html', context)


@user_passes_test(is_staff_check)
def tournament(request, tournament_id):
    tournament = get_object_or_404(Tournament.objects, id=tournament_id)
    teams = TeamOnTournament.objects.order_by('name', 'team__name').filter(tournament=tournament)
    match_list = Match.objects.filter(tournament=tournament)

    knowns = Player.objects.filter(tournaments__tournament=tournament)
    unknowns = Player.objects.order_by('nickname').filter(
        Q(goals__match__tournament=tournament) | Q(assistances__match__tournament=tournament)
    ).distinct().exclude(id__in=knowns)

    context = {'tournament': tournament,
               'matches': match_list,
               'teams': teams,
               'unknowns': unknowns}
    return render(request, 'tournament.html', context)


@user_passes_test(is_staff_check)
@require_http_methods(["POST"])
def match_add(request, tournament_id):
    tournament = get_object_or_404(Tournament.objects, id=tournament_id)
    team_one_id = request.POST.get("team_one")
    team_one = get_object_or_404(TeamOnTournament.objects, id=team_one_id)
    team_two_id = request.POST.get("team_two")
    team_two = get_object_or_404(TeamOnTournament.objects, id=team_two_id)

    if team_one.tournament != tournament or team_two.tournament != tournament:
        messages.warning(request, 'Nemůžete vytvořit zápas s týmem co nehraje na turnaji')
        return redirect("managestats:tournament", tournament_id=tournament_id)
    if team_one == team_two:
        messages.warning(request, 'Nemůžete vytvořit zápas se dvěma stejnými týmy')
        return redirect("managestats:tournament", tournament_id=tournament_id)

    match = Match(tournament=tournament, team_one=team_one, team_two=team_two)
    match.save()

    messages.success(request, 'Zápas přidán: {}'.format(match))
    return redirect("managestats:tournament", tournament_id=tournament_id)


@user_passes_test(is_staff_check)
def match(request, match_id):
    match = get_object_or_404(Match.objects, id=match_id)

    context = {'match': match, }
    return render(request, 'match.html', context)


@user_passes_test(is_staff_check)
@require_http_methods(["POST"])
def goal_add(request, match_id):
    match = get_object_or_404(Match.objects, id=match_id)
    shooter_id = request.POST.get("shooter")
    shooter = get_object_or_404(Player.objects, id=shooter_id) if shooter_id else None
    assistance_id = request.POST.get("assistance")
    assistance = get_object_or_404(Player.objects, id=assistance_id) if assistance_id else None

    if not shooter and not assistance:
        messages.warning(request, 'Nemůžete vytvořit gól bez střelce ani asistence')
        return redirect("managestats:match", match_id=match_id)

    elif (shooter and (shooter not in match.team_one.players.all() and shooter not in match.team_two.players.all())) or \
            (assistance and (
                            assistance not in match.team_one.players.all() and assistance not in match.team_two.players.all())):
        messages.warning(request, 'Střelec nebo asistent nejsou z ani jednoho hrajících týmů')
        return redirect("managestats:match", match_id=match_id)

    elif shooter and assistance and \
            (shooter in match.team_one.players.all() and assistance in match.team_two.players.all()) or \
            (shooter in match.team_two.players.all() and assistance in match.team_one.players.all()):
        messages.warning(request, 'Střelec a asistent musí být ze stejného týmu')
        return redirect("managestats:match", match_id=match_id)

    goal = Goal(shooter=shooter, assistance=assistance, match=match)
    goal.save()

    messages.success(request, 'Gól přidán: {}'.format(goal))
    return redirect("managestats:match", match_id=match_id)


@user_passes_test(is_staff_check)
def teams(request):
    teams_list = Team.objects.order_by('name')

    context = {'teams': teams_list}
    return render(request, 'teams.html', context)
