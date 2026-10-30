from django.contrib.auth.models import User
from social_core.exceptions import AuthException

from ufobalapp.models import EmailVerification


class EmailAccountExists(AuthException):
    """The e-mail cannot be matched to one account safely; its owner logs in otherwise and connects in settings."""

    def __str__(self):
        return 'Účet s tímto e-mailem už existuje.'


def _provider_vouches(backend, response):
    """Google says whether it verified the e-mail; Facebook returns only confirmed e-mails."""
    return backend.name != 'google-oauth2' or (response or {}).get('email_verified') in (True, 'true')


def associate_by_email(backend, details, user=None, response=None, *args, **kwargs):
    """One account per e-mail: a Google/Facebook login with a known e-mail joins that account.

    Only when the account's e-mail is proven too (a link opened, or an earlier Google/Facebook login), or the account
    has no password. An older account with a password may carry an e-mail its creator never owned, and that password
    would still open it. An account still waiting for its confirmation is taken over: whoever typed that e-mail at
    registration never proved it, the provider just did, so that password is dropped.
    """
    if user:
        return None
    email = (details.get('email') or '').strip()
    if not email:
        return None
    accounts = list(User.objects.filter(email__iexact=email, is_active=True))
    if not accounts:
        return None
    if not _provider_vouches(backend, response) or len(accounts) > 1:
        raise EmailAccountExists(backend)
    account = accounts[0]
    if EmailVerification.is_pending(account):
        account.set_unusable_password()
        account.save(update_fields=['password'])
    elif account.has_usable_password() and not EmailVerification.is_verified(account):
        raise EmailAccountExists(backend)
    return {'user': account, 'is_new': False}


def mark_email_verified(backend, details, user=None, response=None, *args, **kwargs):
    """The provider proved the account's e-mail, so later logins with the other provider may join the account."""
    email = (details.get('email') or '').strip()
    if user and email and user.email.strip().lower() == email.lower() and _provider_vouches(backend, response):
        if not EmailVerification.is_verified(user):
            EmailVerification.mark_verified(user)
