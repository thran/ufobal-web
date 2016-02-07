from django.conf.urls import url

from . import views
from ufobalapp.models import Player, Tournament, TeamOnTournament

urlpatterns = [
    url(r'^save_player$', views.save_player, name='save_player'),
    url(r'^add_attendance$', views.add_attendance, name='add_attendance'),
    url(r'^remove_attendance/(?P<player>\d+)-(?P<team>\d+)$', views.remove_attendance, name='remove_attendance'),
    url(r'^goals$', views.goals, name='get_goals'),
    url(r'^stats$', views.stats, name='get_stats'),
    url(r'^add_team$', views.add_team, name='add_team'),
    url(r'^add_team_on_tournament$', views.add_team_on_tournament, name='add_team_on_tournament'),
    url(r'^add_player$', views.add_player, name='add_player'),
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
    url(r'^end_match/(?P<match_id>\d+)$', views.end_match, name='end_match'),
]


models = [Player, Tournament, TeamOnTournament]

for model_class in models:
    name = model_class.__name__.lower()
    urlpatterns += (
        url(r'^{}/(?P<pk>\d+)$'.format(name), views.get_json_one, {"model_class": model_class}, name="get_{}".format(name)),
        url(r'^{}s$'.format(name), views.get_json_all, {"model_class": model_class}, name="get_{}s".format(name)),
    )
