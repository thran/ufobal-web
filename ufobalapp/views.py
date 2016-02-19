#!/usr/bin/python
# -*- coding: UTF-8 -*-
import json
from django.contrib.auth.decorators import user_passes_test
from django.db.models import Prefetch, Count, Max, Min
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse, HttpResponseNotAllowed, HttpResponseBadRequest
from django.shortcuts import render_to_response
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from managestats.views import is_staff_check
from django.views.decorators.csrf import csrf_exempt
from ufobal import settings
from ufobalapp.models import Player, Tournament, Team, TeamOnTournament, Goal,\
    Match, Shot, GoalieInMatch, Penalty
import datetime
import logging
logger = logging.getLogger(__name__)


def get_json_one(request, model_class, pk):
    obj = get_object_or_404(model_class, pk=pk)
    if request.GET.get("html", False):
        return render(request, "api.html", {"data": json.dumps(obj.to_json(), indent=4)})
    return JsonResponse(obj.to_json())


def get_json_all(request, model_class):
    objs = model_class.objects.all()
    if model_class == Tournament:
        objs = objs.prefetch_related("teams")
    if model_class == Match:
        objs = objs.filter(fake=False)
    if model_class == TeamOnTournament:
        objs = objs.prefetch_related(Prefetch('players', queryset=Player.objects.all().only('id')))

    data = [obj.to_json(simple=True, staff=request.user.is_staff) for obj in objs]
    if request.GET.get("html", False):
        return render(request, "api.html", {"data": json.dumps(data, indent=4)})
    return JsonResponse(data, safe=False)


def goals(request):
    shooter = Goal.objects.values("shooter", "match__tournament").filter(shooter__isnull=False).annotate(count=Count("pk"))
    assistance = Goal.objects.values("assistance", "match__tournament").filter(assistance__isnull=False).annotate(count=Count("pk"))
    data = {
        "goals": list(shooter),
        "assists": list(assistance),
    }

    if request.GET.get("html", False):
        return render(request, "api.html", {"data": json.dumps(data, indent=4)})
    return JsonResponse(data, safe=False)


def stats(request):
    data = {
        "tournament_count": Tournament.objects.all().count(),
        "max_year": Tournament.objects.aggregate(Max("date"))["date__max"].year,
        "min_year": Tournament.objects.aggregate(Min("date"))["date__min"].year,
        "player_count": Player.objects.all().count(),
        "player_male_count": Player.objects.filter(gender=Player.MAN).count(),
        "player_female_count": Player.objects.filter(gender=Player.WOMAN).count(),
        "team_count": Team.objects.all().count(),
        "team_on_tournament_count": TeamOnTournament.objects.all().count(),
        "goals": Goal.objects.filter(shooter__isnull=False).count(),
        "assists": Goal.objects.filter(assistance__isnull=False).count(),
    }
    return JsonResponse(data, safe=False)


def live_tournament(request):
    return JsonResponse(Tournament.objects.all().order_by("-date")[0].to_json(teams=False), safe=False)


@require_http_methods(["POST"])
def save_player(request):
    data = json.loads(str(request.body.decode('utf-8')))
    player = get_object_or_404(Player, pk=data["pk"])

    for field in ["nickname", "lastname", "name", "gender", "birthdate"]:
        # TODO better birthdate validation
        if field == 'birthdate':
            try:
                if "birthdate" in data:
                    data[field] = datetime.datetime.strptime(data[field][:10], "%Y-%m-%d").date()
                else:
                    continue
            except (ValueError, TypeError):
                data[field] = None
        if field in data:
            setattr(player, field, data[field])

    player.save()
    return HttpResponse("OK")


def remove_attendance(request, player, team):
    if request.method != "DELETE":
        return HttpResponseNotAllowed(["DELETE"])

    player = get_object_or_404(Player, pk=player)
    team = get_object_or_404(TeamOnTournament, pk=team)
    player.tournaments.remove(team)

    return HttpResponse("OK")


@require_http_methods(["POST"])
def add_attendance(request):
    data = json.loads(str(request.body.decode('utf-8')))

    player = get_object_or_404(Player, pk=data["player"])
    team = get_object_or_404(TeamOnTournament, pk=data["team"])
    player.tournaments.add(team)

    return HttpResponse("OK")


@require_http_methods(["POST"])
def set_captain_or_goalie(request, goalie=False):
    data = json.loads(str(request.body.decode('utf-8')))

    player = get_object_or_404(Player, pk=data["player"])
    team = get_object_or_404(TeamOnTournament, pk=data["team"])

    if player not in team.players.all():
        return HttpResponseBadRequest("Hráč se nenachází ve zvoleném týmu.")

    if goalie:
        team.default_goalie = player
    else:
        team.captain = player

    team.save()

    return HttpResponse("OK")


# @csrf_exempt # aby nebyl potreba csrf token (test)
@require_http_methods(["POST"])
def add_team(request):
    data = json.loads(str(request.body.decode('utf-8')))

    name = data.get('name')
    if not name:
        return HttpResponseBadRequest("Chybí jméno týmu")

    team = Team(name=name, description=data.get('description'))
    team.save()

    return HttpResponse(team.pk)


@require_http_methods(["POST"])
def add_team_on_tournament(request):
    data = json.loads(str(request.body.decode('utf-8')))

    team = get_object_or_404(Team, pk=data.get('team'))
    tournament = get_object_or_404(Tournament, pk=data.get('tournament'))
    if not tournament.is_registration_open():
        return HttpResponseBadRequest("Registrace ukončena.")

    tots = TeamOnTournament.objects.filter(team=team, tournament=tournament)
    if len(tots) > 0:
        return HttpResponseBadRequest("Tým je již registrován.")

    tour_team = TeamOnTournament(team=team, tournament=tournament, captain=data.get('captain'),
                                 name=data.get('name'), rank=data.get('rank'))
    tour_team.save()

    return HttpResponse(tour_team.pk)


@require_http_methods(["POST"])
def add_player(request):
    data = json.loads(str(request.body.decode('utf-8')))

    nickname = data.get('nickname')
    if nickname:
        player = Player(name=data.get('name'), lastname=data.get('lastname'), nickname=nickname,
                        birthdate=data.get('birthdate'), gender=data.get('gender'))
        player.save()
        return HttpResponse(player.pk)

    return HttpResponseBadRequest("Chybí přezdívka")


@require_http_methods(["POST"])
def add_goal(request):
    data = json.loads(str(request.body.decode('utf-8')))

    match = get_object_or_404(Match, pk=data.get('match'))
    shooter = get_object_or_404(Player, pk=data.get('shooter'))

    if shooter not in match.team_one.players.all() and shooter not in match.team_two.players.all():
        return HttpResponseBadRequest("Střelec se nenachází ani v jednom z týmů.")

    goal = Goal(shooter=shooter, match=match, time=datetime.datetime.strptime(data.get('time'), "%H:%M:%S"))

    if data.get("type"):
        goal.type = data.get("type")

    assistance = Player.objects.filter(pk=data.get('assistance'))
    if len(assistance) > 0:
        goal.assistance = assistance[0]
    goal.save()

    return HttpResponse(goal.pk)


@require_http_methods(["POST"])
def add_shot(request):
    data = json.loads(str(request.body.decode('utf-8')))

    match = get_object_or_404(Match, pk=data.get('match'))
    shooter = get_object_or_404(Player, pk=data.get('shooter'))

    if shooter not in match.team_one.players.all() and shooter not in match.team_two.players.all():
        return HttpResponseBadRequest("Střelec se nenachází ani v jednom z týmů.")

    shot = Shot(match=match, shooter=shooter, time=datetime.datetime.strptime(data.get('time'), "%H:%M:%S"))
    shot.save()

    return HttpResponse(shot.pk)


@require_http_methods(["POST"])
def add_match(request):
    data = json.loads(str(request.body.decode('utf-8')))

    tournament = get_object_or_404(Tournament, pk=data.get('tournament'))
    team_one = get_object_or_404(TeamOnTournament, pk=data.get('team_one'))
    team_two = get_object_or_404(TeamOnTournament, pk=data.get('team_two'))
    if data.get('referee'):
        referee = get_object_or_404(Player, pk=data.get('referee'))
    else:
        referee = None

    if team_one not in tournament.teams.all():
        return HttpResponseBadRequest("První tým není zaregistrovaný na turnaji.")
    if team_two not in tournament.teams.all():
        return HttpResponseBadRequest("Druhý tým není zaregistrovaný na turnaji.")

    match = Match(tournament=tournament, team_one=team_one, team_two=team_two,
                  referee=referee, start=data.get('start'), end=data.get('end'))
    match.save()

    if data.get('goalie_one'):
        goalie_one = Player.objects.get(pk=data.get('goalie_one'))
        if goalie_one and goalie_one not in team_one.players.all():
            return HttpResponseBadRequest("První brankář se nenachází v prvním týmu.")
        goalie_one_in_match = GoalieInMatch(goalie=goalie_one, match=match, start=datetime.time(0))
        goalie_one_in_match.save()

    if data.get('goalie_two'):
        goalie_two = Player.objects.get(pk=data.get('goalie_two'))
        if goalie_two and goalie_two not in team_two.players.all():
            return HttpResponseBadRequest("Druhý brankář se nenachází ve druhém týmu.")
        goalie_two_in_match = GoalieInMatch(goalie=goalie_two, match=match, start=datetime.time(0))
        goalie_two_in_match.save()

    return HttpResponse(match.pk)


@require_http_methods(["POST"])
def add_penalty(request):
    data = json.loads(str(request.body.decode('utf-8')))

    match = get_object_or_404(Match, pk=data.get('match'))
    player = get_object_or_404(Player, pk=data.get('player'))

    if player not in match.team_one.players.all() and player not in match.team_two.players.all():
        return HttpResponseBadRequest("Hráč se nenachází ani v jednom z týmů.")

    penalty = Penalty(card=data.get('card'), match=match, player=player,
                      reason=data.get('reason'), time=datetime.datetime.strptime(data.get('time'), "%H:%M:%S"))
    penalty.save()

    return HttpResponse(penalty.pk)


@require_http_methods(["POST"])
def edit_goal(request, goal_id):
    data = json.loads(str(request.body.decode('utf-8')))

    goal = get_object_or_404(Match, pk=goal_id)

    if data.get('shooter'):
        shooter = get_object_or_404(Player, data.get('shooter'))
        goal.shooter = shooter

    if data.get('assistance'):
        assistance = get_object_or_404(Player, data.get('assistance'))
        goal.assistance = assistance

    if data.get('match'):
        match = get_object_or_404(Match, data.get('match'))
        goal.match = match

    if data.get('time'):
        goal.time = datetime.datetime.strptime(data.get('time'), "%H:%M:%S")

    if data.get('type'):
        goal.type = data.get('type')

    goal.save()

    return HttpResponse("OK")


@require_http_methods(["POST"])
def edit_shot(request, shot_id):
    data = json.loads(str(request.body.decode('utf-8')))

    shot = get_object_or_404(Match, pk=shot_id)

    if data.get('shooter'):
        shooter = get_object_or_404(Player, data.get('shooter'))
        shot.shooter = shooter

    if data.get('match'):
        match = get_object_or_404(Match, data.get('match'))
        shot.match = match

    if data.get('time'):
        shot.time = datetime.datetime.strptime(data.get('time'), "%H:%M:%S")

    shot.save()

    return HttpResponse("OK")


@require_http_methods(["POST"])
def edit_match(request, match_id):
    data = json.loads(str(request.body.decode('utf-8')))

    match = get_object_or_404(Match, pk=match_id)

    if data.get('tournament'):
        tournament = get_object_or_404(Tournament, data.get('tournament'))
        match.tournament = tournament

    if data.get('team_one'):
        team_one = get_object_or_404(TeamOnTournament, data.get('team_one'))
        match.team_one = team_one

    if data.get('team_two'):
        team_two = get_object_or_404(TeamOnTournament, data.get('team_two'))
        match.team_two = team_two

    if data.get('start'):
        match.start = datetime.datetime.strptime(data.get('start'), "%Y-%m-%d %H:%M:%S")

    if data.get('end'):
        match.end = datetime.datetime.strptime(data.get('end'), "%Y-%m-%d %H:%M:%S")

    if data.get('halftime_length'):
        match.halftime_length = datetime.datetime.strptime(data.get('halftime_length'), "%H:%M:%S")

    if data.get('length'):
        match.length = datetime.datetime.strptime(data.get('length'), "%H:%M:%S")

    match.save()

    return HttpResponse("OK")


@require_http_methods(["POST"])
def edit_penalty(request, penalty_id):
    data = json.loads(str(request.body.decode('utf-8')))

    penalty = get_object_or_404(Penalty, pk=penalty_id)

    if data.get('card'):
        penalty.card = data.get('card')

    if data.get('match'):
        match = get_object_or_404(Match, data.get('match'))
        penalty.match = match

    if data.get('player'):
        player = get_object_or_404(Player, data.get('player'))
        penalty.player = player

    if data.get('time'):
        penalty.time = datetime.datetime.strptime(data.get('time'), "%H:%M:%S")

    if data.get('reason'):
        penalty.reason = data.get('reason')

    penalty.save()

    return HttpResponse("OK")


@require_http_methods(["DELETE"])
def remove_goal(request, goal_id):
    goal = get_object_or_404(Goal, pk=goal_id)
    goal.delete()

    return HttpResponse("OK")


@require_http_methods(["DELETE"])
def remove_shot(request, shot_id):
    shot = get_object_or_404(Shot, pk=shot_id)
    shot.delete()

    return HttpResponse("OK")


@require_http_methods(["DELETE"])
def remove_match(request, match_id):
    match = get_object_or_404(Match, pk=match_id)
    match.delete()

    return HttpResponse("OK")


@require_http_methods(["DELETE"])
def remove_penalty(request, penalty_id):
    penalty = get_object_or_404(Penalty, pk=penalty_id)
    penalty.delete()

    return HttpResponse("OK")


@require_http_methods(["POST"])
def change_goalie(request, match_id, team_id):
    data = json.loads(str(request.body.decode('utf-8')))

    match = get_object_or_404(Match, pk=match_id)
    team_on_tournament = get_object_or_404(TeamOnTournament, pk=team_id)
    new_goalie = get_object_or_404(Player, pk=data.get('goalie'))
    time = datetime.datetime.strptime(data.get('time'), "%H:%M:%S")

    if new_goalie not in match.team_one.players.all() and new_goalie not in match.team_two.players.all():
        return HttpResponseBadRequest("Nový brankář se nenachází ani v jednom z týmů.")

    for goalie in GoalieInMatch.objects.filter(match=match).all():
        if goalie.goalie in team_on_tournament.players.all() and goalie.end is None:
            goalie.end = time
            goalie.save()
            break

    new_goalie_in_match = GoalieInMatch(goalie=new_goalie, match=match,
                                        start=time)
    new_goalie_in_match.save()

    return HttpResponse("OK")


@require_http_methods(["POST"])
def start_match(request, match_id):
    data = json.loads(str(request.body.decode('utf-8')))

    match = get_object_or_404(Match, pk=match_id)

    # realny cas zacatku zapasu
    time = datetime.datetime.strptime(data.get('time'), "%H:%M:%S")

    match.start = time
    match.save()

    return HttpResponse("OK")


@require_http_methods(["POST"])
def end_match(request, match_id):
    data = json.loads(str(request.body.decode('utf-8')))

    match = get_object_or_404(Match, pk=match_id)

    # konecny cas delky zapasu
    time_relative = datetime.datetime.strptime(data.get('time_relative'), "%H:%M:%S")

    # realny cas konce zapasu
    time_real = datetime.datetime.strptime(data.get('time_real'), "%H:%M:%S")

    for goalie in GoalieInMatch.objects.filter(match=match).all():
        if goalie.end is None:
            goalie.end = time_relative
            goalie.save()

    match.end = time_real
    match.save()

    return HttpResponse("OK")


def intro(request):
    return render(request, "intro.html", {
        "GOOGLE_ANALYTICS": settings.ON_SERVER and not settings.DEBUG,
        "DEBUG": settings.DEBUG,
    })


# @user_passes_test(is_staff_check)
@ensure_csrf_cookie
def home(request):
    return render(request, "index.html", {
        "GOOGLE_ANALYTICS": settings.ON_SERVER and not settings.DEBUG,
        "DEBUG": settings.DEBUG,
    })
