import logging
from urllib.parse import urlencode

from django.shortcuts import redirect
from social_core.exceptions import AuthAlreadyAssociated, AuthCanceled, SocialAuthBaseException

from ufobalapp.social_pipeline import EmailAccountExists

logger = logging.getLogger(__name__)

# exception -> code the SPA turns into a message
ERROR_CODES = (
    (AuthCanceled, 'cancelled'),
    (AuthAlreadyAssociated, 'already_linked'),
    (EmailAccountExists, 'email_exists'),
)


class SocialLoginErrorMiddleware:
    """A failed or cancelled Google/Facebook login goes back to the page it started from with ?login_error=<code>,
    instead of a 500. (social_django's own middleware re-raises with DEBUG and reports through Django messages.)"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        if getattr(request, 'social_strategy', None) is None or not isinstance(exception, SocialAuthBaseException):
            return None
        code = next((code for cls, code in ERROR_CODES if isinstance(exception, cls)), 'failed')
        logger.info('social login failed (%s): %r', code, exception)
        # social_core stored the sanitized ?next= of the login start in the session (same host only)
        next_url = request.session.get('next') or '/'
        return redirect(f"{next_url}{'&' if '?' in next_url else '?'}{urlencode({'login_error': code})}")
