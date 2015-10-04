# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


def delete_names(apps, schema_editor):
    TeamOnTournament = apps.get_model("ufobalapp", "TeamOnTournament")
    for team in TeamOnTournament.objects.all():
        team.name = None
        team.save()


class Migration(migrations.Migration):

    dependencies = [
        ('ufobalapp', '0003_rename_tournament'),
    ]

    operations = [
        migrations.RunPython(delete_names),
    ]
