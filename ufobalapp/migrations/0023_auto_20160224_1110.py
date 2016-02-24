# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0022_merge'),
    ]

    operations = [
        migrations.AlterField(
            model_name='match',
            name='place',
            field=models.CharField(blank=True, null=True, verbose_name='Hřiště', max_length=50),
        ),
    ]
