#!/usr/bin/python
# -*- coding: UTF-8 -*-

from django.shortcuts import render, get_object_or_404, get_list_or_404
from django.http import HttpResponseRedirect, HttpResponse
from django.core.urlresolvers import reverse
from django.utils import timezone

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


def add_player(request):
    if request.method == 'GET':
        return render(request, 'ufobalapp/addPlayer.html')
    elif request.method == 'POST':
        name = request.POST.get('name', 'jonas')
        player = Player(name=name, lastname=name, nickname=name,
                        birthdate=timezone.now(), team_id=1)
        player.save()
        return HttpResponseRedirect(reverse('player_detail', args=(player.id,)))