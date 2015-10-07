#!/usr/bin/python
# -*- coding: UTF-8 -*-
# python3

from django.core.management.base import BaseCommand, CommandError
# from django.templatetags.static import static
from ufobalapp.models import Player, Team, Goal, Tournament, Match, TeamOnTournament
import json
import os
import random
from collections import Counter, defaultdict
from datetime import datetime


class Command(BaseCommand):
    help = 'nahrava do databaze ufobalove staty z json ziskaneho prikazem parsestats NEJDRIV BRNO STRELCI, PAK ASISTENCE A PAK NIZKOV to stejny'

    def add_arguments(self, parser):
        parser.add_argument('statsfile', nargs=1, type=str, help='ufobalove staty v json')

    def handle(self, *args, **options):
        shooters = False
        assistence = False
        nizkov = False
        brno = False

        for filename in options['statsfile']:
            if filename.split('-')[1].split('.')[0] == 'strelci':
                shooters = True
            else:
                assistence = True

            if filename == 'nizkov-strelci.json':
                shouldadd = True

            if filename.split('-')[0] == 'brno':
                brno = True
            else:
                nizkov = True

            if shooters and brno:
                # testovaci mazani vseho pokazde
                Player.objects.all().delete()
                Team.objects.all().delete()
                Goal.objects.all().delete()
                Tournament.objects.all().delete()

            with open(os.path.join('data_source', filename), 'r') as statsfile:
                stats = json.load(statsfile)
                name = filename.split('-')[0]
                for datestring in stats['dates']:
                    date = datetime.strptime(datestring, '%d.%m.%Y').date()
                    # created==False znamena ze uz byl driv vytvoren
                    tournament, created = Tournament.objects.get_or_create(name=name, date=date)
                    # fake zapas pro vsechny strely/asistence na turnaji
                    match, created = Match.objects.get_or_create(tournament=tournament, fake=True)

                #abych zjistil jestli je tam jmeno vickrat
                namecounter = {}
                for player in stats['players']:
                    name = player['name'].strip() #za nekteryma jmenama je pro jistotu mezera
                    namecounter.setdefault(name, 0)
                    namecounter[name] += 1

                #abych nasel lidi co maji i shodny tymy - ne napric nekolika souborama ale
                saved = []

                for player in stats['players']:
                    name = player['name'].strip()
                    #jmeno je v souboru vickrat
                    if namecounter[name] > 1:
                        mergedName = name + "-" + player['team']
                        #uz existuje hrac se stejnym jmenem i tymem
                        if mergedName in saved:
                            mergedName = mergedName+"-".join(random.choice('aAbBcCdDeEfFgGhH') for _ in range(5))

                        #vytvoreni/nacteni hrace
                        playerobj, created = Player.objects.get_or_create(nickname=mergedName)
                        saved.append(mergedName)

                    else:
                        playerobj, created = Player.objects.get_or_create(nickname=name)


                    if 'gender' in player:
                        playerobj.gender = player['gender']
                    playerobj.save()

                    # vytvoreni golu/asistenci hrace
                    for info in player:
                        if info not in ['name', 'team', 'gender']:
                            date = datetime.strptime(info, '%d.%m.%Y').date()
                            tournament = Tournament.objects.get(date=date)
                            match = Match.objects.get(tournament=tournament)

                            # pokud ma nejake staty
                            if player[info] and player[info] not in ['-', '?']:
                                shotscount = int(player[info])
                                for i in range(shotscount):
                                    newgoal = Goal(match=match)
                                    if shooters:
                                        newgoal.shooter = playerobj
                                    else:
                                        newgoal.assistance = playerobj
                                    newgoal.save()


                                # vytvoreni a prirazeni tymu ve kterych hrac byl v rocnicich kdy hral
                                teams = player['team'].split(',')
                                #pouze kdyz ma jenom jeden tym a v tom rocniku dal nejakej stat
                                if len(teams) == 1 and shotscount > 0:
                                    teamname = player['team']
                                    teamobj, created = Team.objects.get_or_create(name=teamname)

                                    teamtourobj, created = TeamOnTournament.objects.get_or_create(
                                        team=teamobj, tournament=tournament)
                                    teamtourobj.players.add(playerobj)
                                    teamtourobj.save()
