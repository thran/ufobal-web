# -*- coding: utf-8 -*-
# Generated by Django 1.9.7 on 2021-03-06 09:37
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0036_tournament_closed_edit'),
    ]

    operations = [
        migrations.CreateModel(
            name='RefereeFeedback',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('feedback', models.JSONField(default=dict)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='ufobalapp.Player')),
                ('author_team', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='ufobalapp.TeamOnTournament')),
                ('match', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='ufobalapp.Match')),
            ],
        ),
        migrations.AlterField(
            model_name='tournament',
            name='category',
            field=models.CharField(choices=[('brno', 'Brno'), ('nizkov', 'Nížkov'), ('hala', 'Hala'), ('other', 'Další'), ('liga', 'Liga'), ('trening', 'Trénink')], max_length=15, null=True, verbose_name='kategorie'),
        ),
    ]
