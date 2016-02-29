# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('ufobalapp', '0025_auto_20160224_2202'),
    ]

    operations = [
        migrations.CreateModel(
            name='Log',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, auto_created=True, verbose_name='ID')),
                ('url', models.TextField(verbose_name='url')),
                ('data', models.TextField(verbose_name='data')),
                ('timestamp', models.DateTimeField(verbose_name='timestamp', auto_now_add=True)),
                ('user', models.ForeignKey(verbose_name='uživatel', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'logy',
                'verbose_name': 'log',
            },
        ),
    ]
