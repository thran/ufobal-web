# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0010_auto_20151129_2249'),
    ]

    operations = [
        migrations.AddField(
            model_name='teamontournament',
            name='rank',
            field=models.IntegerField(verbose_name='Pořadí', blank=True, null=True),
        ),
    ]
