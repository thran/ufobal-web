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
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView

import ufobalapp.views
from ufobal import settings
from ufobalapp import views_auth

urlpatterns = static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + [
    path('admin/', admin.site.urls),
    path('', include('social_django.urls', namespace='social')),
    path('close_login_popup/', TemplateView.as_view(template_name="close_login_popup.html"), name='login_popup_close'),
    path('login/close_login_popup', views_auth.close_login_popup, name='login_popup_close_new'),
    path('', include('ufobalapp.urls', namespace='api')),
    path('api_frontend/', include('ufobalapp.urls', namespace='api_frontend')),
    path('managestats/', include('managestats.urls', namespace='managestats')),
    path('intro', ufobalapp.views.intro, name='intro'),
    re_path(r'.*', ufobalapp.views.home, name='home'),
]
