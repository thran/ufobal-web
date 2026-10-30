import json

import pytest
from django.contrib.auth.models import User
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
    google = User.objects.get(username=ids['accounts']['google']['username'])
    assert not google.has_usable_password() and google.social_auth.filter(provider='google-oauth2').exists()
    assert User.objects.get(username='e2e-change').check_password(ids['accounts']['change']['password'])
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
