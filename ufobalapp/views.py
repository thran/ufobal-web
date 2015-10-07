#!/usr/bin/python
# -*- coding: UTF-8 -*-

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse


def index(request):

    return render(request, 'ufobalapp/index.html', {})


def get_json_one(request, model_class, pk):
    obj = get_object_or_404(model_class, pk=pk)
    return JsonResponse(obj.to_json())


def get_json_all(request, model_class):
    objs = model_class.objects.all()
    return JsonResponse([obj.to_json(simple=True, staff=request.user.is_staff) for obj in objs], safe=False)
