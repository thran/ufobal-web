# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0007_rename_tournament'),
    ]

    operations = [
        migrations.AlterField(
            model_name='match',
            name='start',
            field=models.DateTimeField(blank=True, verbose_name='Začátek zápasu', null=True),
        ),
        migrations.AlterField(
            model_name='teamontournament',
            name='players',
            field=models.ManyToManyField(verbose_name='Hráči', to='ufobalapp.Player', related_name='tournaments'),
        ),
    ]
