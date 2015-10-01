#!/usr/bin/python
# -*- coding: UTF-8 -*-

from django.shortcuts import render, get_object_or_404, get_list_or_404
from django.db.models import Q



from ufobalapp.models import Player, Tournament, Team, TeamOnTournament

def index(request):
    return render(request, 'index.html')


def players(request):
    players = Player.objects.order_by('nickname').all()

    context = {'players': players}
    return render(request, 'players.html', context)

def tournaments(request):
    tournaments = Tournament.objects.order_by('date').all()

    context = {'tournaments':tournaments}
    return render(request, 'tournaments.html', context)

def tournament(request, tournament_id):
    tournament = get_object_or_404(Tournament.objects.order_by('date'), id=tournament_id)
    teams = TeamOnTournament.objects.order_by('name').filter(tournament=tournament)

    knowns = Player.objects.filter(teams__tournament = tournament)
    unknowns = Player.objects.order_by('nickname').filter(
        Q(goals__match__tournament=tournament) | Q(assistances__match__tournament=tournament)
    ).distinct().exclude(id__in = knowns)

    context = {'tournament':tournament,
               'teams':teams,
               'unknowns':unknowns}
    return render(request, 'tournament.html', context)

def teams(request):
    teams = Team.objects.order_by('name')

    context = {'teams':teams}
    return render(request, 'teams.html', context)
