# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Goal',
            fields=[
                ('id', models.AutoField(auto_created=True, serialize=False, primary_key=True, verbose_name='ID')),
                ('time', models.TimeField(verbose_name='Čas v zápase', null=True, blank=True)),
                ('type', models.CharField(verbose_name='druh', choices=[('normal', 'běžný'), ('penalty', 'penálta')], max_length=20, default='normal')),
            ],
            options={
                'verbose_name': 'gól',
                'verbose_name_plural': 'góly',
            },
        ),
        migrations.CreateModel(
            name='GoalieInMatch',
            fields=[
                ('id', models.AutoField(auto_created=True, serialize=False, primary_key=True, verbose_name='ID')),
                ('start', models.TimeField(verbose_name='Začátek chytání')),
                ('end', models.TimeField(verbose_name='Konec chytání', null=True, blank=True)),
            ],
            options={
                'verbose_name': 'brankář',
                'verbose_name_plural': 'brankáři',
            },
        ),
        migrations.CreateModel(
            name='Match',
            fields=[
                ('id', models.AutoField(auto_created=True, serialize=False, primary_key=True, verbose_name='ID')),
                ('start', models.DateTimeField(verbose_name='Začátek zápasu', null=True, blank=True, default=django.utils.timezone.now)),
                ('end', models.DateTimeField(verbose_name='Konec zápasu', null=True, blank=True)),
                ('fake', models.BooleanField(verbose_name='Importovaný zápas', default=False)),
            ],
            options={
                'verbose_name': 'zápas',
                'verbose_name_plural': 'zápasy',
            },
        ),
        migrations.CreateModel(
            name='Penalty',
            fields=[
                ('id', models.AutoField(auto_created=True, serialize=False, primary_key=True, verbose_name='ID')),
                ('card', models.CharField(verbose_name='karta', choices=[('red', 'červená'), ('yellow', 'žlutá')], max_length=10)),
                ('time', models.TimeField(verbose_name='čas')),
                ('reason', models.TextField(verbose_name='Důvod')),
                ('match', models.ForeignKey(verbose_name='zápas', related_name='penalties', to='ufobalapp.Match')),
            ],
            options={
                'verbose_name': 'trest',
                'verbose_name_plural': 'tresty',
            },
        ),
        migrations.CreateModel(
            name='Player',
            fields=[
                ('id', models.AutoField(auto_created=True, serialize=False, primary_key=True, verbose_name='ID')),
                ('name', models.CharField(verbose_name='Jméno', null=True, max_length=50, blank=True)),
                ('lastname', models.CharField(verbose_name='Příjmení', null=True, max_length=50, blank=True)),
                ('nickname', models.CharField(verbose_name='Přezdívka', max_length=50)),
                ('birthdate', models.DateField(verbose_name='Datum narození', null=True, blank=True)),
                ('gender', models.CharField(verbose_name='pohlaví', null=True, max_length=10, blank=True, choices=[('man', 'muž'), ('woman', 'žena')])),
            ],
            options={
                'verbose_name': 'hráč',
                'verbose_name_plural': 'hráči',
            },
        ),
        migrations.CreateModel(
            name='Shot',
            fields=[
                ('id', models.AutoField(auto_created=True, serialize=False, primary_key=True, verbose_name='ID')),
                ('time', models.TimeField(verbose_name='Čas v zápase')),
                ('match', models.ForeignKey(verbose_name='zápas', related_name='shots', to='ufobalapp.Match')),
                ('shooter', models.ForeignKey(verbose_name='střelec', related_name='shots', to='ufobalapp.Player')),
            ],
            options={
                'verbose_name': 'střela',
                'verbose_name_plural': 'střely',
            },
        ),
        migrations.CreateModel(
            name='Team',
            fields=[
                ('id', models.AutoField(auto_created=True, serialize=False, primary_key=True, verbose_name='ID')),
                ('name', models.CharField(verbose_name='Jméno', max_length=100)),
                ('description', models.TextField(verbose_name='Popis', null=True, blank=True)),
            ],
            options={
                'verbose_name': 'tým',
                'verbose_name_plural': 'týmy',
            },
        ),
        migrations.CreateModel(
            name='TeamOnTournament',
            fields=[
                ('id', models.AutoField(auto_created=True, serialize=False, primary_key=True, verbose_name='ID')),
                ('name', models.CharField(verbose_name='Jméno na turnaji', max_length=100)),
                ('captain', models.ForeignKey(to='ufobalapp.Player', verbose_name='Kapitán', null=True, blank=True, related_name='captain')),
                ('players', models.ManyToManyField(verbose_name='Hráči', related_name='teams', to='ufobalapp.Player')),
                ('team', models.ForeignKey(verbose_name='Tým', related_name='tournaments', to='ufobalapp.Team')),
            ],
            options={
                'verbose_name': 'tým na turnaji',
                'verbose_name_plural': 'týmy na turnaji',
            },
        ),
        migrations.CreateModel(
            name='Tournament',
            fields=[
                ('id', models.AutoField(auto_created=True, serialize=False, primary_key=True, verbose_name='ID')),
                ('date', models.DateField(verbose_name='Datum')),
                ('name', models.CharField(verbose_name='Název/místo', max_length=50)),
            ],
            options={
                'verbose_name': 'turnaj',
                'verbose_name_plural': 'turnaje',
            },
        ),
        migrations.AddField(
            model_name='teamontournament',
            name='tournament',
            field=models.ForeignKey(verbose_name='Turnaj', related_name='teams', to='ufobalapp.Tournament'),
        ),
        migrations.AddField(
            model_name='penalty',
            name='player',
            field=models.ForeignKey(verbose_name='hráč', to='ufobalapp.Player'),
        ),
        migrations.AddField(
            model_name='match',
            name='goalie',
            field=models.ManyToManyField(verbose_name='brankaři', through='ufobalapp.GoalieInMatch', to='ufobalapp.Player'),
        ),
        migrations.AddField(
            model_name='match',
            name='referee',
            field=models.ForeignKey(to='ufobalapp.Player', verbose_name='rozhodčí', null=True, blank=True, related_name='refereed'),
        ),
        migrations.AddField(
            model_name='match',
            name='team_one',
            field=models.ForeignKey(to='ufobalapp.Team', verbose_name='Tým 1', null=True, blank=True, related_name='+'),
        ),
        migrations.AddField(
            model_name='match',
            name='team_two',
            field=models.ForeignKey(to='ufobalapp.Team', verbose_name='Tým 2', null=True, blank=True, related_name='+'),
        ),
        migrations.AddField(
            model_name='match',
            name='tournament',
            field=models.ForeignKey(verbose_name='Turnaj', to='ufobalapp.Tournament'),
        ),
        migrations.AddField(
            model_name='goalieinmatch',
            name='goalie',
            field=models.ForeignKey(verbose_name='brankář', to='ufobalapp.Player'),
        ),
        migrations.AddField(
            model_name='goalieinmatch',
            name='match',
            field=models.ForeignKey(verbose_name='zápas', related_name='goalies', to='ufobalapp.Match'),
        ),
        migrations.AddField(
            model_name='goal',
            name='assistance',
            field=models.ForeignKey(to='ufobalapp.Player', verbose_name='asistent', null=True, blank=True, related_name='assistances'),
        ),
        migrations.AddField(
            model_name='goal',
            name='match',
            field=models.ForeignKey(verbose_name='zápas', related_name='goals', to='ufobalapp.Match'),
        ),
        migrations.AddField(
            model_name='goal',
            name='shooter',
            field=models.ForeignKey(to='ufobalapp.Player', verbose_name='střelec', null=True, blank=True, related_name='goals'),
        ),
    ]
