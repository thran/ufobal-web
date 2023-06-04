# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0011_team_tournament_ranking'),
    ]

    operations = [
        migrations.RenameField(
            model_name='match',
            old_name='goalie',
            new_name='goalies',
        ),
        migrations.AlterField(
            model_name='goalieinmatch',
            name='match',
            field=models.ForeignKey(to='ufobalapp.Match', verbose_name='zápas', on_delete=models.CASCADE),
        ),
    ]
