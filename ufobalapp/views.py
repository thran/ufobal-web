#!/usr/bin/python
# -*- coding: UTF-8 -*-
import json
from django.contrib.auth.decorators import user_passes_test

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from managestats.views import is_staff_check
from ufobalapp.models import Player

import datetime
import logging
logger = logging.getLogger(__name__)


def index(request):

    return render(request, 'ufobalapp/index.html', {})


def get_json_one(request, model_class, pk):
    obj = get_object_or_404(model_class, pk=pk)
    return JsonResponse(obj.to_json())


def get_json_all(request, model_class):
    objs = model_class.objects.all()
    return JsonResponse([obj.to_json(simple=True, staff=request.user.is_staff) for obj in objs], safe=False)


@require_http_methods(["POST"])
@user_passes_test(is_staff_check)
def save_player(request):
    data = json.loads(str(request.body.decode('utf-8')))
    player = get_object_or_404(Player, pk=data["pk"])

    for field in ["nickname", "lastname", "name", "gender", "birthdate"]:
        setattr(player, field, data[field])

        # TODO better birthdate validation
        if field == 'birthdate':
            try:
                birthdate = datetime.datetime.strptime(data[field], "%d.%m.%Y").date()
            except (ValueError, TypeError):
                player.birthdate = None

    player.save()
    return HttpResponse("OK")
