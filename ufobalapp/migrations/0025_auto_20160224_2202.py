# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import ufobalapp.models


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0024_merge'),
    ]

    operations = [
        migrations.AlterField(
            model_name='player',
            name='pairing_token',
            field=models.CharField(blank=True, null=True, max_length=10, verbose_name='Párovací token', default=ufobalapp.models.generate_pair),
        ),
    ]
