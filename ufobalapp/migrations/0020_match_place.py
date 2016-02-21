# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0019_auto_20160221_1525'),
    ]

    operations = [
        migrations.AddField(
            model_name='match',
            name='place',
            field=models.CharField(max_length=50, null=True, blank=True),
        ),
    ]
