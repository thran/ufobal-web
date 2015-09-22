#!/usr/bin/python
# -*- coding: UTF-8 -*-

import datetime, sys

from django.db import models
from django.utils import timezone

#test
'''
class Question(models.Model):
    question_text = models.CharField(max_length=200)
    pub_date = models.DateTimeField('date published')

    def __str__(self):
        return self.question_text

    def was_published_recently(self):
        return self.pub_date >= timezone.now() - datetime.timedelta(days=1)
    was_published_recently.admin_order_field = 'pub_date'
    was_published_recently.boolean = True
    was_published_recently.short_description = 'Published recently?'


class Choice(models.Model):
    question = models.ForeignKey(Question)
    choice_text = models.CharField(max_length=200)
    votes = models.IntegerField(default=0)

    def __str__(self):
        return self.choice_text
'''


#ufobal
class Player(models.Model):
    class Meta:
        verbose_name_plural = "hráč"
        verbose_name_plural = "hráči"

    name = models.CharField('Jméno', max_length=50)
    lastname = models.CharField('Příjmení', max_length=50)
    nickname = models.CharField('Přezdívka', max_length=50, null=True, blank=True)
    birthdate = models.DateField('Datum narození')
    team = models.ForeignKey('Team', verbose_name='aktuální tým')

    def age(self):
        on = datetime.date.today()
        when = self.birthdate
        was_earlier = (on.month, on.day) < (when.month, when.day)
        return on.year - when.year - (was_earlier)
    age.short_description = "Věk"

    def __unicode__(self):
        return "%s %s %s" %(self.name, self.lastname, self.nickname)

class Team(models.Model):
    class Meta:
        verbose_name_plural = "tým"
        verbose_name_plural = "týmy"

    name = models.CharField('Jméno', max_length=100)
    description = models.TextField(null=True, blank=True) #povoleni pro db a pak pro formular

    def __unicode__(self):
        return self.name

class TeamOnTournament(models.Model):
    class Meta:
        verbose_name_plural = "tým na turnaji"
        verbose_name_plural = "týmy na turnaji"

    team = models.ForeignKey(Team)
    name = models.CharField('Jméno', max_length=100,
                            editable=False) #zapamatovat si jmeno tymu v tomto turnaji
    tournament = models.ForeignKey('Tournament', verbose_name='Turnaj')
    players = models.ManyToManyField(Player, verbose_name='Hráči')

    def save(self, *args, **kwargs):
        '''current name of the team at the time of tournament'''
        self.name = self.team.name
        super(TeamOnTournament, self).save(*args, **kwargs)

    def __unicode__(self):
        return "%s %s %s" %(self.team.name, self.tournament.name, self.tournament.date)


class Tournament(models.Model):
    class Meta:
        verbose_name_plural = "turnaj"
        verbose_name_plural = "turnaje"

    date = models.DateField('Datum')
    name = models.CharField('Název/místo', max_length=50)
    teams = models.ManyToManyField(Team, through='TeamOnTournament')

    def __unicode__(self):
        return "%s %s" %(self.name, self.date)

class Match(models.Model):
    class Meta:
        verbose_name_plural = "zápas"
        verbose_name_plural = "zápasy"

    tournament = models.ForeignKey(Tournament)
    team_one =  models.ForeignKey(Team, related_name='+') #hmmm
    team_two =  models.ForeignKey(Team, related_name='+') #class TeamInMatch(models.Model():
    start = models.DateTimeField('Začátek zápasu', default=timezone.now)
    end = models.DateTimeField('Konec zápasu', null=True, blank=True)
    goalie = models.ManyToManyField(Player, through='GoalieInMatch')

    #def score_one
    #def score_two
    #def result

    def __unicode__(self):
        return "%s vs. %s, %s %s" %(self.team_one.name, self.team_two.name,
                                    self.tournament.name, self.tournament.date)

class GoalieInMatch(models.Model):
    class Meta:
        verbose_name_plural = "brankář"
        verbose_name_plural = "brankáři"
    goalie = models.ForeignKey(Player, verbose_name='brankář')
    match = models.ForeignKey(Match, verbose_name='zápas', related_name='goalies')
    start = models.DateTimeField('Začátek chytání', default=timezone.now)
    end = models.DateTimeField('Konec chytání', null=True, blank=True)

class Goal(models.Model):
    class Meta:
        verbose_name_plural = "gól"
        verbose_name_plural = "góly"

    goal = models.ForeignKey(Player, related_name='goals', verbose_name='střelec')
    assistence = models.ForeignKey(Player, related_name='assistances', verbose_name='asistent')
    match = models.ForeignKey(Match, verbose_name='zápas', related_name='goals')
    datetime = models.DateTimeField('Čas', default=timezone.now)

    def __unicode__(self):
        return "%s vs %s, %s" %(self.match.team_one.name,
                                self.match.team_two.name, self.goal.name)


#TODO class shot - jak souvisi strela s golem, zvlast/dohromady?

CARDS = (
    ('red', 'červená'),
    ('yellow', 'žlutá'),
)

class Penalty(models.Model):
    class Meta:
        verbose_name_plural = "trest"
        verbose_name_plural = "tresty"

    card = models.CharField(max_length=10,
                            verbose_name='karta',choices=CARDS)
    match = models.ForeignKey(Match, verbose_name='zápas', related_name='penalties')
    time = models.DateTimeField('čas')