import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'telemedicine.settings')
django.setup()

from django.contrib.auth.models import User

def create_admin():
    username = input("Username: ")
    email = input("Email: ")
    password = input("Password: ")

    if User.objects.filter(username=username).exists():
        print(f"❌ User '{username}' already exists!")
        return

    User.objects.create_superuser(username=username, email=email, password=password)
    print(f"✅ Superuser '{username}' created successfully!")

if __name__ == "__main__":
    create_admin()