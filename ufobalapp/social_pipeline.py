from django.contrib.auth.models import User
from social_core.exceptions import AuthException

from ufobalapp.models import PendingEmailVerification


class EmailAccountExists(AuthException):
    """The e-mail cannot be matched to one account safely; its owner logs in otherwise and connects in settings."""

    def __str__(self):
        return 'Účet s tímto e-mailem už existuje.'


def associate_by_email(backend, details, user=None, response=None, *args, **kwargs):
    """One account per e-mail: a Google/Facebook login with a known e-mail joins that account.

    Account e-mails are confirmed (a link sent at registration) or older than confirming; the provider vouches for
    its side (Google says so explicitly, Facebook returns only confirmed e-mails). An account still waiting for its
    confirmation is taken over: whoever typed that e-mail at registration never proved it, the provider just did,
    so that password is dropped.
    """
    if user:
        return None
    email = (details.get('email') or '').strip()
    if not email:
        return None
    accounts = list(User.objects.filter(email__iexact=email, is_active=True))
    if not accounts:
        return None
    unverified = backend.name == 'google-oauth2' and (response or {}).get('email_verified') not in (True, 'true')
    if unverified or len(accounts) > 1:
        raise EmailAccountExists(backend)
    account = accounts[0]
    if PendingEmailVerification.objects.filter(user=account).delete()[0]:
        account.set_unusable_password()
        account.save(update_fields=['password'])
    return {'user': account, 'is_new': False}
