# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


def rename_trounamens(apps, schema_editor):
    Tournament = apps.get_model("ufobalapp", "Tournament")
    for tournament in Tournament.objects.all():
        tournament.name = tournament.name.replace("brno", "Brno").replace("nizkov", "Nížkov")
        tournament.save()


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0006_auto_20151004_1108'),
    ]

    operations = [
        migrations.RunPython(rename_trounamens),
    ]
