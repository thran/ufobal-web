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
        'players': players
    })
