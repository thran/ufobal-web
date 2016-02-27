from django.core.management import BaseCommand
from ufobalapp.models import Shot, Goal


class Command(BaseCommand):
    help = 'delete duplicates'

    def handle(self, *args, **options):
        for shot in Shot.objects.all():
            if Shot.objects.filter(match=shot.match, time=shot.time, team=shot.team).count() > 1:
                print(Shot.objects.filter(match=shot.match, time=shot.time, team=shot.team).values_list("pk"))
                shot.delete()

        for goal in Goal.objects.filter(match__fake=False):
            if Goal.objects.filter(match=goal.match, time=goal.time, shooter=goal.shooter, assistance=goal.assistance).count() > 1:
                print(Goal.objects.filter(match=goal.match, time=goal.time, shooter=goal.shooter, assistance=goal.assistance))
                goal.delete()

