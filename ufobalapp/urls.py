from django.urls import path

from ufobalapp import views_auth
from . import views
from ufobalapp.models import Player, Tournament, TeamOnTournament, Match

urlpatterns = [
    path('ping', views.ping, name='ping'),
    path('save_player', views.save_player, name='save_player'),
    path('add_attendance', views.add_attendance, name='add_attendance'),
    path('remove_attendance/<int:player>-(<int:team>', views.remove_attendance, name='remove_attendance'),
    path('goals', views.goals, name='get_goals'),
    path('pairs/<int:tournament_pk>', views.pairs, name='get_pairs'),
    path('stats', views.stats, name='get_stats'),
    path('hall_of_glory', views.hall_of_glory, name='get_hall_of_glory'),
    path('add_team', views.add_team, name='add_team'),
    path('add_team_on_tournament', views.add_team_on_tournament, name='add_team_on_tournament'),
    path('add_player', views.add_player, name='add_player'),
    path('set_captain', views.set_captain_or_goalie, name='set_captain'),
    path('set_default_goalie', views.set_captain_or_goalie, {"goalie": True}, name='set_default_goalie'),
    path('add_goal', views.add_goal, name='add_goal'),
    path('add_shot', views.add_shot, name='add_shot'),
    path('add_match', views.add_match, name='add_match'),
    path('add_penalty', views.add_penalty, name='add_penalty'),
    path('edit_goal/<int:goal_id>', views.edit_goal, name='edit_goal'),
    path('edit_shot/<int:shot_id>', views.edit_shot, name='edit_shot'),
    path('edit_match/<int:match_id>', views.edit_match, name='edit_match'),
    path('edit_penalty/<int:penalty_id>', views.edit_penalty, name='edit_penalty'),
    path('remove_goal/<int:goal_id>', views.remove_goal, name='remove_goal'),
    path('remove_shot/<int:shot_id>', views.remove_shot, name='remove_shot'),
    path('remove_match/<int:match_id>', views.remove_match, name='remove_match'),
    path('remove_penalty/<int:penalty_id>', views.remove_penalty, name='remove_penalty'),
    path('change_goalie/<int:match_id>-<int:team_id>', views.change_goalie, name='change_goalie'),
    path('start_match/<int:match_id>', views.start_match, name='start_match'),
    path('end_match/<int:match_id>', views.end_match, name='end_match'),
    path('pair_user/<str:pairing_token>', views.pair_user, name='pair_user'),
    path('user_profile', views_auth.user_profile, name='user_profile'),
    path('login', views_auth.login, name='login'),
    path('logout', views_auth.logout, name='logout'),
    path('signup', views_auth.signup, name='signup'),
    path('create_pairing_request/<int:player_id>', views.create_pairing_request, name='create_pairing_request'),
    path('approve_pairing_request/<int:request_id>', views.approve_pairing_request, name='approve_pairing_request'),
    path('deny_pairing_request/<int:request_id>', views.deny_pairing_request, name='deny_pairing_request'),
    path('get_groups/<int:tournament_id>', views.get_groups, name='get_groups'),
    path('get_empty_trournaments', views.get_empty_tournaments, name='get_emptyTournaments'),
    path('get_referee_feedbacks/<int:tournament_id>', views.get_referee_feedbacks, name='get_referee_feedbacks'),
    path('save_referee_feedback', views.save_referee_feedback, name='save_referee_feedback'),
]


models = [Player, Tournament, TeamOnTournament, Match]

for model_class in models:
    name = model_class.__name__.lower()
    urlpatterns += (
        path(f'{name}/<int:pk>', views.get_json_one, {"model_class": model_class}, name="get_{}".format(name)),
        path(f'{name}s', views.get_json_all, {"model_class": model_class}, name="get_{}s".format(name)),
    )

app_name = 'api'
