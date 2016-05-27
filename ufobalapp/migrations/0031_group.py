# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0030_auto_20160423_0945'),
    ]

    operations = [
        migrations.CreateModel(
            name='Group',
            fields=[
                ('id', models.AutoField(verbose_name='ID', primary_key=True, serialize=False, auto_created=True)),
                ('name', models.CharField(max_length=50)),
                ('level', models.IntegerField(default=1)),
                ('teams', models.ManyToManyField(related_name='groups', to='ufobalapp.TeamOnTournament', verbose_name='týmy')),
                ('tournament', models.ForeignKey(related_name='groups', verbose_name='turnaje', to='ufobalapp.Tournament')),
            ],
            options={
                'verbose_name': 'Skupina',
                'verbose_name_plural': 'Skupiny',
            },
        ),
    ]
