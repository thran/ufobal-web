#!/usr/bin/python
# -*- coding: UTF-8 -*-
#python3

from django.core.management.base import BaseCommand, CommandError
# from django.templatetags.static import static
import csv
import json
import os

class Command(BaseCommand):
    help = 'ziskava ufobalove staty z csv'

    def add_arguments(self, parser):
        parser.add_argument('statsfile', nargs=1, type=str, help='ufobalove staty v xml')

  # Jméno Team 9.5.2004 8.5.2005 30.4.2006 27.5.2007 17.5.2008 23.5.2009 22.5.2010 28.5.2011 3.6.2012 2.6.2013 1.6.2014 30.5.2015 Součet

    def handle(self, *args, **options):
        #TODO static soubory nejak zpristupnit - static files are not good way
        out = {}
        out['players'] = []
        for filename in options['statsfile']:
            #TODO static udelat spravne - this is OK
            with open(os.path.join('data_source', filename), 'r', encoding='cp1250') as statfile:
                #self.stdout.write(statfile.readline())
                firstline = True
                reader = csv.reader(statfile, delimiter=';')
                for row in reader:
                    if firstline:
                        firstline = False
                        dates = row[2:]
                        out['dates'] = dates
                        continue
                    player = {}
                    player['name'],player['team'] = row[:2]
                    for i, score in enumerate(row[2:]):
                        player[dates[i]] = score

                    out['players'].append(player)
                try:
                    out['dates'].remove('gender')
                except:
                    pass

            with open(os.path.join('data_source', filename).replace('csv', 'json'), 'w') as outfile:
                json.dump(out, outfile)

