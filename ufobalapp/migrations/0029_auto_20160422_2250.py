# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0028_pairingrequest'),
    ]

    operations = [
        migrations.AddField(
            model_name='pairingrequest',
            name='text',
            field=models.TextField(null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='pairingrequest',
            name='state',
            field=models.CharField(max_length=15, choices=[('approved', 'schváleno'), ('denied', 'odmítnuto'), ('pending', 'rozhoduje se')], default='pending', verbose_name='stav'),
        ),
    ]
