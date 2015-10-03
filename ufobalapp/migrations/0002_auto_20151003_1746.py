# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='match',
            name='team_one',
            field=models.ForeignKey(verbose_name='Tým 1', blank=True, to='ufobalapp.TeamOnTournament', related_name='+', null=True),
        ),
        migrations.AlterField(
            model_name='match',
            name='team_two',
            field=models.ForeignKey(verbose_name='Tým 2', blank=True, to='ufobalapp.TeamOnTournament', related_name='+', null=True),
        ),
    ]
