from django.conf.urls import url

from . import views
from ufobalapp.models import Player

urlpatterns = [
    url(r'^$', views.index, name='index'),
]

models = [Player]

for model_class in models:
    name = model_class.__name__.lower()
    urlpatterns.append(
        url(r'^{}/(?P<pk>\d+)$'.format(name), views.get_json, {"model_class": model_class}, name="get_{}".format(name))
    )
