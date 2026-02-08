# create_test_users_standalone.py
import os
import django

# --- CRUCIAL DJANGO SETUP ---
# This block allows this script to access your Django models
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'urja_setu_backend.settings')
django.setup()
# -----------------------------

from django.contrib.auth.models import User
from api.models import Profile

def create_users():
    """
    Creates test users for each role: Citizen, Admin, and Technician.
    """
    users_data = [
        {
            'email': 'testcitizen@example.com',
            'password': 'Password123',
            'profile': {
                'full_name': 'Test Citizen',
                'phone_number': '9000000001',
                'role': 'citizen'
            }
        },
        {
            'email': 'testadmin@example.com',
            'password': 'Password123',
            'profile': {
                'full_name': 'Test Admin',
                'phone_number': '9000000002',
                'role': 'admin',
                'department': 'Operations',
                'gender': 'other'
            }
        },
        {
            'email': 'testtech@example.com',
            'password': 'Password123',
            'profile': {
                'full_name': 'Test Technician',
                'phone_number': '9000000003',
                'role': 'technician',
                'specialization': 'Line Repair',
                'gender': 'male'
            }
        }
    ]

    for user_data in users_data:
        email = user_data['email']
        if User.objects.filter(email=email).exists():
            print(f'User with email {email} already exists. Skipping.')
            continue

        # Create the user
        user = User.objects.create_user(
            username=email,
            email=email,
            password=user_data['password']
        )
        
        # Create the profile
        profile_info = user_data['profile']
        Profile.objects.create(
            user=user,
            full_name=profile_info['full_name'],
            phone_number=profile_info['phone_number'],
            role=profile_info['role'],
            gender=profile_info.get('gender'),
            department=profile_info.get('department'),
            specialization=profile_info.get('specialization')
        )
        
        print(f'Successfully created {profile_info["role"]} user: {email}')

# --- This makes the script runnable ---
if __name__ == '__main__':
    print("Starting user creation script...")
    create_users()
    print("Script finished.")