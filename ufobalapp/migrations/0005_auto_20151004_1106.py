# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0004_delete_names_ToT'),
    ]

    operations = [
        migrations.AlterField(
            model_name='goal',
            name='shooter',
            field=models.ForeignKey(null=True, verbose_name='střelec', related_name='goals', to='ufobalapp.Player'),
        ),
        migrations.AlterField(
            model_name='teamontournament',
            name='name',
            field=models.CharField(verbose_name='Speciální jméno na turnaji?', max_length=100),
        ),
    ]
