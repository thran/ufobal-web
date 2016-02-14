# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0012_auto_20160207_2004'),
    ]

    operations = [
        migrations.AddField(
            model_name='tournament',
            name='registration_to',
            field=models.DateField(null=True, verbose_name='Přihlašování do', blank=True),
        ),
    ]
