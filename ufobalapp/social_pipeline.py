from django.contrib.auth.models import User
from social_core.exceptions import AuthException


class EmailAccountExists(AuthException):
    """Another account already uses the e-mail; its owner has to log in there and connect the provider in settings."""

    def __str__(self):
        return 'Účet s tímto e-mailem už existuje.'


def associate_by_email(backend, details, user=None, response=None, *args, **kwargs):
    """One account per e-mail: a new Google/Facebook login never creates a second account for a known e-mail.

    A Google login with a verified e-mail joins the account with that e-mail when the account has no password (its
    e-mail came from Google or Facebook too). Accounts with a password typed their e-mail in themselves and nobody
    verified it, so joining them would hand the account to whoever registered the address first; the login stops and
    the owner connects Google in settings instead. Facebook is never joined automatically.
    """
    if user:
        return None
    email = (details.get('email') or '').strip()
    if not email:
        return None
    accounts = list(User.objects.filter(email__iexact=email, is_active=True))
    if not accounts:
        return None
    verified = backend.name == 'google-oauth2' and (response or {}).get('email_verified') in (True, 'true')
    if verified and len(accounts) == 1 and not accounts[0].has_usable_password():
        return {'user': accounts[0], 'is_new': False}
    raise EmailAccountExists(backend)
