"""ufobal URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.8/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Add an import:  from blog import urls as blog_urls
    2. Add a URL to urlpatterns:  url(r'^blog/', include(blog_urls))
"""
from django.conf.urls import include, url
from django.conf.urls.static import static
from django.contrib import admin
from django.views.generic import TemplateView

from ufobal import settings

urlpatterns = static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + [
    url(r'^admin/', include(admin.site.urls)),
    url(r'^', include('social.apps.django_app.urls', namespace='social')),
    url(r'^logout$', 'django.contrib.auth.views.logout', {'next_page': '/'}, name="logout"),
    url(r'^close_login_popup/$', TemplateView.as_view(template_name="close_login_popup.html"), name='login_popup_close'),

    url(r'^', include('ufobalapp.urls', namespace='api')),
    url(r'^managestats/', include('managestats.urls', namespace='managestats')),
    url(r'^intro$', "ufobalapp.views.intro", name='intro'),
    url(r'^.*$', "ufobalapp.views.home", name='home'),
]
