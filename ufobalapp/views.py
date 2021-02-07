#!/usr/bin/python
# -*- coding: UTF-8 -*-
import datetime
import json
import logging
from collections import defaultdict
from itertools import takewhile

from django.core.cache import cache
from django.db.models import Prefetch, Count, Max, Min, F
from django.http import JsonResponse, HttpResponse, HttpResponseNotAllowed, HttpResponseBadRequest
from django.shortcuts import render, get_object_or_404
from django.utils.six import wraps
from django.views.decorators.cache import cache_page
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.core.mail import send_mail

from managestats.views import is_staff_check
from ufobal import settings
from ufobalapp.models import Player, Tournament, Team, TeamOnTournament, Goal, \
    Match, Shot, GoalieInMatch, Penalty, PairingRequest, Group

SYSTEM_MAIL = 'ufobal.is@thran.cz'

logger = logging.getLogger(__name__)


def user_passes_test_or_401(test_func):
    """
    Decorator for views that checks that the user passes the given test,
    returning 401 if necessary. The test should be a callable
    that takes the user object and returns True if the user passes.
    """

    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if test_func(request.user):
                return view_func(request, *args, **kwargs)
            return HttpResponse('Unauthorized', status=401)

        return _wrapped_view

    return decorator


def is_authorized(user):
    return user.is_staff or hasattr(user, "player") or settings.TEST


def get_json_one(request, model_class, pk):
    obj = get_object_or_404(model_class, pk=pk)
    kwargs = {}
    if model_class == Tournament:
        kwargs['teams'] = False
    if request.GET.get("html", False):
        return render(request, "api.html", {"data": json.dumps(obj.to_json(), indent=4)})
    return JsonResponse(obj.to_json(**kwargs))


def get_json_all(request, model_class):
    objs = model_class.objects.all()
    if model_class == Tournament:
        objs = objs.prefetch_related("teams")
    if model_class == Match:
        objs = objs.filter(fake=False).prefetch_related("goals", "goalies_in_match", "shots",
                                                        "penalties", "team_one__players", "team_two__players")
    if model_class == TeamOnTournament:
        objs = objs.prefetch_related(Prefetch('players', queryset=Player.objects.all().only('id')))

    filtering = dict(request.GET)
    if len(filtering):
        if "html" in filtering:
            del filtering["html"]
        filtering = {key: value[0] for key, value in filtering.items()}
        objs = objs.filter(**filtering)

    data = [obj.to_json(simple=True, staff=request.user.is_staff) for obj in objs]
    if request.GET.get("html", False):
        return render(request, "api.html", {"data": json.dumps(data, indent=4)})
    return JsonResponse(data, safe=False)


def goals(request):
    shooter = Goal.objects.values("shooter", "match__tournament").filter(shooter__isnull=False).annotate(
        count=Count("pk"))
    assistance = Goal.objects.values("assistance", "match__tournament").filter(assistance__isnull=False).annotate(
        count=Count("pk"))
    data = {
        "goals": list(shooter),
        "assists": list(assistance),
    }

    if request.GET.get("html", False):
        return render(request, "api.html", {"data": json.dumps(data, indent=4)})
    return JsonResponse(data, safe=False)


def pairs(request, tournament_pk):
    pairs = Goal.objects.values("shooter", "assistance")\
        .filter(shooter__isnull=False, assistance__isnull=False, match__tournament=tournament_pk)\
        .annotate(count=Count("pk"))

    data = defaultdict(lambda: defaultdict(int))
    for pair in pairs:
        key = sorted((pair['shooter'], pair['assistance']))
        item = data[str(key)]
        item['points'] += pair['count']
        item['players'] = key
        if key[0] == pair['shooter']:
            item['goals_first'] = pair['count']
        else:
            item['goals_second'] = pair['count']

    data = list(data.values())

    if request.GET.get("html", False):
        return render(request, "api.html", {"data": json.dumps(data, indent=4)})
    return JsonResponse(data, safe=False)


def stats(request):
    active_players = []
    active_players_year = datetime.datetime.now().year - 1
    for tot in TeamOnTournament.objects.filter(tournament__date__gte=datetime.datetime(year=active_players_year, month=1, day=1)).prefetch_related('players'):
        active_players += [p.pk for p in tot.players.all()]
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
        "active_players": len(set(active_players)),
        "active_players_year": active_players_year,
    }
    return JsonResponse(data, safe=False)


@cache_page(60 * 60 * 24)
def hall_of_glory(request, max_instances=5):
    cache.clear()
    instances = Tournament.objects.annotate(Count("teams")).order_by('-teams__count')[:max_instances]
    max_teams_per_tournament = list(takewhile(lambda i: i.teams__count == instances[0].teams__count, instances))

    instances = Tournament.objects.annotate(Count("matches")).order_by('-matches__count')
    max_matches_per_tournament = list(takewhile(lambda i: i.matches__count == instances[0].matches__count, instances))

    instances = Goal.objects.values('shooter', 'match__tournament').annotate(Count('shooter')).order_by('-shooter__count')
    max_goal_per_tournament_player = list(takewhile(lambda i: i['shooter__count'] == instances[0]['shooter__count'], instances))

    instances = Goal.objects.values('assistance', 'match__tournament').annotate(Count('assistance')).order_by('-assistance__count')
    max_assists_per_tournament_player = list(takewhile(lambda i: i['assistance__count'] == instances[0]['assistance__count'], instances))

    instances = Goal.objects.filter(shooter__gender=Player.WOMAN).values('shooter', 'match__tournament').annotate(Count('shooter')).order_by('-shooter__count')
    max_goal_per_tournament_playerF = list(takewhile(lambda i: i['shooter__count'] == instances[0]['shooter__count'], instances))

    instances = Goal.objects.filter(assistance__gender=Player.WOMAN).values('assistance', 'match__tournament').annotate(Count('assistance')).order_by('-assistance__count')
    max_assists_per_tournament_playerF = list(takewhile(lambda i: i['assistance__count'] == instances[0]['assistance__count'], instances))

    teams = []
    for team in Team.objects.prefetch_related("tournaments__matches1__goals", "tournaments__matches2__goals"):
        data = {
            'team': team,
            'matches': len([m for t in team.tournaments.all() for m in list(t.matches1.all()) + list(t.matches2.all())]),
            'goals': sum([(m.score_one() if m.team_one == t else m.score_two()) for t in team.tournaments.all() for m in list(t.matches1.all()) + list(t.matches2.all())]),
        }
        data['goals_per_match'] = data['goals'] / data['matches'] if data['matches'] else 0
        teams.append(data)

    m = max(t['matches'] for t in teams)
    max_matches_per_team = [t for t in teams if t['matches'] == m]

    m = max(t['goals'] for t in teams)
    max_goals_per_team = [t for t in teams if t['goals'] == m]

    m = max(t['goals_per_match'] for t in teams)
    max_avg_goals_per_team = [t for t in teams if t['goals_per_match'] == m]

    data = {
        "max_teams_per_tournament": {
            "value": max_teams_per_tournament[0].teams__count,
            "instances": [i.to_json(teams=False) for i in max_teams_per_tournament]
        },
        "max_matches_per_tournament": {
            "value": max_matches_per_tournament[0].matches__count,
            "instances": [i.to_json(teams=False) for i in max_matches_per_tournament]
        },
        "max_matches_per_team": {
            "value": max_matches_per_team[0]['matches'],
            "instances": [i['team'].to_json(teams=False) for i in max_matches_per_team],
        },
        "max_goals_per_team": {
            "value": max_goals_per_team[0]['goals'],
            "instances": [i['team'].to_json(teams=False) for i in max_goals_per_team],
        },
        "max_avg_goals_per_team": {
            "value": max_avg_goals_per_team[0]['goals_per_match'],
            "instances": [i['team'].to_json(teams=False) for i in max_avg_goals_per_team],
        },
        "max_goal_per_tournament_player": {
            "value": max_goal_per_tournament_player[0]['shooter__count'],
            "instances": [[
                Player.objects.get(pk=i['shooter']).to_json(simple=True),
                Tournament.objects.get(pk=i['match__tournament']).to_json(teams=False),
            ] for i in max_goal_per_tournament_player]
        },
        "max_assistance_per_tournament_player": {
            "value": max_assists_per_tournament_player[0]['assistance__count'],
            "instances": [[
                Player.objects.get(pk=i['assistance']).to_json(simple=True),
                Tournament.objects.get(pk=i['match__tournament']).to_json(teams=False),
            ] for i in max_assists_per_tournament_player]
        },
        "max_goal_per_tournament_player_female": {
            "value": max_goal_per_tournament_playerF[0]['shooter__count'],
            "instances": [[
                Player.objects.get(pk=i['shooter']).to_json(simple=True),
                Tournament.objects.get(pk=i['match__tournament']).to_json(teams=False),
            ] for i in max_goal_per_tournament_playerF]
        },
        "max_assistance_per_tournament_player_female": {
            "value": max_assists_per_tournament_playerF[0]['assistance__count'],
            "instances": [[
                Player.objects.get(pk=i['assistance']).to_json(simple=True),
                Tournament.objects.get(pk=i['match__tournament']).to_json(teams=False),
            ] for i in max_assists_per_tournament_playerF]
        },
    }
    return JsonResponse(data, safe=False)


def get_empty_tournaments(request):
    tournaments = Tournament.objects.filter(teams__isnull=True)
    return JsonResponse([t.to_json(teams=False) for t in tournaments], safe=False)


@user_passes_test_or_401(is_authorized)
@require_http_methods(["POST"])
def save_player(request):
    data = json.loads(str(request.body.decode('utf-8')))
    player = get_object_or_404(Player, pk=data["pk"])
    if not (request.user.is_staff or player.user == request.user):
        return HttpResponse('Unauthorized', status=401)

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


@user_passes_test_or_401(is_authorized)
def remove_attendance(request, player, team):
    if request.method != "DELETE":
        return HttpResponseNotAllowed(["DELETE"])

    player = get_object_or_404(Player, pk=player)
    team = get_object_or_404(TeamOnTournament, pk=team)
    player.tournaments.remove(team)

    if team.captain == player:
        team.captain = None
        team.save()
    if team.default_goalie == player:
        team.default_goalie = None
        team.save()

    return HttpResponse("OK")


@user_passes_test_or_401(is_authorized)
@require_http_methods(["POST"])
def add_attendance(request):
    data = json.loads(str(request.body.decode('utf-8')))

    player = get_object_or_404(Player, pk=data["player"])
    team = get_object_or_404(TeamOnTournament, pk=data["team"])
    player.tournaments.add(team)

    return HttpResponse("OK")


@user_passes_test_or_401(is_authorized)
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


@user_passes_test_or_401(is_authorized)
@require_http_methods(["POST"])
def add_team(request):
    data = json.loads(str(request.body.decode('utf-8')))

    name = data.get('name')
    if not name:
        return HttpResponseBadRequest("Chybí jméno týmu")

    name_short = data.get('name_short', None)
    if name_short == '':
        name_short = None

    team = Team(name=name, name_short=name_short, description=data.get('description'))
    team.save()

    return HttpResponse(team.pk)


@user_passes_test_or_401(is_authorized)
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

    name_short = data.get('name_short', None)
    if name_short == '':
        name_short = None

    tour_team = TeamOnTournament(team=team, tournament=tournament, captain=data.get('captain'), name_short=name_short,
                                 name=data.get('name'), rank=data.get('rank'), strength=data.get('strength'),
                                 contact_mail=data.get('contact_mail'), contact_phone=data.get('contact_phone'))
    tour_team.save()

    return HttpResponse(tour_team.pk)


@user_passes_test_or_401(is_authorized)
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


@user_passes_test_or_401(is_authorized)
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


@user_passes_test_or_401(is_authorized)
@require_http_methods(["POST"])
def add_shot(request):
    data = json.loads(str(request.body.decode('utf-8')))

    match = get_object_or_404(Match, pk=data.get('match'))
    team = get_object_or_404(TeamOnTournament, pk=data.get('team'))
    if data.get("shooter"):
        shooter = get_object_or_404(Player, pk=data.get('shooter'))
        if shooter not in match.team_one.players.all() and shooter not in match.team_two.players.all():
            return HttpResponseBadRequest("Střelec se nenachází ani v jednom z týmů.")
    else:
        shooter = None

    shot = Shot(match=match, team=team, shooter=shooter, time=datetime.datetime.strptime(data.get('time'), "%H:%M:%S"))
    shot.save()

    return HttpResponse(shot.pk)


@user_passes_test_or_401(is_authorized)
@require_http_methods(["POST"])
def add_match(request):
    data = json.loads(str(request.body.decode('utf-8')))

    tournament = get_object_or_404(Tournament, pk=data.get('tournament'))
    team_one = get_object_or_404(TeamOnTournament, pk=data.get('team_one'))
    team_two = get_object_or_404(TeamOnTournament, pk=data.get('team_two'))
    referee_team = get_object_or_404(TeamOnTournament, pk=data.get('referee_team'))
    if data.get('referee'):
        referee = get_object_or_404(Player, pk=data.get('referee'))
    else:
        referee = None

    if team_one not in tournament.teams.all():
        return HttpResponseBadRequest("První tým není zaregistrovaný na turnaji.")
    if team_two not in tournament.teams.all():
        return HttpResponseBadRequest("Druhý tým není zaregistrovaný na turnaji.")
    if referee_team not in tournament.teams.all():
        return HttpResponseBadRequest("Rozhodčí tým není zaregistrovaný na turnaji.")
    if team_one == team_two or team_one == referee_team or team_two == referee_team:
        return HttpResponseBadRequest("Některý z vybraných týmů se shoduje.")

    match = Match(tournament=tournament, team_one=team_one, team_two=team_two,
                  referee=referee, referee_team=referee_team, start=data.get('start'), place=data.get('place'),
                  end=data.get('end'))
    match.save()

    if data.get('goalie_one'):
        goalie_one = Player.objects.get(pk=data.get('goalie_one'))
        if goalie_one and goalie_one not in team_one.players.all():
            return HttpResponseBadRequest("První brankář se nenachází v prvním týmu.")
        goalie_one_in_match = GoalieInMatch(goalie=goalie_one, match=match, start=datetime.time(0))
        goalie_one_in_match.save()
    elif team_one.default_goalie:
        goalie_one_in_match = GoalieInMatch(goalie=team_one.default_goalie, match=match, start=datetime.time(0))
        goalie_one_in_match.save()

    if data.get('goalie_two'):
        goalie_two = Player.objects.get(pk=data.get('goalie_two'))
        if goalie_two and goalie_two not in team_two.players.all():
            return HttpResponseBadRequest("Druhý brankář se nenachází ve druhém týmu.")
        goalie_two_in_match = GoalieInMatch(goalie=goalie_two, match=match, start=datetime.time(0))
        goalie_two_in_match.save()
    elif team_two.default_goalie:
        goalie_two_in_match = GoalieInMatch(goalie=team_two.default_goalie, match=match, start=datetime.time(0))
        goalie_two_in_match.save()

    return HttpResponse(match.pk)


@user_passes_test_or_401(is_authorized)
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


@user_passes_test_or_401(is_authorized)
@require_http_methods(["POST"])
def edit_goal(request, goal_id):
    data = json.loads(str(request.body.decode('utf-8')))

    goal = get_object_or_404(Goal, pk=goal_id)

    if data.get('shooter'):
        shooter = get_object_or_404(Player, pk=data.get('shooter'))
        goal.shooter = shooter

    if data.get('assistance'):
        assistance = get_object_or_404(Player, pk=data.get('assistance'))
        goal.assistance = assistance

    if data.get('match'):
        match = get_object_or_404(Match, pk=data.get('match'))
        goal.match = match

    if data.get('time'):
        goal.time = datetime.datetime.strptime(data.get('time'), "%H:%M:%S")

    if data.get('type'):
        goal.type = data.get('type')

    goal.save()

    return HttpResponse("OK")


@user_passes_test_or_401(is_authorized)
@require_http_methods(["POST"])
def edit_shot(request, shot_id):
    data = json.loads(str(request.body.decode('utf-8')))

    shot = get_object_or_404(Shot, pk=shot_id)

    if data.get('shooter'):
        shooter = get_object_or_404(Player, pk=data.get('shooter'))
        shot.shooter = shooter

    if data.get('match'):
        match = get_object_or_404(Match, pk=data.get('match'))
        shot.match = match

    if data.get('time'):
        shot.time = datetime.datetime.strptime(data.get('time'), "%H:%M:%S")

    shot.save()

    return HttpResponse("OK")


@user_passes_test_or_401(is_authorized)
@require_http_methods(["POST"])
def edit_match(request, match_id):
    data = json.loads(str(request.body.decode('utf-8')))

    match = get_object_or_404(Match, pk=match_id)

    if data.get('tournament'):
        tournament = get_object_or_404(Tournament, pk=data.get('tournament'))
        match.tournament = tournament

    if data.get('team_one'):
        team_one = get_object_or_404(TeamOnTournament, pk=data.get('team_one'))
        match.team_one = team_one

    if data.get('team_two'):
        team_two = get_object_or_404(TeamOnTournament, pk=data.get('team_two'))
        match.team_two = team_two

    if data.get('referee'):
        referee = get_object_or_404(Player, pk=data.get('referee'))
        match.referee = referee

    if data.get('referee_team'):
        referee_team = get_object_or_404(TeamOnTournament, pk=data.get('referee_team'))
        match.referee_team = referee_team

    if data.get('start'):
        match.start = datetime.datetime.strptime(data.get('start'), "%Y-%m-%d %H:%M:%S")

    if data.get('end'):
        match.end = datetime.datetime.strptime(data.get('end'), "%Y-%m-%d %H:%M:%S")

    if data.get('place'):
        match.place = data.get('place')

    if data.get('halftime_length'):
        match.halftime_length = datetime.datetime.strptime(data.get('halftime_length'), "%H:%M:%S")

    if data.get('length'):
        match.length = datetime.datetime.strptime(data.get('length'), "%H:%M:%S")
        for goalie in GoalieInMatch.objects.filter(match=match).all():
            if goalie.end is None:
                goalie.end = match.length
                goalie.save()

    match.save()

    return HttpResponse("OK")


@user_passes_test_or_401(is_authorized)
@require_http_methods(["POST"])
def edit_penalty(request, penalty_id):
    data = json.loads(str(request.body.decode('utf-8')))

    penalty = get_object_or_404(Penalty, pk=penalty_id)

    if data.get('card'):
        penalty.card = data.get('card')

    if data.get('match'):
        match = get_object_or_404(Match, pk=data.get('match'))
        penalty.match = match

    if data.get('player'):
        player = get_object_or_404(Player, pk=data.get('player'))
        penalty.player = player

    if data.get('time'):
        penalty.time = datetime.datetime.strptime(data.get('time'), "%H:%M:%S")

    if data.get('reason'):
        penalty.reason = data.get('reason')

    penalty.save()

    return HttpResponse("OK")


@user_passes_test_or_401(is_authorized)
@require_http_methods(["DELETE"])
def remove_goal(request, goal_id):
    goal = get_object_or_404(Goal, pk=goal_id)
    goal.delete()

    return HttpResponse("OK")


@user_passes_test_or_401(is_authorized)
@require_http_methods(["DELETE"])
def remove_shot(request, shot_id):
    shot = get_object_or_404(Shot, pk=shot_id)
    shot.delete()

    return HttpResponse("OK")


@user_passes_test_or_401(is_staff_check)
@require_http_methods(["DELETE"])
def remove_match(request, match_id):
    match = get_object_or_404(Match, pk=match_id)
    match.delete()

    return HttpResponse("OK")


@user_passes_test_or_401(is_authorized)
@require_http_methods(["DELETE"])
def remove_penalty(request, penalty_id):
    penalty = get_object_or_404(Penalty, pk=penalty_id)
    penalty.delete()

    return HttpResponse("OK")


@user_passes_test_or_401(is_authorized)
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
            if str(goalie.end).endswith(str(goalie.start)):
                goalie.delete()
            else:
                goalie.save()
            break

    new_goalie_in_match = GoalieInMatch(goalie=new_goalie, match=match,
                                        start=time + datetime.timedelta(seconds=1))
    new_goalie_in_match.save()

    return HttpResponse("OK")


@user_passes_test_or_401(is_authorized)
@require_http_methods(["POST"])
def start_match(request, match_id):
    data = json.loads(str(request.body.decode('utf-8')))

    match = get_object_or_404(Match, pk=match_id)

    # realny cas zacatku zapasu
    time = datetime.datetime.strptime(data.get('time'), "%H:%M:%S")

    match.start = time
    match.save()

    return HttpResponse("OK")


@user_passes_test_or_401(is_authorized)
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


@require_http_methods(["POST"])
def create_pairing_request(request, player_id):
    player = get_object_or_404(Player, pk=player_id)
    user = request.user

    pairing_req = PairingRequest.objects.filter(user=user).filter(state=PairingRequest.PENDING)
    if pairing_req:
        return HttpResponseBadRequest("Uživatel již má čekající žádost o spárování")

    if player.user:
        return HttpResponseBadRequest("Hráč je již spárovaný")

    if request.user.is_authenticated():
        try:
            if request.user.player:
                return HttpResponseBadRequest("Uživatel je již spárovaný")
        except Player.DoesNotExist:
            pass

    text = json.loads(str(request.body.decode('utf-8')))["text"]
    pairing_req = PairingRequest(player=player, user=user, text=text)
    pairing_req.save()

    send_mail('Nová žádost o spárování', '{} - {} - {} - http://is.ufobal.cz/managestats/pairing_requests/'
              .format(player, user, text), SYSTEM_MAIL, ['ufois-admin@googlegroups.com'], fail_silently=False)

    return HttpResponse("OK")


@user_passes_test_or_401(is_staff_check)
@require_http_methods(["POST"])
def approve_pairing_request(request, request_id):
    pairing_req = get_object_or_404(PairingRequest, pk=request_id)

    if pairing_req.state != PairingRequest.PENDING:
        return HttpResponseBadRequest("Již vyřešeno")

    pairing_req.state = PairingRequest.APPROVED
    pairing_req.save()
    pairing_req.player.user = pairing_req.user
    pairing_req.player.save()

    recepient = pairing_req.user.email
    if recepient:
        send_mail('Váš účet byl spárován', 'Ahoj, nyní můžeš využívat is.ufobal.cz na plno.', SYSTEM_MAIL,
                  [recepient], fail_silently=False)

    other_reqs = PairingRequest.objects.filter(player=pairing_req.player).filter(state=PairingRequest.PENDING)
    for req in other_reqs:
        req.state = PairingRequest.DENIED
        req.save()

    return HttpResponse("OK")


@user_passes_test_or_401(is_staff_check)
@require_http_methods(["POST"])
def deny_pairing_request(request, request_id):
    pairing_req = get_object_or_404(PairingRequest, pk=request_id)

    if pairing_req.state != PairingRequest.PENDING:
        return HttpResponseBadRequest("Již vyřešeno")

    pairing_req.state = PairingRequest.DENIED
    pairing_req.save()

    return HttpResponse("OK")


@require_http_methods(["POST"])
def pair_user(request, pairing_token):
    try:
        player = Player.objects.get(pairing_token=pairing_token)
    except Player.DoesNotExist:
        return HttpResponseBadRequest("bad token")

    if request.user.is_authenticated():
        try:
            if request.user.player:
                return HttpResponseBadRequest("Uživatel je již spárovaný")
        except Player.DoesNotExist:
            if player.user:
                return HttpResponseBadRequest("Kód byl již použit")

            player.user = request.user
            player.save()
            return JsonResponse(player.to_json(simple=True))
    else:
        return HttpResponseBadRequest("Uživatel není přihlášený")


def intro(request):
    return render(request, "intro.html", {
        "GOOGLE_ANALYTICS": settings.ON_SERVER and not settings.DEBUG,
        "DEBUG": settings.DEBUG,
    })


def ping(request):
    return HttpResponse("OK")


def get_groups(request, tournament_id=None):

    def is_match_in_level(match, level):
        gs = group_teams[level]
        for g in gs:
            if match.team_one_id in g and match.team_two_id in g:
                return True
        return False

    tournament = get_object_or_404(Tournament, pk=tournament_id)
    group_teams = defaultdict(lambda: [])
    groups = Group.objects.filter(tournament=tournament).order_by('level', 'name').prefetch_related('tournament', 'teams')
    for group in groups:
        group_teams[group.level].append(list(team.pk for team in group.teams.all()))

    matches = defaultdict(lambda: {})
    levels = defaultdict(lambda: 1)
    stats = defaultdict(lambda: defaultdict(lambda: {'score': [0, 0], 'wins': 0, 'looses': 0, 'winsP': 0, 'loosesP': 0, 'draws': 0}))
    for match in Match.objects.filter(tournament=tournament, end__isnull=False)\
            .prefetch_related('team_one', 'team_two', 'goals', 'team_one__players', 'team_two__players'):
        one_id = match.team_one_id
        two_id = match.team_two_id
        score_one = match.score_one()
        score_two = match.score_two()

        key = tuple(sorted([one_id, two_id]))
        level = levels[key]
        while not is_match_in_level(match, level) and level < 100:
            level += 1
        levels[key] = level + 1

        matches["{}-{}".format(one_id, two_id)][str(level)] = [score_one, score_two, match.with_shootout()]
        matches["{}-{}".format(two_id, one_id)][str(level)] = [score_two, score_one, match.with_shootout()]
        stats[str(one_id)][str(level)]['score'][0] += score_one
        stats[str(one_id)][str(level)]['score'][1] += score_two
        stats[str(two_id)][str(level)]['score'][0] += score_two
        stats[str(two_id)][str(level)]['score'][1] += score_one

        if score_one > score_two:
            stats[str(one_id)][str(level)]['wins'] += 1
            stats[str(two_id)][str(level)]['looses'] += 1
            if match.with_shootout():
                stats[str(one_id)][str(level)]['winsP'] += 1
                stats[str(two_id)][str(level)]['loosesP'] += 1
        if score_one < score_two:
            stats[str(one_id)][str(level)]['looses'] += 1
            stats[str(two_id)][str(level)]['wins'] += 1
            if match.with_shootout():
                stats[str(one_id)][str(level)]['loosesP'] += 1
                stats[str(two_id)][str(level)]['winsP'] += 1
        if score_one == score_two:
            stats[str(one_id)][str(level)]['draws'] += 1
            stats[str(two_id)][str(level)]['draws'] += 1

    data = {
        'groups': [group.to_json() for group in groups],
        'matches': matches,
        'stats': stats,
    }
    if request.GET.get("html", False):
        return render(request, "api.html", {"data": json.dumps(data, indent=4)})

    return JsonResponse(data, safe=False)


@ensure_csrf_cookie
def home(request):
    from ufobalapp.views_auth import get_user_data
    return render(request, "index.html", {
        "GOOGLE_ANALYTICS": settings.ON_SERVER and not settings.DEBUG,
        "DEBUG": settings.DEBUG,
        "TEST": settings.TEST,
        "user": json.dumps(get_user_data(request)),
        "live_tournament_pk": Tournament.objects.exclude(category__in=[Tournament.TRENING, Tournament.LIGA]).order_by("-date")[0].pk,
    })
