# -*- coding: utf-8 -*-
# Generated by Django 1.9.7 on 2020-07-17 18:19
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0033_auto_20190907_2249'),
    ]

    operations = [
        migrations.AddField(
            model_name='tournament',
            name='description',
            field=models.TextField(blank=True, null=True, verbose_name='Popis'),
        ),
    ]
