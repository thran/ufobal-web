# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0013_tournament_registration_to'),
    ]

    operations = [
        migrations.AddField(
            model_name='teamontournament',
            name='default_goalie',
            field=models.ForeignKey(related_name='default_goalie', to='ufobalapp.Player', blank=True, null=True, verbose_name='Nasazovaný brankář', on_delete=models.CASCADE),
        ),
    ]
