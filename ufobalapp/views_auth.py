import json
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib import auth
from django.contrib.auth.forms import PasswordChangeForm, PasswordResetForm, SetPasswordForm
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db.models import Q
from django.http import JsonResponse, HttpResponse
from django.template.loader import render_to_string
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST

from ufobalapp.models import PendingEmailVerification
from ufobalapp.views import SYSTEM_MAIL, is_authorized

PASSWORD_BACKEND = 'ufobalapp.auth_backends.UsernameOrEmailBackend'


def get_user_data(request):
    user = request.user
    if user.is_anonymous:
        return None
    else:
        return {
            "first_name": user.first_name if user.first_name or user.last_name else user.username,
            "last_name": user.last_name,
            "is_staff": user.is_staff,
            "is_authorized": is_authorized(user),
            "has_password": user.has_usable_password(),
            "player": user.player.to_json(simple=True) if hasattr(user, "player") else None,
        }


@ensure_csrf_cookie
def user_profile(request):
    return JsonResponse(get_user_data(request), safe=False)


def login(request):
    data = json.loads(str(request.body.decode('utf-8')))
    user = auth.authenticate(
        username=data.get('username', ''),
        password=data.get('password', ''),
    )
    if user is None:
        return JsonResponse(
            {'error': 'Špatné jméno, e-mail nebo heslo.', 'error_type': 'password_username_not_match'}, status=401
        )
    if not user.is_active:
        return JsonResponse({'error': 'Účet je deaktivován.', 'error_type': 'account_not_activated'}, status=401)
    if PendingEmailVerification.objects.filter(user=user).exists():
        return _error('Nejdřív potvrď e-mail, odkaz jsme ti poslali po registraci.', 'email_not_verified', status=403)
    auth.login(request, user)
    return user_profile(request)


def _check_credentials(credentials, new=False):
    if new and not credentials.get('username'):
        return {
            'error': 'Není vyplněno uživateslé jméno',
            'error_type': 'username_empty',
        }
    if new and not credentials.get('email'):
        return {
            'error': 'Není vyplněný e-mail',
            'error_type': 'email_empty',
        }
    if new and not credentials.get('password'):
        return {
            'error': 'Není vyplněné heslo',
            'error_type': 'password_empty',
        }

    if credentials.get('password') and credentials['password'] != credentials.get('password_check'):
        return {
            'error': 'Hesla se liší.',
            'error_type': 'password_not_match',
        }
    if credentials.get('password'):
        try:
            validate_password(
                credentials['password'],
                User(username=credentials.get('username', ''), email=credentials.get('email', '')),
            )
        except ValidationError as error:
            return {'error': ' '.join(error.messages), 'error_type': 'password_invalid'}
    if credentials.get('username') and _user_exists(username=credentials['username']):
        return {
            'error': 'Uživatel s tímto uživatelským jménem již existuje.',
            'error_type': 'username_exists',
        }
    if new and _user_exists(email__iexact=credentials['email'].strip()):
        return {
            'error': 'Uživatel s tímto e-mailem již existuje.',
            'error_type': 'email_exists',
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
            user.backend = PASSWORD_BACKEND
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
    if request.user.is_authenticated:
        return JsonResponse(
            {
                'error': 'Uživatel již přihlášen',
                'error_type': 'username_logged',
            },
            status=400,
        )
    data = json.loads(str(request.body.decode('utf-8')))
    error = _save_user(request, data, new=True)
    if error is not None:
        return JsonResponse(error, status=400)
    # nobody checked the e-mail yet: the account logs in only after the link from it is opened
    user = request.user
    PendingEmailVerification.objects.create(user=user)
    send_email_verification(user)
    return JsonResponse({'verification_sent': True, 'email': user.email})


def update_profile(request, status=200):
    data = json.loads(str(request.body.decode('utf-8')))
    error = _save_user(request, data, new=False)
    if error:
        return JsonResponse(error, status=400)
    return user_profile(request)


def logout(request):
    auth.logout(request)
    return HttpResponse('ok', status=202)


def _json(request):
    try:
        return json.loads(request.body.decode('utf-8') or '{}')
    except ValueError:
        return {}


def _error(message, error_type, status=400):
    return JsonResponse({'error': message, 'error_type': error_type}, status=status)


def _form_error(form):
    return _error(' '.join(m for messages in form.errors.values() for m in messages), 'password_invalid')


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    return forwarded.split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')


def _over_limit(key, limit, window=60 * 60):
    """Counts a hit on ``key``; True once there were more than ``limit`` hits within ``window`` seconds."""
    cache.add(key, 0, window)
    try:
        hits = cache.incr(key)
    except ValueError:  # expired between add and incr
        cache.set(key, 1, window)
        hits = 1
    return hits > limit


class AccountPasswordResetForm(PasswordResetForm):
    def get_users(self, email):
        # unlike Django's form, also accounts without a password (Google/FB only), so they can set one
        return User.objects.filter(email__iexact=email, is_active=True)


@require_POST
def password_reset(request):
    """Sends a reset link if an active account has this e-mail; the response never tells whether it does."""
    email = (_json(request).get('email') or '').strip()
    if not email:
        return _error('Vyplň e-mail.', 'email_empty')
    over_ip = _over_limit(f'password_reset:ip:{_client_ip(request)}', 20)
    over_email = _over_limit(f'password_reset:email:{email.lower()}', 5)
    if over_ip or over_email:
        return _error('Příliš mnoho pokusů, zkus to znovu za hodinu.', 'rate_limited', status=429)
    form = AccountPasswordResetForm({'email': email})
    if form.is_valid():
        form.save(
            subject_template_name='emails/password_reset_subject.txt',
            email_template_name='emails/password_reset.txt',
            from_email=SYSTEM_MAIL,
            domain_override=urlsplit(settings.SITE_URL).netloc,
            extra_email_context={'site_url': settings.SITE_URL},
        )
    return JsonResponse({'ok': True})


def _reset_user(data):
    """The active account a reset link belongs to, or None when the link is wrong, used or expired."""
    try:
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(data.get('uid') or '')), is_active=True)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError, ValidationError):
        return None
    return user if default_token_generator.check_token(user, data.get('token') or '') else None


@require_POST
def password_reset_check(request):
    user = _reset_user(_json(request))
    if user is None:
        return JsonResponse({'valid': False})
    return JsonResponse({'valid': True, 'username': user.username, 'has_password': user.has_usable_password()})


@require_POST
def password_reset_confirm(request):
    data = _json(request)
    user = _reset_user(data)
    if user is None:
        return _error('Odkaz je neplatný nebo vypršel, požádej o nový.', 'token_invalid')
    form = SetPasswordForm(user, {'new_password1': data.get('password'), 'new_password2': data.get('password_check')})
    if not form.is_valid():
        return _form_error(form)
    form.save()
    # the link came to the account's e-mail, so the e-mail is confirmed too
    PendingEmailVerification.objects.filter(user=user).delete()
    auth.login(request, user, backend=PASSWORD_BACKEND)
    return user_profile(request)


@require_POST
def password_change(request):
    """Changes the password; an account without one (Google/FB only) sets its first password."""
    if not request.user.is_authenticated:
        return _error('Nejsi přihlášený.', 'not_logged_in', status=401)
    data = _json(request)
    passwords = {'new_password1': data.get('password'), 'new_password2': data.get('password_check')}
    if request.user.has_usable_password():
        form = PasswordChangeForm(request.user, {'old_password': data.get('old_password'), **passwords})
    else:
        form = SetPasswordForm(request.user, passwords)
    if not form.is_valid():
        return _form_error(form)
    form.save()
    auth.update_session_auth_hash(request, form.user)
    return user_profile(request)


EMAIL_VERIFY_SALT = 'ufobalapp.email-verify'
EMAIL_VERIFY_MAX_AGE = 7 * 24 * 60 * 60


def send_email_verification(user):
    token = signing.dumps({'user': user.pk, 'email': user.email}, salt=EMAIL_VERIFY_SALT)
    context = {'user': user, 'site_url': settings.SITE_URL, 'token': token}
    send_mail(
        render_to_string('emails/email_verify_subject.txt', context).strip(),
        render_to_string('emails/email_verify.txt', context),
        SYSTEM_MAIL,
        [user.email],
    )


@require_POST
def email_verify(request):
    """Confirms the e-mail of a new account from the link and logs it in; the link works once."""
    try:
        data = signing.loads(_json(request).get('token') or '', salt=EMAIL_VERIFY_SALT, max_age=EMAIL_VERIFY_MAX_AGE)
        user = User.objects.get(pk=data['user'], is_active=True, email=data['email'])
    except (signing.BadSignature, User.DoesNotExist, KeyError, TypeError):
        return _error('Odkaz je neplatný nebo vypršel. Nech si poslat nový při přihlášení.', 'token_invalid')
    if not PendingEmailVerification.objects.filter(user=user).delete()[0]:
        return _error('E-mail už je potvrzený, stačí se přihlásit.', 'already_verified')
    auth.login(request, user, backend=PASSWORD_BACKEND)
    return user_profile(request)


@require_POST
def email_verify_resend(request):
    """Sends the confirmation link again to an unconfirmed account; the answer never tells whether there is one."""
    login = (_json(request).get('login') or '').strip()
    if not login:
        return _error('Vyplň jméno nebo e-mail.', 'login_empty')
    over_ip = _over_limit(f'email_verify:ip:{_client_ip(request)}', 20)
    over_login = _over_limit(f'email_verify:login:{login.lower()}', 5)
    if over_ip or over_login:
        return _error('Příliš mnoho pokusů, zkus to znovu za hodinu.', 'rate_limited', status=429)
    pending = PendingEmailVerification.objects.filter(user__is_active=True).select_related('user')
    for verification in pending.filter(Q(user__username=login) | Q(user__email__iexact=login)):
        send_email_verification(verification.user)
    return JsonResponse({'ok': True})
