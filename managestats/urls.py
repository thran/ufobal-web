from django.urls import path

from . import views
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic import TemplateView

urlpatterns = [
    path('', views.index, name='index'),
    path('players', views.players, name='players'),
    path('players/edit', views.players_edit, name='players_edit'),
    path('tournaments', views.tournaments, name='tournaments'),
    path('tournament/<int:tournament_id>/', views.tournament, name='tournament'),
    path('tournament/referee_feedbacks/<int:tournament_id>/', views.referee_feedbacks, name='referee_feedbacks'),
    path('teams', views.teams, name='teams'),
    path('match/add/<int:tournament_id>/', views.match_add, name='match_add'),
    path('match/<int:match_id>/', views.match, name='match'),
    path('goal/add/<int:match_id>/', views.goal_add, name='goal_add'),
    path('generate_pairing_info/<str:object_type>/<int:object_id>/', views.generate_pairing_info, name='generate_pairing_info'),
    path('pairing_requests/', views.pairing_requests, name='pairing_requests'),
    path('player_detail/<int:pk>', ensure_csrf_cookie(TemplateView.as_view(template_name="managestats/player_detail.html")), name='player_detail'),
    path('set_tournament_ranking', views.set_tournament_ranking, name='set_tournament_ranking'),
    path('clear_cache', views.clear_cache, name='clear_cache'),
]

app_name = 'managestats'
