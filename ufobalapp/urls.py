from django.conf.urls import url

from . import views
from ufobalapp.models import Player, Tournament, TeamOnTournament

urlpatterns = [
    url(r'^save_player$', views.save_player, name='save_player'),
    url(r'^add_attendance$', views.add_attendance, name='add_attendance'),
    url(r'^remove_attendance/(?P<player>\d+)-(?P<team>\d+)$', views.remove_attendance, name='remove_attendance'),
    url(r'^goals$', views.goals, name='get_goals'),
]

models = [Player, Tournament, TeamOnTournament]

for model_class in models:
    name = model_class.__name__.lower()
    urlpatterns += (
        url(r'^{}/(?P<pk>\d+)$'.format(name), views.get_json_one, {"model_class": model_class}, name="get_{}".format(name)),
        url(r'^{}s$'.format(name), views.get_json_all, {"model_class": model_class}, name="get_{}s".format(name)),
    )
