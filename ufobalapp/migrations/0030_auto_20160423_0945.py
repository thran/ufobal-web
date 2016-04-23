# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0029_auto_20160422_2250'),
    ]

    operations = [
        migrations.AddField(
            model_name='teamontournament',
            name='contact_mail',
            field=models.EmailField(blank=True, null=True, max_length=254, verbose_name='Kontaktní email'),
        ),
        migrations.AddField(
            model_name='teamontournament',
            name='contact_phone',
            field=models.CharField(blank=True, null=True, max_length=20, verbose_name='Kontaktní telefon'),
        ),
        migrations.AddField(
            model_name='teamontournament',
            name='strength',
            field=models.IntegerField(blank=True, null=True, verbose_name='Odhad síly'),
        ),
    ]
