"""Account settings for the logged-in user: profile, e-mail change and linked Google/Facebook logins."""

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core import signing
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.views.decorators.http import require_http_methods, require_POST
from social_core.exceptions import NotAllowedToDisconnect
from social_django.utils import load_backend, load_strategy

from ufobalapp.views import SYSTEM_MAIL
from ufobalapp.views_auth import _error, _json, _over_limit

EMAIL_CHANGE_SALT = 'ufobalapp.email-change'
EMAIL_CHANGE_MAX_AGE = 24 * 60 * 60


def account_json(user):
    return {
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'has_password': user.has_usable_password(),
        'social': [
            {'id': s.pk, 'provider': s.provider, 'uid': s.uid} for s in user.social_auth.order_by('provider', 'pk')
        ],
    }


def _not_logged_in():
    return _error('Nejsi přihlášený.', 'not_logged_in', status=401)


def _email_taken(email, user):
    return User.objects.filter(email__iexact=email, is_active=True).exclude(pk=user.pk).exists()


@require_http_methods(['GET', 'POST'])
def account(request):
    """GET the account, POST {username, first_name, last_name} to change them."""
    user = request.user
    if not user.is_authenticated:
        return _not_logged_in()
    if request.method == 'POST':
        data = _json(request)
        username = (data.get('username') or '').strip()
        if not username:
            return _error('Vyplň uživatelské jméno.', 'username_empty')
        try:
            UnicodeUsernameValidator()(username)
        except ValidationError as error:
            return _error(' '.join(error.messages), 'username_invalid')
        if len(username) > 150:
            return _error('Uživatelské jméno je moc dlouhé.', 'username_invalid')
        if User.objects.filter(username__iexact=username).exclude(pk=user.pk).exists():
            return _error('Uživatel s tímto uživatelským jménem již existuje.', 'username_exists')
        user.username = username
        user.first_name = (data.get('first_name') or '').strip()[:150]
        user.last_name = (data.get('last_name') or '').strip()[:150]
        user.save(update_fields=['username', 'first_name', 'last_name'])
    return JsonResponse(account_json(user))


@require_POST
def email_change(request):
    """Sends a confirmation link to the new address; the e-mail changes only once it is opened."""
    user = request.user
    if not user.is_authenticated:
        return _not_logged_in()
    email = (_json(request).get('email') or '').strip()
    try:
        validate_email(email)
    except ValidationError:
        return _error('Neplatný e-mail.', 'email_invalid')
    if email.lower() == user.email.strip().lower():
        return _error('Tenhle e-mail už máš.', 'email_same')
    if _email_taken(email, user):
        return _error('Tento e-mail už používá jiný účet.', 'email_exists')
    if _over_limit(f'email_change:user:{user.pk}', 5):
        return _error('Příliš mnoho pokusů, zkus to znovu za hodinu.', 'rate_limited', status=429)
    # the old e-mail in the token makes the link useless once the e-mail changed in any other way
    token = signing.dumps({'user': user.pk, 'old': user.email, 'new': email}, salt=EMAIL_CHANGE_SALT)
    context = {'user': user, 'site_url': settings.SITE_URL, 'token': token, 'email': email}
    send_mail(
        render_to_string('emails/email_change_subject.txt', context).strip(),
        render_to_string('emails/email_change.txt', context),
        SYSTEM_MAIL,
        [email],
    )
    return JsonResponse({'ok': True})


@require_POST
def email_change_confirm(request):
    """Confirms the new e-mail from the link; repeating it (a reloaded page) is fine."""
    try:
        data = signing.loads(_json(request).get('token') or '', salt=EMAIL_CHANGE_SALT, max_age=EMAIL_CHANGE_MAX_AGE)
        user = User.objects.get(pk=data['user'], is_active=True)
    except (signing.BadSignature, User.DoesNotExist, KeyError, TypeError):
        return _error('Odkaz je neplatný nebo vypršel.', 'token_invalid')
    if user.email != data['new']:
        if user.email != data['old']:
            return _error('Odkaz je neplatný nebo vypršel.', 'token_invalid')
        if _email_taken(data['new'], user):
            return _error('Tento e-mail už mezitím začal používat jiný účet.', 'email_exists')
        user.email = data['new']
        user.save(update_fields=['email'])
    return JsonResponse({'email': user.email})


@require_POST
def social_disconnect(request):
    """Unlinks one Google/Facebook login, unless it is the last way to log in (social-core checks that)."""
    user = request.user
    if not user.is_authenticated:
        return _not_logged_in()
    association = user.social_auth.filter(pk=_json(request).get('id')).first()
    if association is None:
        return _error('Propojení nenalezeno.', 'not_found', status=404)
    strategy = load_strategy(request)
    backend = load_backend(strategy, association.provider, redirect_uri=None)
    try:
        backend.disconnect(user=user, association_id=association.pk)
    except NotAllowedToDisconnect:
        return _error(
            'Je to jediný způsob přihlášení. Nejdřív si nastav heslo nebo propoj jiný účet.', 'last_login_method'
        )
    return JsonResponse(account_json(user))
