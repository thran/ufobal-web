# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0015_auto_20160218_1904'),
    ]

    operations = [
        migrations.AddField(
            model_name='tournament',
            name='halftime_length',
            field=models.IntegerField(default=8, verbose_name='Délka poločasu'),
        ),
    ]
