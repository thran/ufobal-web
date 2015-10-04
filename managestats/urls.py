from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^players$', views.players, name='players'),
    url(r'^players/edit$', views.players_edit, name='players_edit'),
    url(r'^tournaments$', views.tournaments, name='tournaments'),
    url(r'^tournament/(?P<tournament_id>[0-9]+)/$', views.tournament, name='tournament'),
    url(r'^teams$', views.teams, name='teams'),
    url(r'^match/add/(?P<tournament_id>[0-9]+)/$', views.match_add, name='match_add'),
    url(r'^match/(?P<match_id>[0-9]+)/$', views.match, name='match'),
    url(r'^goal/add/(?P<match_id>[0-9]+)/$', views.goal_add, name='goal_add'),
]
