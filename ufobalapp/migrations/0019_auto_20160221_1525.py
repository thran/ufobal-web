# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0018_shot_team'),
    ]

    operations = [
        migrations.AddField(
            model_name='match',
            name='referee_team',
            field=models.ForeignKey(to='ufobalapp.TeamOnTournament', blank=True, null=True, verbose_name='rozhodčí tým', related_name='refereed', on_delete=models.PROTECT),
        ),
        migrations.AlterField(
            model_name='goalieinmatch',
            name='match',
            field=models.ForeignKey(to='ufobalapp.Match', verbose_name='zápas', related_name='goalies_in_match', on_delete=models.CASCADE),
        ),
    ]
