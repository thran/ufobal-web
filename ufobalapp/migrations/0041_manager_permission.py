from django.db import migrations


def grant_manage_to_staff(apps, schema_editor):
    """Staff used to be the only management role, so non-superuser staff become managers."""
    User = apps.get_model('auth', 'User')
    staff = list(User.objects.filter(is_staff=True, is_superuser=False))
    if not staff:
        return

    # Permission rows are normally created after migrate, which is too late for this migration.
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Permission = apps.get_model('auth', 'Permission')
    content_type, _ = ContentType.objects.get_or_create(app_label='ufobalapp', model='tournament')
    permission, _ = Permission.objects.get_or_create(
        content_type=content_type,
        codename='manage',
        defaults={'name': 'Správce - přístup do sekce Správa'},
    )
    for user in staff:
        user.user_permissions.add(permission)


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('contenttypes', '0002_remove_content_type_name'),
        ('ufobalapp', '0040_client_id'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='tournament',
            options={
                'permissions': [('manage', 'Správce - přístup do sekce Správa')],
                'verbose_name': 'turnaj',
                'verbose_name_plural': 'turnaje',
            },
        ),
        migrations.RunPython(grant_manage_to_staff, migrations.RunPython.noop),
    ]
