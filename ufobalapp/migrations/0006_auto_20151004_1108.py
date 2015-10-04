# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0005_auto_20151004_1106'),
    ]

    operations = [
        migrations.AlterField(
            model_name='teamontournament',
            name='name',
            field=models.CharField(verbose_name='Speciální jméno na turnaji?', blank=True, null=True, max_length=100),
        ),
    ]
