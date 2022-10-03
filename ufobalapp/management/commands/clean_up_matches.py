import datetime

from django.core.management import BaseCommand
from django.db.models import Q

from ufobalapp.models import Match


class Command(BaseCommand):
    help = 'delete invalid matches'

    def add_arguments(self, parser):
        parser.add_argument('--dry', dest='dry', action='store_const', default=False, const=True)

    def handle(self, dry, **kwargs):
        for match in Match.objects.filter(Q(start__isnull=True) | Q(end__isnull=True), fake=False):
            self.stdout.write('Match {match.pk}: {match}'.format(match=match))
            if match.start is None and match.end is None:
                if match.goals.all().count() == 0:
                    self.stdout.write(self.style.SUCCESS('    - no start nor end - deleting'))
                    if not dry:
                        match.delete()
                else:
                    self.stdout.write(self.style.WARNING('    - no start nor end but has goals - solve ot manually'))
                continue

            if match.end is None:
                if match.goals.all().count() == 0 and match.halftime_length is None:
                    self.stdout.write(self.style.SUCCESS('    - no end, no goals, no halftime - deleting'))
                    if not dry:
                        match.delete()
                else:
                    self.stdout.write(self.style.WARNING('     - no end, but gas some data - solve ot manually'))
                continue

            self.stdout.write(self.style.SUCCESS('    - no start - estimating start'))
            match.start = match.end - datetime.timedelta(minutes=match.length.minute, seconds=match.length.second)
            if not dry:
                match.save()

