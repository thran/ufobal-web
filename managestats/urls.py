from django.conf.urls import url

from . import views
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic import TemplateView

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
    url(r'^generate_pairing_info/(?P<object_type>\w+)/(?P<object_id>\d+)/$', views.generate_pairing_info, name='generate_pairing_info'),
    url(r'^pairing_requests/$', views.pairing_requests, name='pairing_requests'),

    url(r'^player_detail/(?P<pk>\d+)$',
        ensure_csrf_cookie(TemplateView.as_view(template_name="managestats/player_detail.html")), name='player_detail'),

    url(r'^set_tournament_ranking$', views.set_tournament_ranking, name='set_tournament_ranking')
]
