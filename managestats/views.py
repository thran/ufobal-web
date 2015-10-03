#!/usr/bin/python
# -*- coding: UTF-8 -*-

from django.shortcuts import render, get_object_or_404, get_list_or_404
from django.db.models import Q

from ufobalapp.models import Player, Tournament, Team, TeamOnTournament, Match


def index(request):
    return render(request, 'index.html')


def players(request):
    player_list = Player.objects.order_by('nickname').all()

    context = {'players': player_list}
    return render(request, 'players.html', context)


def tournaments(request):
    tournament_list = Tournament.objects.order_by('date').all()

    context = {'tournaments': tournament_list}
    return render(request, 'tournaments.html', context)


def tournament(request, tournament_id):
    tournament = get_object_or_404(Tournament.objects, id=tournament_id)
    teams = TeamOnTournament.objects.order_by('name').filter(tournament=tournament)
    match_list = Match.objects.filter(tournament=tournament)

    knowns = Player.objects.filter(teams__tournament=tournament)
    unknowns = Player.objects.order_by('nickname').filter(
        Q(goals__match__tournament=tournament) | Q(assistances__match__tournament=tournament)
    ).distinct().exclude(id__in=knowns)

    context = {'tournament': tournament,
               'matches': match_list,
               'teams': teams,
               'unknowns': unknowns}
    return render(request, 'tournament.html', context)


def match(request, match_id):
    match = get_object_or_404(Match.objects, id=match_id)

    context = {'match': match, }
    return render(request, 'match.html', context)


def teams(request):
    teams_list = Team.objects.order_by('name')

    context = {'teams': teams_list}
    return render(request, 'teams.html', context)
