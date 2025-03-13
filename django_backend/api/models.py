from django.db import models

class User(models.Model):
    username = models.CharField(max_length=50, unique=True)
    password_hash = models.CharField(max_length=255)
    
    def __str__(self):
        return self.username

class Student(models.Model):
    name = models.CharField(max_length=100)
    usn = models.CharField(max_length=50, unique=True)
    semester = models.CharField(max_length=10)
    section = models.CharField(max_length=10)
    
    def __str__(self):
        return f"{self.name} ({self.usn})"

class AttendanceRecord(models.Model):
    date = models.DateField(auto_now_add=True)
    semester = models.CharField(max_length=10)
    section = models.CharField(max_length=10)
    subject = models.CharField(max_length=100)
    sheet_id = models.CharField(max_length=255, blank=True, null=True)
    file_path = models.CharField(max_length=255, blank=True, null=True)
    
    def __str__(self):
        return f"{self.subject} - {self.date} - Sem {self.semester} Sec {self.section}"

class AttendanceDetail(models.Model):
    record = models.ForeignKey(AttendanceRecord, on_delete=models.CASCADE, related_name='details')
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    status = models.BooleanField(default=False)  # False for absent, True for present
    
    class Meta:
        unique_together = ('record', 'student')
    
    def __str__(self):
        status = "Present" if self.status else "Absent"
        return f"{self.student.name} - {status}"