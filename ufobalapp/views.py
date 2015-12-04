#!/usr/bin/python
# -*- coding: UTF-8 -*-
import json
from django.contrib.auth.decorators import user_passes_test

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse, HttpResponseNotAllowed
from django.shortcuts import render_to_response
from django.views.decorators.http import require_http_methods
from managestats.views import is_staff_check
from ufobal import settings
from ufobalapp.models import Player, Tournament, Team, TeamOnTournament
import datetime
import logging
logger = logging.getLogger(__name__)


def get_json_one(request, model_class, pk):
    obj = get_object_or_404(model_class, pk=pk)
    return JsonResponse(obj.to_json())


def get_json_all(request, model_class):
    objs = model_class.objects.all()
    if model_class == Tournament:
        objs = objs.prefetch_related("teams")

    return JsonResponse([obj.to_json(simple=True, staff=request.user.is_staff) for obj in objs], safe=False)


@require_http_methods(["POST"])
@user_passes_test(is_staff_check)
def save_player(request):
    data = json.loads(str(request.body.decode('utf-8')))
    player = get_object_or_404(Player, pk=data["pk"])

    for field in ["nickname", "lastname", "name", "gender", "birthdate"]:
        # TODO better birthdate validation
        if field == 'birthdate':
            try:
                if "birthdate" in data:
                    data[field] = datetime.datetime.strptime(data[field][:10], "%Y-%m-%d").date()
                else:
                    continue
            except (ValueError, TypeError):
                data[field] = None

        setattr(player, field, data[field])

    player.save()
    return HttpResponse("OK")


def remove_attendance(request, player, team):
    if request.method != "DELETE":
        return HttpResponseNotAllowed(["DELETE"])

    player = get_object_or_404(Player, pk=player)
    team = get_object_or_404(TeamOnTournament, pk=team)
    player.tournaments.remove(team)

    return HttpResponse("OK")


def add_attendance(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    data = json.loads(str(request.body.decode('utf-8')))

    player = get_object_or_404(Player, pk=data["player"])
    team = get_object_or_404(TeamOnTournament, pk=data["team"])
    player.tournaments.add(team)

    return HttpResponse("OK")


def home(request):
    return render(request, "index.html", {
        "GOOGLE_ANALYTICS": settings.ON_SERVER and not settings.DEBUG,
    })