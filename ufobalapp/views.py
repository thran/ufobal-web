#!/usr/bin/python
# -*- coding: UTF-8 -*-

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse


def index(request):

    return render(request, 'ufobalapp/index.html', {})


def get_json(request, model_class, pk):
    obj = get_object_or_404(model_class, pk=pk)
    return JsonResponse(obj.to_json())
