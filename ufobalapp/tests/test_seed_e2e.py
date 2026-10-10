import json

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection

from ufobalapp.models import Goal, GoalieInMatch, Match, Player, Tournament


@pytest.mark.django_db
def test_seed_creates_data_and_writes_ids(tmp_path):
    out = tmp_path / 'seed.json'
    call_command('seed_e2e', out=str(out))
    ids = json.loads(out.read_text())
    t = Tournament.objects.get(pk=ids['tournament'])
    assert t.name == 'E2E turnaj'
    rec = Match.objects.get(pk=ids['recordMatch'])
    assert rec.start is None and GoalieInMatch.objects.filter(match=rec).count() == 2
    assert Goal.objects.filter(match_id=ids['viewMatch'], shooter__nickname='Beta').count() == 1
    assert Player.objects.get(nickname='E2E').user.username == 'e2e'
    assert set(ids['players']) >= {'Alfa', 'Beta', 'Gama', 'Delta'}


@pytest.mark.django_db
def test_seed_refuses_non_sqlite(tmp_path, monkeypatch):
    monkeypatch.setattr(connection, 'vendor', 'mysql')
    with pytest.raises(CommandError, match='sqlite'):
        call_command('seed_e2e', out=str(tmp_path / 's.json'))


@pytest.mark.django_db
def test_seed_refuses_second_run(tmp_path):
    call_command('seed_e2e', out=str(tmp_path / 'a.json'))
    with pytest.raises(CommandError, match='already seeded'):
        call_command('seed_e2e', out=str(tmp_path / 'b.json'))
    assert Tournament.objects.filter(name='E2E turnaj').count() == 1
