from django.contrib.auth.models import Permission, User


def create_manager(username='manager', **kwargs):
    user = User.objects.create_user(username, password='x', **kwargs)
    user.user_permissions.add(Permission.objects.get(content_type__app_label='ufobalapp', codename='manage'))
    return user
