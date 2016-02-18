# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0014_teamontournament_default_goalie'),
    ]

    operations = [
        migrations.AddField(
            model_name='match',
            name='halftime_length',
            field=models.TimeField(verbose_name='Délka poločasu', blank=True, null=True),
        ),
        migrations.AddField(
            model_name='match',
            name='length',
            field=models.TimeField(verbose_name='Délka zápasu', blank=True, null=True),
        ),
    ]
