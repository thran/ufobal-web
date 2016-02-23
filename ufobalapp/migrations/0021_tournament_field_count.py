# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0020_match_place'),
    ]

    operations = [
        migrations.AddField(
            model_name='tournament',
            name='field_count',
            field=models.IntegerField(default=2, verbose_name='Počet hřišť'),
        ),
    ]
