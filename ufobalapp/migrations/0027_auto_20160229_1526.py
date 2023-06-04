# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0026_log'),
    ]

    operations = [
        migrations.AlterField(
            model_name='log',
            name='user',
            field=models.ForeignKey(related_name='logs', to=settings.AUTH_USER_MODEL, verbose_name='uživatel', on_delete=models.PROTECT),
        ),
    ]
