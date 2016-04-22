# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('ufobalapp', '0027_auto_20160229_1526'),
    ]

    operations = [
        migrations.CreateModel(
            name='PairingRequest',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, verbose_name='ID', serialize=False)),
                ('state', models.CharField(choices=[('approved', 'schváleno'), ('denied', 'odmítnuto'), ('pending', 'rozhoduje se')], max_length=15, verbose_name='stav')),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('player', models.ForeignKey(verbose_name='Hráč', to='ufobalapp.Player', related_name='pairing_request')),
                ('user', models.ForeignKey(verbose_name='Uživatel', to=settings.AUTH_USER_MODEL, related_name='pairing_request')),
            ],
            options={
                'verbose_name': 'žádost o spárování',
                'verbose_name_plural': 'žádosti o spárování',
            },
        ),
    ]
