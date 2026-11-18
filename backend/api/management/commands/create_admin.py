from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import IntegrityError

class Command(BaseCommand):
    help = 'Create an admin user with specific permissions'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Username')
        parser.add_argument('--email', type=str, help='Email')
        parser.add_argument('--password', type=str, help='Password')
        parser.add_argument('--superuser', action='store_true', help='Make superuser')

    def handle(self, *args, **options):
        username = options.get('username') or 'admin'
        email = options.get('email') or 'admin@telemedicine.com'
        password = options.get('password') or 'Admin@2024!'
        is_superuser = options.get('superuser', False)

        try:
            if is_superuser:
                user = User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password
                )
                self.stdout.write(self.style.SUCCESS(f'✅ Superuser "{username}" created!'))
            else:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password
                )
                user.is_staff = True
                user.save()
                self.stdout.write(self.style.SUCCESS(f'✅ Staff user "{username}" created!'))

            self.stdout.write(f'📧 Email: {email}')
            self.stdout.write(f'🔑 Password: {password}')

        except IntegrityError:
            self.stdout.write(self.style.ERROR(f'❌ User "{username}" already exists!'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))