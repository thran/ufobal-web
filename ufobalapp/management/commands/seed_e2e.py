import datetime
import json

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.utils import timezone

from ufobalapp.models import Goal, GoalieInMatch, Match, Player, Team, TeamOnTournament, Tournament


class Command(BaseCommand):
    help = 'Seed a fresh sqlite database with data for frontend e2e tests and write created ids to a JSON file.'

    def add_arguments(self, parser):
        parser.add_argument('--out', required=True, help='Path of the JSON file with created ids')

    def handle(self, *args, **options):
        if connection.vendor != 'sqlite':
            raise CommandError('seed_e2e runs only on sqlite (set DATABASE_URL=sqlite:///...)')

        if User.objects.filter(username='e2e').exists() or Tournament.objects.filter(name='E2E turnaj').exists():
            raise CommandError('Database already seeded — use a fresh sqlite file.')

        with transaction.atomic():
            ids = self._seed()
        with open(options['out'], 'w', encoding='utf-8') as f:
            json.dump(ids, f, ensure_ascii=False)

    def _seed(self):
        today = datetime.date.today()
        now = timezone.now()
        tournament = Tournament.objects.create(
            name='E2E turnaj',
            category=Tournament.BRNO,
            date=today,
            registration_to=today,
            location='Hala',
            field_count=1,
            description='e2e',
            halftime_length=8,
        )

        players = {n: Player.objects.create(nickname=n) for n in ('Alfa', 'Beta', 'Gama', 'Delta')}

        def make_team(name, goalie, captain):
            tot = TeamOnTournament.objects.create(
                team=Team.objects.create(name=name),
                tournament=tournament,
                default_goalie=players[goalie],
                captain=players[captain],
            )
            tot.players.add(players[goalie], players[captain])
            return tot

        draci = make_team('Draci', 'Alfa', 'Beta')
        sovy = make_team('Sovy', 'Gama', 'Delta')

        def make_match(**kwargs):
            match = Match.objects.create(tournament=tournament, team_one=draci, team_two=sovy, **kwargs)
            for goalie in ('Alfa', 'Gama'):
                GoalieInMatch.objects.create(match=match, goalie=players[goalie], start=datetime.time(0, 0))
            return match

        record_match = make_match(referee_team=None)
        view_match = make_match(
            start=now - datetime.timedelta(minutes=30),
            end=now - datetime.timedelta(minutes=10),
            length=datetime.time(0, 16),
            halftime_length=datetime.time(0, 8),
        )
        Goal.objects.create(match=view_match, shooter=players['Beta'], assistance=None, time=datetime.time(0, 3))

        user = User.objects.create_user('e2e', password='e2e', is_staff=False)
        Player.objects.create(nickname='E2E', user=user)

        return {
            'tournament': tournament.pk,
            'recordMatch': record_match.pk,
            'viewMatch': view_match.pk,
            'user': {'username': 'e2e', 'password': 'e2e'},
            'players': {n: p.pk for n, p in players.items()},
        }
