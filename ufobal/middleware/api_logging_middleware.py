#!/usr/bin/python
# -*- coding: UTF-8 -*-
import json
from ufobalapp.models import Log


class ApiLoggingMiddleware(object):
    def process_request(self, request):
        if request.user.is_authenticated():
            if request.method == 'POST' or request.method == 'DELETE':
                log = Log(user=request.user, url=request.path, data=request.body)
                log.save()
        # process_request vraci None, aby se pokracovalo dal
        return None
