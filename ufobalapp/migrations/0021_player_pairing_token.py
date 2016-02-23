# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0020_match_place'),
    ]

    operations = [
        migrations.AddField(
            model_name='player',
            name='pairing_token',
            field=models.CharField(max_length=10, verbose_name='Párovací token', null=True, blank=True),
        ),
    ]
