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

    def age(self):
        if self.birthdate:
            on = datetime.date.today()
            when = self.birthdate
            was_earlier = (on.month, on.day) < (when.month, when.day)
            return on.year - when.year - was_earlier
        else:
            return None

    age.short_description = "Věk"

    def goal_count(self):
        return self.goals.count()

    goal_count.short_description = 'Gólů celkem'

    def assistance_count(self):
        return self.assistances.count()

    def point_sum(self):
        return self.assistances.count() + self.goals.count()

    assistance_count.short_description = 'Asistencí celkem'

    def __str__(self):
        return "%s" % (self.nickname)


class Team(models.Model):
    class Meta:
        verbose_name = "tým"
        verbose_name_plural = "týmy"

    name = models.CharField('Jméno', max_length=100)
    description = models.TextField('Popis', null=True, blank=True)

    def __str__(self):
        return "%s" % (self.name)


class TeamOnTournamentManager(models.Manager):
    def get_queryset(self):
        return super(TeamOnTournamentManager, self).get_queryset().select_related('team', 'tournament')


class TeamOnTournament(models.Model):
    class Meta:
        verbose_name = "tým na turnaji"
        verbose_name_plural = "týmy na turnaji"

    team = models.ForeignKey(Team, verbose_name='Tým', related_name='tournaments')
    captain = models.ForeignKey(Player, verbose_name='Kapitán', related_name='captain', null=True, blank=True)
    name = models.CharField('Jméno na turnaji', max_length=100)
    tournament = models.ForeignKey('Tournament', verbose_name='Turnaj', related_name='teams')
    players = models.ManyToManyField(Player, verbose_name='Hráči', related_name='teams')

    objects = TeamOnTournamentManager()

    def save(self, *args, **kwargs):  # TODO jen pri vytvoreni, pouzit signaly
        """current name of the team at the time of tournament"""
        if not self.name:
            self.name = self.team.name
        super(TeamOnTournament, self).save(*args, **kwargs)

    def __str__(self):
        if self.name == self.team.name:
            return "{} - {} {}".format(self.name, self.tournament.name, self.tournament.date.year)
        else:
            return "{} ({}) - {} {}".format(self.name, self.team.name, self.tournament.name, self.tournament.date.year)


class Tournament(models.Model):
    class Meta:
        verbose_name = "turnaj"
        verbose_name_plural = "turnaje"

    date = models.DateField('Datum')
    name = models.CharField('Název/místo', max_length=50)

    def __str__(self):
        return "%s %s" % (self.name, self.date.year)


class Match(models.Model):
    class Meta:
        verbose_name = "zápas"
        verbose_name_plural = "zápasy"

    tournament = models.ForeignKey(Tournament, verbose_name='Turnaj')
    team_one = models.ForeignKey(TeamOnTournament, verbose_name='Tým 1', related_name='+', null=True, blank=True)
    team_two = models.ForeignKey(TeamOnTournament, verbose_name='Tým 2', related_name='+', null=True, blank=True)
    start = models.DateTimeField('Začátek zápasu', default=timezone.now, null=True, blank=True)
    end = models.DateTimeField('Konec zápasu', null=True, blank=True)
    goalie = models.ManyToManyField(Player, verbose_name='brankaři', through='GoalieInMatch')
    referee = models.ForeignKey(Player, related_name='refereed', verbose_name='rozhodčí', null=True, blank=True)
    # TODO hodnoceni od tymu....

    fake = models.BooleanField('Importovaný zápas', default=False)

    def score_one(self):
        if self.team_one:
            goals = Goal.objects.filter(shooter__in=self.team_one.players.all(),
                                        match=self)
            return goals.count()

    score_one.short_description = 'tým 1 scóre'

    def score_two(self):
        if self.team_two:
            goals = Goal.objects.filter(shooter__in=self.team_two.players.all(),
                                        match=self)
            return goals.count()

    score_two.short_description = 'tým 2 scóre'

    # TODO def result

    def __str__(self):
        if not self.team_one and not self.team_two:
            return "%s %s %s" % (self.tournament.name, self.tournament.date, 'fake')
        return "%s vs. %s, %s %s" % (self.team_one.name, self.team_two.name,
                                     self.tournament.name, self.tournament.date)


class GoalieInMatch(models.Model):
    class Meta:
        verbose_name = "brankář"
        verbose_name_plural = "brankáři"

    goalie = models.ForeignKey(Player, verbose_name='brankář')
    match = models.ForeignKey(Match, verbose_name='zápas', related_name='goalies')
    start = models.TimeField('Začátek chytání')
    end = models.TimeField('Konec chytání', null=True, blank=True)


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

    shooter = models.ForeignKey(Player, related_name='goals', verbose_name='střelec')
    assistance = models.ForeignKey(Player, related_name='assistances', verbose_name='asistent', null=True, blank=True)
    match = models.ForeignKey(Match, verbose_name='zápas', related_name='goals')
    time = models.TimeField('Čas v zápase', null=True, blank=True)
    type = models.CharField(max_length=20,
                            verbose_name='druh', choices=GOAL_TYPES, default=NORMAL)

    def __str__(self):
        if self.match.fake:
            return "goal import"
        else:
            if self.shooter in self.match.team_one.players.all():
                teams = "{0} ---> {1}"
            elif self.shooter in self.match.team_two.players.all():
                teams = "{1} ---> {0}"
            else:
                return "!!! střelec {} gólu není v žádném z týmů".format(self.shooter.nickname)
            return (teams + ": {2} ({3})").format(self.match.team_one.name, self.match.team_two.name,
                                                  self.shooter.nickname,
                                                  self.assistance.nickname if self.assistance else "-")


class Shot(models.Model):
    class Meta:
        verbose_name = "střela"
        verbose_name_plural = "střely"

    shooter = models.ForeignKey(Player, related_name='shots', verbose_name='střelec')
    match = models.ForeignKey(Match, verbose_name='zápas', related_name='shots')
    time = models.TimeField('Čas v zápase')


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
