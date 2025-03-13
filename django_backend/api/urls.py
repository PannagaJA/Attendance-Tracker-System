from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('enroll/', views.enroll_student, name='enroll'),
    path('take-attendance/', views.take_attendance, name='take_attendance'),
    path('attendance-files/', views.get_attendance_files, name='attendance_files'),
    path('generate-statistics/', views.generate_statistics, name='generate_statistics'),
    path('download/<str:filename>/', views.download_file, name='download_file'),
]