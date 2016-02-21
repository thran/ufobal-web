#!/usr/bin/python
# -*- coding: UTF-8 -*-

import datetime

from django.db import models
from django.utils import timezone


class Player(models.Model):
    class Meta:
        verbose_name = "hráč"
        verbose_name_plural = "hráči"

    MAN = 'man'
    WOMAN = 'woman'
    GENDERS = (
        (MAN, 'muž'),
        (WOMAN, 'žena'),
    )

    name = models.CharField('Jméno', max_length=50, null=True, blank=True)
    lastname = models.CharField('Příjmení', max_length=50, null=True, blank=True)
    nickname = models.CharField('Přezdívka', max_length=50)
    birthdate = models.DateField('Datum narození', null=True, blank=True)
    gender = models.CharField(max_length=10, verbose_name='pohlaví', choices=GENDERS, null=True, blank=True)

    def to_json(self, tournaments=True, simple=False, staff=False, **kwargs):
        data = {
            "pk": self.pk,
            "name": self.name,
            "lastname": self.lastname,
            "nickname": self.nickname,
            "age": self.age(),
            "full_name": self.full_name(),
            "gender": self.gender,
        }

        if staff:
            data["birthdate"] = self.birthdate

        if tournaments and not simple:
            data["tournaments"] = [t.to_json(players=False) for t in self.tournaments.all()]

        return data

    def age(self):
        if self.birthdate:
            on = datetime.date.today()
            when = self.birthdate
            was_earlier = (on.month, on.day) < (when.month, when.day)
            return on.year - when.year - was_earlier
        else:
            return None

    age.short_description = "Věk"

    def goal_count(self, match=None):
        if not match:
            return self.goals.count()
        else:
            return Goal.objects.filter(match=match, shooter=self).count()

    goal_count.short_description = 'Gólů celkem'

    def assistance_count(self, match=None):
        if not match:
            return self.assistances.count()
        else:
            return Goal.objects.filter(match=match, assistance=self).count()

    def point_sum(self):
        return self.assistances.count() + self.goals.count()

    assistance_count.short_description = 'Asistencí celkem'

    def full_name(self):
        name_parts = []
        if self.name:
            name_parts.append(self.name)
        if self.lastname:
            name_parts.append(self.lastname)

        if len(name_parts) == 0:
            return self.nickname
        return "{} - {}".format(self.nickname, " ".join(name_parts))

    def __str__(self):
        return "%s" % (self.nickname)


class Team(models.Model):
    class Meta:
        verbose_name = "tým"
        verbose_name_plural = "týmy"

    name = models.CharField('Jméno', max_length=100)
    description = models.TextField('Popis', null=True, blank=True)

    def to_json(self, **kwargs):
        return {
            "pk": self.pk,
            "name": self.name,
            "description": self.description,
        }

    def __str__(self):
        return "%s" % self.name


class TeamOnTournamentManager(models.Manager):
    def get_queryset(self):
        return super(TeamOnTournamentManager, self).get_queryset().select_related('team', 'tournament')


class TeamOnTournament(models.Model):
    class Meta:
        verbose_name = "tým na turnaji"
        verbose_name_plural = "týmy na turnaji"

    team = models.ForeignKey(Team, verbose_name='Tým', related_name='tournaments')
    captain = models.ForeignKey(Player, verbose_name='Kapitán', related_name='captain', null=True, blank=True)
    default_goalie = models.ForeignKey(Player, verbose_name='Nasazovaný brankář', related_name='default_goalie', null=True, blank=True)
    name = models.CharField('Speciální jméno na turnaji?', max_length=100, null=True, blank=True)
    tournament = models.ForeignKey('Tournament', verbose_name='Turnaj', related_name='teams')
    players = models.ManyToManyField(Player, verbose_name='Hráči', related_name='tournaments', blank=True)
    rank = models.IntegerField('Pořadí', null=True, blank=True)

    objects = TeamOnTournamentManager()

    def to_json(self, players=True, simple=False, **kwargs):
        data = {
            "pk": self.pk,
            "team": self.team.to_json(),
            "captain": self.captain.pk if self.captain else None,
            "default_goalie": self.default_goalie.pk if self.default_goalie else None,
            "name": self.get_name(),
            "name_pure": self.name if self.name else self.team.name,
            "tournament": self.tournament.to_json(teams=False),
            "rank": self.rank,
        }

        if players:
            if simple:
                data["player_pks"] = [p.pk for p in self.players.all()]
            else:
                data["players"] = [p.to_json(tournaments=False) for p in self.players.all()]

        return data

    def __str__(self):
        if not self.name:
            return "{} - {} {}".format(self.team.name, self.tournament.name, self.tournament.date.year)
        else:
            return "{} ({}) - {} {}".format(self.name, self.team.name, self.tournament.name, self.tournament.date.year)

    def get_name(self):
        if self.name:
            return "{} ({})".format(self.name, self.team.name)
        else:
            return self.team.name


class Tournament(models.Model):
    class Meta:
        verbose_name = "turnaj"
        verbose_name_plural = "turnaje"

    date = models.DateField('Datum')
    registration_to = models.DateField('Přihlašování do', null=True, blank=True)
    halftime_length = models.IntegerField('Délka poločasu', default=8)
    name = models.CharField('Název/místo', max_length=50)

    def to_json(self, teams=True, **kwargs):
        data = {
            "pk": self.pk,
            "name": self.name,
            "full_name": self.name + " " + str(self.date.year),
            "date": str(self.date) if self.date else None,
            "registration_to": str(self.registration_to),
            "registration_open": self.is_registration_open(),
            "halftime_length": self.halftime_length,
            "year": self.date.year,
        }

        if teams:
            data["teams"] = [t.to_json(players=False) for t in self.teams.all()]

        return data

    def is_registration_open(self):
        return self.registration_to is not None and self.registration_to >= datetime.date.today()

    def __str__(self):
        return "%s %s" % (self.name, self.date.year)


class Match(models.Model):
    class Meta:
        verbose_name = "zápas"
        verbose_name_plural = "zápasy"

    tournament = models.ForeignKey(Tournament, verbose_name='Turnaj')
    team_one = models.ForeignKey(TeamOnTournament, verbose_name='Tým 1', related_name='+', null=True, blank=True)
    team_two = models.ForeignKey(TeamOnTournament, verbose_name='Tým 2', related_name='+', null=True, blank=True)
    start = models.DateTimeField('Začátek zápasu', null=True, blank=True)
    end = models.DateTimeField('Konec zápasu', null=True, blank=True)
    halftime_length = models.TimeField('Délka poločasu', null=True, blank=True)
    length = models.TimeField('Délka zápasu', null=True, blank=True)
    goalies = models.ManyToManyField(Player, verbose_name='brankaři', through='GoalieInMatch')
    referee = models.ForeignKey(Player, related_name='refereed', verbose_name='rozhodčí', null=True, blank=True)
    # TODO hodnoceni od tymu....

    fake = models.BooleanField('Importovaný zápas', default=False)

    def to_json(self, events=True, **kwargs):
        data = {
            "pk": self.pk,
            "tournament": self.tournament_id,
            "team_one": self.team_one_id,
            "team_two": self.team_two_id,
            "start": str(self.start) if self.start else None,
            "end": str(self.end) if self.end else None,
            "halftime_length": self.halftime_length,
            "length": self.length,
            "referee": self.referee_id,
            "fake": self.fake,
        }

        if events:
            data["goals"] = [goal.to_json() for goal in self.goals.all()]
            data["shots"] = [shot.to_json() for shot in self.shots.all()]
            data["penalties"] = [penalty.to_json() for penalty in self.penalties.all()]
            data["goalies"] = [goalie.to_json() for goalie in self.goalies_in_match.all()]

        return data

    def score_one(self):
        if self.team_one:
            goals = Goal.objects.filter(shooter__in=self.team_one.players.all(), match=self)
            return goals.count()

    score_one.short_description = 'tým 1 scóre'

    def score_two(self):
        if self.team_two:
            goals = Goal.objects.filter(shooter__in=self.team_two.players.all(), match=self)
            return goals.count()

    score_two.short_description = 'tým 2 scóre'

    # TODO def result

    def __str__(self):
        if not self.team_one and not self.team_two:
            return "%s %s %s" % (self.tournament.name, self.tournament.date, 'fake')
        return "%s vs. %s, %s %s" % (self.team_one.get_name(), self.team_two.get_name(),
                                     self.tournament.name, self.tournament.date)


class GoalieInMatch(models.Model):
    class Meta:
        verbose_name = "brankář"
        verbose_name_plural = "brankáři"

    goalie = models.ForeignKey(Player, verbose_name='brankář')
    match = models.ForeignKey(Match, verbose_name='zápas', related_name="goalies_in_match")
    start = models.TimeField('Začátek chytání')
    end = models.TimeField('Konec chytání', null=True, blank=True)

    def to_json(self):
        return {
            "goalie": self.goalie_id,
            "match": self.match_id,
            "start": str(self.start),
            "end": str(self.end) if self.end else None,
        }


class Goal(models.Model):
    class Meta:
        verbose_name = "gól"
        verbose_name_plural = "góly"

    NORMAL = 'normal'
    PENALTY = 'penalty'
    # TODO: z rohu? o zem?
    GOAL_TYPES = (
        (NORMAL, 'běžný'),
        (PENALTY, 'penálta'),
    )

    shooter = models.ForeignKey(Player, related_name='goals', verbose_name='střelec', null=True)
    assistance = models.ForeignKey(Player, related_name='assistances', verbose_name='asistent', null=True, blank=True)
    match = models.ForeignKey(Match, verbose_name='zápas', related_name='goals')
    time = models.TimeField('Čas v zápase', null=True, blank=True)
    type = models.CharField(max_length=20,
                            verbose_name='druh', choices=GOAL_TYPES, default=NORMAL)

    def to_json(self):
        data = {
            "shooter": self.shooter_id,
            "assistance": self.assistance_id,
            "match": self.match_id,
            "time": str(self.time) if self.time is not None else None,
            "type": self.type,
        }
        return  data

    def __str__(self):
        if self.match.fake:
            return "goal import"
        else:
            if (self.shooter and  self.shooter in self.match.team_one.players.all()) or \
                    (self.assistance and self.assistance in self.match.team_one.players.all()):
                teams = "{0} ---> {1}"

            elif (self.shooter and  self.shooter in self.match.team_two.players.all()) or \
                    (self.assistance and self.assistance in self.match.team_two.players.all()):
                teams = "{1} ---> {0}"

            return (teams + ": {2} ({3})").format(self.match.team_one.get_name(), self.match.team_two.get_name(),
                                                  self.shooter.nickname if self.shooter else "-",
                                                  self.assistance.nickname if self.assistance else "-")


class Shot(models.Model):
    class Meta:
        verbose_name = "střela"
        verbose_name_plural = "střely"

    shooter = models.ForeignKey(Player, related_name='shots', verbose_name='střelec', blank=True, null=True)
    team = models.ForeignKey(TeamOnTournament, related_name='shots', verbose_name='tým', null=True)
    match = models.ForeignKey(Match, verbose_name='zápas', related_name='shots')
    time = models.TimeField('Čas v zápase')

    def to_json(self):
        return {
            "time": str(self.time),
            "match": self.match_id,
            "shooter": self.shooter_id,
            "team": self.team_id,
        }


class Penalty(models.Model):
    class Meta:
        verbose_name = "trest"
        verbose_name_plural = "tresty"

    RED = 'red'
    YELLOW = 'yellow'
    CARDS = (
        (RED, 'červená'),
        (YELLOW, 'žlutá'),
    )

    card = models.CharField(max_length=10,
                            verbose_name='karta', choices=CARDS)
    match = models.ForeignKey(Match, verbose_name='zápas', related_name='penalties')
    time = models.TimeField('čas')
    player = models.ForeignKey(Player, verbose_name='hráč')
    reason = models.TextField('Důvod')

    def to_json(self):
        return {
            "card": self.card,
            "time": str(self.time),
            "match": self.match_id,
            "player": self.player_id,
            "reason": self.reason,
        }
