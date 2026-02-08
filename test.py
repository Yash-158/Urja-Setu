# populate_db.py
import os
import django
import random
from datetime import timedelta
from django.utils import timezone

# --- CRUCIAL DJANGO SETUP ---
# This block allows this script to access your Django models
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'urja_setu_backend.settings')
django.setup()
# -----------------------------

from django.contrib.auth.models import User
from api.models import Profile, Report, Suggestion, ReportUpdate

# --- CONFIGURATION: ADD YOUR DUMMY IMAGE URLS HERE ---
# Add at least 3-4 different image URLs for variety.
# You can get these from a site like imgur.com or use any public image URL.
IMAGE_URLS = [
    "1.jpg", # Placeholder: A pole with some wires
    "2.jpg", # Placeholder: A different pole
    "3.jpg", # Placeholder: A transformer
    "4.jpg", # Placeholder: Tree branches near wires
]

def clean_database():
    """Deletes all existing data for a clean slate."""
    print("Cleaning database...")
    ReportUpdate.objects.all().delete()
    Suggestion.objects.all().delete()
    Report.objects.all().delete()
    User.objects.all().delete() # Deleting users will cascade and delete profiles
    print("Database cleaned.")

def create_users():
    """Creates 2 users for each role."""
    print("Creating users...")
    users_data = [
        # Citizens
        {'email': 'citizen1@example.com', 'full_name': 'Priya Singh', 'phone': '9111111111', 'role': 'citizen'},
        {'email': 'citizen2@example.com', 'full_name': 'Rohan Mehta', 'phone': '9222222222', 'role': 'citizen'},
        # Admins
        {'email': 'admin1@example.com', 'full_name': 'Admin One', 'phone': '9333333333', 'role': 'admin'},
        {'email': 'admin2@example.com', 'full_name': 'Admin Two', 'phone': '9444444444', 'role': 'admin'},
        # Technicians
        {'email': 'tech1@example.com', 'full_name': 'Suresh Kumar', 'phone': '9555555555', 'role': 'technician', 'spec': 'Line Repair'},
        {'email': 'tech2@example.com', 'full_name': 'Vikram Patel', 'phone': '9666666666', 'role': 'technician', 'spec': 'Transformer Maintenance'},
    ]

    created_users = {'citizens': [], 'admins': [], 'technicians': []}

    for data in users_data:
        if User.objects.filter(email=data['email']).exists():
            print(f"User {data['email']} already exists. Skipping.")
            continue

        user = User.objects.create_user(username=data['email'], email=data['email'], password='Password123')
        Profile.objects.create(
            user=user,
            full_name=data['full_name'],
            phone_number=data['phone'],
            role=data['role'],
            specialization=data.get('spec')
        )
        
        if data['role'] == 'citizen': created_users['citizens'].append(user)
        elif data['role'] == 'admin': created_users['admins'].append(user)
        elif data['role'] == 'technician': created_users['technicians'].append(user)
        
        print(f"  - Created {data['role']}: {data['email']}")
        
    return created_users

def create_suggestions(citizens):
    """Creates 3 suggestions for each citizen."""
    print("Creating suggestions...")
    for citizen in citizens:
        for i in range(3):
            Suggestion.objects.create(
                citizen=citizen,
                suggestion_text=f"This is suggestion #{i+1} from {citizen.profile.full_name}. It's about improving service response time."
            )
    print(f"  - Created {len(citizens) * 3} suggestions.")

def create_reports(citizens):
    """Creates 3 reports for each citizen."""
    print("Creating reports...")
    created_reports = []
    descriptions = [
        "Sparks seen coming from the transformer near the main park.",
        "A large tree branch has fallen on the power lines on Gandhi Road.",
        "The streetlight on the corner of my street has been out for 3 days.",
        "An electric pole is leaning dangerously after the storm.",
        "The meter box outside my building appears to be broken and open.",
        "I noticed wires hanging very low over the footpath, it seems unsafe."
    ]

    for citizen in citizens:
        for i in range(3):
            report = Report.objects.create(
                citizen=citizen,
                category=random.choice(['Safety Hazard', 'Maintenance']),
                description=random.choice(descriptions),
                image=random.choice(IMAGE_URLS), # Using URL, but Django's ImageField can handle it
                latitude=round(random.uniform(23.0, 23.1), 6),
                longitude=round(random.uniform(72.5, 72.6), 6),
                address=f"{random.randint(10, 100)} Random Street, Ahmedabad",
                status='Received'
            )
            created_reports.append(report)
    print(f"  - Created {len(created_reports)} reports.")
    return created_reports

def assign_reports(reports, technicians):
    """Assigns reports to technicians."""
    if not technicians:
        print("No technicians found to assign reports.")
        return
    print("Assigning reports to technicians...")
    for i, report in enumerate(reports):
        technician_to_assign = technicians[i % len(technicians)]
        report.assigned_technician = technician_to_assign
        report.status = 'Assigned'
        report.save()
    print(f"  - Assigned {len(reports)} reports.")

def add_remarks(reports):
    """Adds remarks from technicians to their assigned reports."""
    print("Adding technician remarks...")
    remarks = [
        "Acknowledged. On my way to the site for initial inspection.",
        "Site inspected. The issue is confirmed. Required equipment has been requested.",
        "Work is in progress. Estimated time to resolution is 2 hours.",
        "The issue has been resolved. Closing the task from my end."
    ]
    for report in reports:
        if report.assigned_technician:
            # Add an initial remark
            ReportUpdate.objects.create(
                report=report,
                technician=report.assigned_technician,
                remark=random.choice(remarks)
            )
    print(f"  - Added remarks to {len(reports)} reports.")

def main():
    """Main function to run the data population script."""
    clean_database()
    users = create_users()
    if users['citizens']:
        create_suggestions(users['citizens'])
        reports = create_reports(users['citizens'])
        if reports and users['technicians']:
            assign_reports(reports, users['technicians'])
            add_remarks(reports)
    print("\n✅ Dummy data population complete!")

# --- This makes the script runnable ---
if __name__ == '__main__':
    main()