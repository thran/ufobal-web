from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^players$', views.players, name='players'),
    url(r'^tournaments$', views.tournaments, name='tournaments'),
    url(r'^tournament/(?P<tournament_id>[0-9]+)/$', views.tournament, name='tournament'),
    url(r'^teams$', views.teams, name='teams'),
    url(r'^match/(?P<match_id>[0-9]+)/$', views.match, name='match'),

]