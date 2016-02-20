# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0017_auto_20160220_1520'),
    ]

    operations = [
        migrations.AddField(
            model_name='shot',
            name='team',
            field=models.ForeignKey(verbose_name='tým', related_name='shots', null=True, to='ufobalapp.TeamOnTournament'),
        ),
    ]
