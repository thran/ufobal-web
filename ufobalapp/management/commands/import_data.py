#!/usr/bin/python
# -*- coding: UTF-8 -*-
#python3

from django.core.management.base import BaseCommand
from django.core.management import call_command

class Command(BaseCommand):
    help = 'import all data'

    def handle(self, *args, **options):
        files = ['brno-strelci', 'brno-asistence', 'nizkov-strelci', 'nizkov-asistence']

        for file in files:
            self.stdout.write('parsing {}'.format(file))
            call_command('parsestats', "{}.csv".format(file))

        for file in files:
            self.stdout.write('loading {}'.format(file))
            call_command('loadstats', "{}.json".format(file))
