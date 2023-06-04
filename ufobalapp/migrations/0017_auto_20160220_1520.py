# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0016_tournament_halftime_length'),
    ]

    operations = [
        migrations.AlterField(
            model_name='shot',
            name='shooter',
            field=models.ForeignKey(null=True, to='ufobalapp.Player', related_name='shots', blank=True, verbose_name='střelec', on_delete=models.PROTECT),
        ),
    ]
