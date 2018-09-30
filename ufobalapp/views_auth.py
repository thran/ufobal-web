#!/usr/bin/python
# -*- coding: UTF-8 -*-
import json

from django.contrib import auth
from django.contrib.auth.models import User
from django.http import JsonResponse, HttpResponse

from ufobalapp.views import is_authorized


def get_user_data(request):
    user = request.user
    if user.is_anonymous():
        return None
    else:
        return {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_staff": user.is_staff,
            "is_authorized": is_authorized(user),
            "player": user.player.to_json(simple=True) if hasattr(user, "player") else None
        }


def user_profile(request):
    return JsonResponse(get_user_data(request))


def login(request):
    data = json.loads(str(request.body.decode('utf-8')))
    user = auth.authenticate(
        username=data.get('username', ''),
        password=data.get('password', ''),
    )
    if user is None:
        return JsonResponse({
            'error': 'Špatné jméno nebo heslo.',
            'error_type': 'password_username_not_match'
        }, status=401)
    if not user.is_active:
        return JsonResponse({
            'error': 'Účet je deaktivován.',
            'error_type': 'account_not_activated'
        }, status=401)
    auth.login(request, user)
    return user_profile(request)


def _check_credentials(credentials, new=False):
    if new and not credentials.get('username'):
        return {
            'error': 'Není vyplněno uživateslé jméno',
            'error_type': 'username_empty'
        }
    if new and not credentials.get('email'):
        return {
            'error': 'Není vyplněný e-mail',
            'error_type': 'email_empty'
        }
    if new and not credentials.get('password'):
        return {
            'error': 'Není vyplněné heslo',
            'error_type': 'password_empty'
        }

    if credentials.get('password') and credentials['password'] != credentials.get('password_check'):
        return {
            'error': 'Hesla se liší.',
            'error_type': 'password_not_match'
        }
    if credentials.get('username') and _user_exists(username=credentials['username']):
        return {
            'error': 'Uživatel s tímto uživatelským jménem již existuje.',
            'error_type': 'username_exists'
        }
    if new and _user_exists(email=credentials['email']):
        return {
            'error': 'Uživatel s tímto e-mailem již existuje.',
            'error_type': 'email_exists'
        }
    return None


def _user_exists(**kwargs):
    return User.objects.filter(**kwargs).exists()


def _save_user(request, credentials, new=False):
    error = _check_credentials(credentials, new)
    if error is not None:
        return error
    else:
        user = request.user
        if new:
            user = User()
            user.backend='django.contrib.auth.backends.ModelBackend'
            user.username = credentials['username']
            user.email = credentials['email']
        if credentials.get('password'):
            user.set_password(credentials['password'])
        if credentials.get('first_name'):
            user.first_name = credentials['first_name']
        if credentials.get('last_name'):
            user.last_name = credentials['last_name']
        user.save()
        request.user = user
        return None


def signup(request):
    if request.user.is_authenticated():
        return JsonResponse({
            'error': 'Uživatel již přihlášen',
            'error_type': 'username_logged'
        }, status=400)
    data = json.loads(str(request.body.decode('utf-8')))
    error = _save_user(request, data, new=True)
    if error is not None:
        return JsonResponse(error, status=400)
    else:
        auth.login(request, request.user)
        return user_profile(request)


def update_profile(request, status=200):
    data = json.loads(str(request.body.decode('utf-8')))
    error = _save_user(request, data, new=False)
    if error:
        return JsonResponse(error, status=400)
    return user_profile(request)


def logout(request):
    auth.logout(request)
    return HttpResponse('ok', status=202)