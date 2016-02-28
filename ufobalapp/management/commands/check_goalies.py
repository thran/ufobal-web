from django.core.management import BaseCommand
from ufobalapp.models import Tournament


class Command(BaseCommand):
    help = 'delete duplicates'

    def add_arguments(self, parser):
        parser.add_argument('tournament_pk', type=int)

    def handle(self, *args, **options):
        tournament = Tournament.objects.get(pk=options["tournament_pk"])
        for match in tournament.match_set.all().prefetch_related("goalies_in_match__goalie"):
            print(match)
            for goalie in match.goalies_in_match.all():
                print("   ", goalie.goalie.nickname, goalie.start, goalie.end)
            print()
