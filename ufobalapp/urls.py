from django.conf.urls import url

from ufobalapp import views_auth
from . import views
from ufobalapp.models import Player, Tournament, TeamOnTournament, Match

urlpatterns = [
    url(r'^ping$', views.ping, name='ping'),
    url(r'^save_player$', views.save_player, name='save_player'),
    url(r'^add_attendance$', views.add_attendance, name='add_attendance'),
    url(r'^remove_attendance/(?P<player>\d+)-(?P<team>\d+)$', views.remove_attendance, name='remove_attendance'),
    url(r'^goals$', views.goals, name='get_goals'),
    url(r'^pairs/(?P<tournament_pk>\d+)$', views.pairs, name='get_pairs'),
    url(r'^stats$', views.stats, name='get_stats'),
    url(r'^hall_of_glory', views.hall_of_glory, name='get_hall_of_glory'),
    url(r'^get_live_tournament$', views.live_tournament, name='get_liveTournament'),
    url(r'^add_team$', views.add_team, name='add_team'),
    url(r'^add_team_on_tournament$', views.add_team_on_tournament, name='add_team_on_tournament'),
    url(r'^add_player$', views.add_player, name='add_player'),
    url(r'^set_captain', views.set_captain_or_goalie, name='set_captain'),
    url(r'^set_default_goalie', views.set_captain_or_goalie, {"goalie": True}, name='set_default_goalie'),
    url(r'^add_goal$', views.add_goal, name='add_goal'),
    url(r'^add_shot$', views.add_shot, name='add_shot'),
    url(r'^add_match$', views.add_match, name='add_match'),
    url(r'^add_penalty$', views.add_penalty, name='add_penalty'),
    url(r'^edit_goal/(?P<goal_id>\d+)$', views.edit_goal, name='edit_goal'),
    url(r'^edit_shot/(?P<shot_id>\d+)$', views.edit_shot, name='edit_shot'),
    url(r'^edit_match/(?P<match_id>\d+)$', views.edit_match, name='edit_match'),
    url(r'^edit_penalty/(?P<penalty_id>\d+)$', views.edit_penalty, name='edit_penalty'),
    url(r'^remove_goal/(?P<goal_id>\d+)$', views.remove_goal, name='remove_goal'),
    url(r'^remove_shot/(?P<shot_id>\d+)$', views.remove_shot, name='remove_shot'),
    url(r'^remove_match/(?P<match_id>\d+)$', views.remove_match, name='remove_match'),
    url(r'^remove_penalty/(?P<penalty_id>\d+)$', views.remove_penalty, name='remove_penalty'),
    url(r'^change_goalie/(?P<match_id>\d+)-(?P<team_id>\d+)$', views.change_goalie, name='change_goalie'),
    url(r'^start_match/(?P<match_id>\d+)$', views.start_match, name='start_match'),
    url(r'^end_match/(?P<match_id>\d+)$', views.end_match, name='end_match'),
    url(r'^pair_user/(?P<pairing_token>\w+)$', views.pair_user, name='pair_user'),
    url(r'^user_profile$', views_auth.user_profile, name='user_profile'),
    url(r'^login/$', views_auth.login, name='login'),
    url(r'^logout/$', views_auth.logout, name='logout'),
    url(r'^signup/$', views_auth.signup, name='signup'),
    url(r'^create_pairing_request/(?P<player_id>\d+)$', views.create_pairing_request, name='create_pairing_request'),
    url(r'^approve_pairing_request/(?P<request_id>\d+)$', views.approve_pairing_request, name='approve_pairing_request'),
    url(r'^deny_pairing_request/(?P<request_id>\d+)$', views.deny_pairing_request, name='deny_pairing_request'),
    url(r'^get_groups/(?P<tournament_id>\d+)', views.get_groups, name='get_groups'),
    url(r'^get_empty_trournaments', views.get_empty_tournaments, name='get_emptyTournaments'),
]


models = [Player, Tournament, TeamOnTournament, Match]

for model_class in models:
    name = model_class.__name__.lower()
    urlpatterns += (
        url(r'^{}/(?P<pk>\d+)$'.format(name), views.get_json_one, {"model_class": model_class}, name="get_{}".format(name)),
        url(r'^{}s$'.format(name), views.get_json_all, {"model_class": model_class}, name="get_{}s".format(name)),
    )
