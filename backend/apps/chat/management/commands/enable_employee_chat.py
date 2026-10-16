from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Enable chat for an existing active employee account; grants no HR/admin permission."

    def add_arguments(self, parser):
        parser.add_argument("username")

    def handle(self, *args, **options):
        try:
            user = User.objects.get(username=options["username"], is_active=True)
        except User.DoesNotExist:
            raise CommandError(
                "Create an active employee user first using the approved account workflow."
            ) from None
        user.groups.add(Group.objects.get_or_create(name="Employees")[0])
        self.stdout.write("Employee chat enabled. HR and admin privileges are unchanged.")
