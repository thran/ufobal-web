from django.conf.urls import url

from . import views

urlpatterns = [
    # ex:/
    url(r'^$', views.index, name='index'),
    # ex: /player/5/
    #url(r'^player/(?P<player_id>[0-9]+)/$', views.player_detail, name='player_detail'),
    url(r'^player/add/$', views.add_player, name='add_player')
]