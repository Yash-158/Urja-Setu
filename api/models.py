import uuid
from django.db import models
from django.contrib.auth.models import User

# ================================================================
# DYNAMIC PATH FUNCTIONS FOR IMAGE UPLOADS
# ================================================================

def get_report_image_path(instance, filename):
    """
    Generates a unique path for a citizen's report image.
    e.g., reports/a1b2c3d4/citizen/image.jpg
    """
    return f'reports/{instance.upload_id}/citizen/{filename}'

def get_update_image_path(instance, filename):
    """
    Generates a unique path for a technician's update image.
    e.g., reports/a1b2c3d4/technician/image.jpg
    """
    return f'reports/{instance.report.upload_id}/technician/{filename}'


# ================================================================
# 1. PROFILES MODEL
# ================================================================
class Profile(models.Model):
    class Role(models.TextChoices):
        CITIZEN = 'citizen', 'Citizen'
        ADMIN = 'admin', 'Admin'
        TECHNICIAN = 'technician', 'Technician'

    class Gender(models.TextChoices):
        MALE = 'male', 'Male'
        FEMALE = 'female', 'Female'
        OTHER = 'other', 'Other'

    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    full_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.CITIZEN)
    updated_at = models.DateTimeField(auto_now=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, null=True, blank=True)
    employee_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)
    specialization = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return self.user.username

# ================================================================
# 2. REPORTS MODEL
# ================================================================
class Report(models.Model):
    CATEGORY_CHOICES = [
        ('Safety Hazard', 'Safety Hazard'),
        ('Maintenance', 'Maintenance'),
        ('Power Theft', 'Power Theft'),
        ('Other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('Pending Analysis', 'Pending Analysis'),
        ('Received', 'Received'),
        ('Assigned', 'Assigned'),
        ('In Progress', 'In Progress'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
    ]
    PRIORITY_CHOICES = [
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    ]

    # --- Fields ---
    upload_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    citizen = models.ForeignKey(User, related_name='submitted_reports', on_delete=models.CASCADE)
    assigned_technician = models.ForeignKey(User, related_name='assigned_reports', on_delete=models.SET_NULL, null=True, blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, blank=True, null=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to=get_report_image_path, null=True, blank=True, max_length=1000)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    address = models.TextField(blank=True, null=True) # <-- NEW: Human-readable address
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Received')
    ai_classification = models.CharField(max_length=100, blank=True, null=True)
    ai_priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, blank=True, null=True)
    ai_suggestion = models.TextField(blank=True, null=True) # <-- NEW FIELD
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True) # <-- NEW: Tracks any update
    resolved_at = models.DateTimeField(null=True, blank=True) # <-- NEW: Tracks when it was resolved

    def __str__(self):
        return f"Report #{self.id} by {self.citizen.username}"

# ================================================================
# 3. SUGGESTIONS MODEL
# ================================================================
class Suggestion(models.Model):
    class Status(models.TextChoices): # <-- NEW
        SUBMITTED = 'Submitted', 'Submitted'
        IN_REVIEW = 'In Review', 'In Review'
        IMPLEMENTED = 'Implemented', 'Implemented'
        ARCHIVED = 'Archived', 'Archived'

    citizen = models.ForeignKey(User, on_delete=models.CASCADE)
    suggestion_text = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED) # <-- NEW
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True) # <-- NEW

    def __str__(self):
        return f"Suggestion by {self.citizen.username}"
# ================================================================
# 4. REPORT UPDATES MODEL
# ================================================================
class ReportUpdate(models.Model):
    report = models.ForeignKey(Report, on_delete=models.CASCADE)
    technician = models.ForeignKey(User, on_delete=models.CASCADE)
    remark = models.TextField()
    image = models.ImageField(upload_to=get_update_image_path, null=True, blank=True, max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True) # <-- NEW

    def __str__(self):
        return f"Update on Report #{self.report.id} by {self.technician.username}"