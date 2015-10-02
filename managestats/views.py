#!/usr/bin/python
# -*- coding: UTF-8 -*-

from django.shortcuts import render, get_object_or_404, get_list_or_404
from django.db.models import Q



from ufobalapp.models import Player, Tournament, Team, TeamOnTournament


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
    tournament = get_object_or_404(Tournament.objects.order_by('date'), id=tournament_id)
    teams = TeamOnTournament.objects.order_by('name').filter(tournament=tournament)

    knowns = Player.objects.filter(teams__tournament=tournament)
    unknowns = Player.objects.order_by('nickname').filter(
        Q(goals__match__tournament=tournament) | Q(assistances__match__tournament=tournament)
    ).distinct().exclude(id__in = knowns)

    context = {'tournament': tournament,
               'teams': teams,
               'unknowns': unknowns}
    return render(request, 'tournament.html', context)


def teams(request):
    teams_list = Team.objects.order_by('name')

    context = {'teams': teams_list}
    return render(request, 'teams.html', context)
