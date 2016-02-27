#!/usr/bin/python
# -*- coding: UTF-8 -*-
#python3
from collections import defaultdict

from django.core.management.base import BaseCommand, CommandError
# from django.templatetags.static import static
import csv
import json
import os

from ufobalapp.models import Tournament


class Command(BaseCommand):
    help = 'stats of all maches'

    def handle(self, *args, **options):
        results = defaultdict(lambda: {
            "wins": 0,
            "looses": 0,
            "draws": 0,
            "points": 0,
        })
        tournament = Tournament.objects.all().order_by("-date")[0]
        for match in tournament.match_set.filter(end__isnull=False):
            if match.score_one() == match.score_two():
                results[match.team_one]["draws"] += 1
                results[match.team_one]["points"] += 1
                results[match.team_two]["draws"] += 1
                results[match.team_two]["points"] += 1
            elif match.score_one() > match.score_two():
                results[match.team_one]["wins"] += 1
                results[match.team_one]["points"] += 3
                results[match.team_two]["looses"] += 1
            else:
                results[match.team_two]["wins"] += 1
                results[match.team_two]["points"] += 3
                results[match.team_one]["looses"] += 1

        for team, res in results.items():
            print("{points} {0}: wins:{wins}, looses:{looses}, draws:{draws}".format(team, **res))


