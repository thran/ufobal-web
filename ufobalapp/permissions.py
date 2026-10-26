MANAGE_PERMISSION = 'ufobalapp.manage'


def is_manager(user):
    """Managers use the management section; superusers pass `has_perm` automatically."""
    return user.has_perm(MANAGE_PERMISSION)
