#!/usr/bin/python
# -*- coding: UTF-8 -*-

from django.shortcuts import render, get_object_or_404, get_list_or_404

from .models import Player

def index(request):
    players = Player.objects.all()

    return render(request, 'ufobalapp/index.html', {
        'players':players
    })


def player_detail(request, player_id):
    player = get_object_or_404(Player, pk=player_id)

    return render(request, 'ufobalapp/playerDetail.html', {
        'player': player})

