# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0008_auto_20151109_1242'),
    ]

    operations = [
        migrations.AlterField(
            model_name='goal',
            name='shooter',
            field=models.ForeignKey(verbose_name='střelec', blank=True, related_name='goals', null=True, to='ufobalapp.Player'),
        ),
    ]
