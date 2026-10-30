from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User


class UsernameOrEmailBackend(ModelBackend):
    """Password login by username or e-mail (case-insensitive); a matching username wins."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        try:
            candidates = [User._default_manager.get_by_natural_key(username)]
        except User.DoesNotExist:
            candidates = list(User.objects.filter(email__iexact=username.strip())) if '@' in username else []
        if not candidates:
            # run the hasher anyway, so response time does not tell whether the account exists
            User().set_password(password)
            return None
        for user in candidates:
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        return None
