# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0009_auto_20151124_2204'),
    ]

    operations = [
        migrations.AlterField(
            model_name='goal',
            name='shooter',
            field=models.ForeignKey(related_name='goals', verbose_name='střelec', to='ufobalapp.Player', null=True, on_delete=models.PROTECT),
        ),
        migrations.AlterField(
            model_name='teamontournament',
            name='players',
            field=models.ManyToManyField(related_name='tournaments', blank=True, verbose_name='Hráči', to='ufobalapp.Player'),
        ),
    ]
