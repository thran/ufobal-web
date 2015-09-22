#!/usr/bin/python
# -*- coding: UTF-8 -*-

import datetime, sys

from django.db import models
from django.utils import timezone

#test

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



#ufobal

class Player(models.Model):
    class Meta:
        verbose_name_plural = "hráč"
        verbose_name_plural = "hráči"

    name = models.CharField('Jméno', max_length=50)
    lastname = models.CharField('Příjmení', max_length=50)
    nickname = models.CharField('Přezdívka', max_length=50, default=None)
    birthdate = models.DateField('Datum narození')

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