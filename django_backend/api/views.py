import os
import cv2
import dlib
import pickle
import numpy as np
from datetime import datetime
from django.conf import settings
from django.http import JsonResponse, FileResponse
from django.contrib.auth.hashers import check_password, make_password
from rest_framework.decorators import api_view
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.service_account import Credentials
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from .models import User, Student, AttendanceRecord, AttendanceDetail

# Initialize face detection and recognition models.
try:
    face_detector = dlib.get_frontal_face_detector()
    shape_predictor = dlib.shape_predictor(os.path.join(settings.BASE_DIR, 'shape_predictor_68_face_landmarks.dat'))
    face_recognizer = dlib.face_recognition_model_v1(os.path.join(settings.BASE_DIR, 'dlib_face_recognition_resnet_model_v1.dat'))
except Exception as e:
    print(f"Error loading face recognition models: {e}")
    face_detector = None
    shape_predictor = None
    face_recognizer = None

# Google Sheets API setup
SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
try:
    creds = Credentials.from_service_account_file(settings.GOOGLE_CREDENTIALS_FILE, scopes=SCOPES)
    sheets_service = build('sheets', 'v4', credentials=creds)
    drive_service = build('drive', 'v3', credentials=creds)
except Exception as e:
    print(f"Error setting up Google API: {e}")
    sheets_service = None
    drive_service = None

# Ensure the pickle file exists
if not os.path.exists(settings.PICKLE_FILE):
    with open(settings.PICKLE_FILE, 'wb') as f:
        pass  # Create an empty pickle file

def compute_face_distance(encoding1, encoding2):
    """Compute the Euclidean distance between two face encodings."""
    return np.linalg.norm(encoding1 - encoding2)

def is_same_person(known_encodings, test_encoding, threshold=0.4):
    """
    Determine if the test encoding matches any of the known encodings.
    Using a stricter threshold (0.4 instead of 0.6) for better accuracy.
    Returns True if there's a match, False otherwise.
    """
    if not known_encodings:
        return False
    
    # Calculate distances to all known encodings
    distances = [compute_face_distance(test_encoding, enc) for enc in known_encodings]
    
    # Get the minimum distance
    min_distance = min(distances)
    
    # Check if the minimum distance is below the threshold
    # Also require at least 2 close matches if there are multiple encodings
    close_matches = sum(1 for d in distances if d < threshold)
    
    if len(known_encodings) > 1:
        return min_distance < threshold and close_matches >= 2
    else:
        return min_distance < threshold

def load_all_students():
    """Load all students from the pickle file."""
    students = []
    try:
        with open(settings.PICKLE_FILE, 'rb') as f:
            while True:
                try:
                    student = pickle.load(f)
                    students.append(student)
                except EOFError:
                    break
    except FileNotFoundError:
        pass
    return students

@api_view(['POST'])
def login_view(request):
    """Handle user login."""
    username = request.data.get('username')
    password = request.data.get('password')
    
    # Check if this is the default user (for initial setup)
    if username == '1AM22CI' and password == 'CI@2024':
        return Response({'success': True})
    
    # Check against database users
    try:
        user = User.objects.get(username=username)
        if check_password_hash(user.password_hash, password):
            return Response({'success': True})
    except User.DoesNotExist:
        pass
    
    return Response({'success': False, 'message': 'Invalid credentials'})

@api_view(['POST'])
def enroll_student(request):
    """Enroll a student with face recognition."""
    if face_detector is None or shape_predictor is None or face_recognizer is None:
        return Response({
            'success': False,
            'message': 'Face recognition models not loaded. Please check server configuration.'
        })
    
    name = request.data.get('name')
    usn = request.data.get('usn')
    semester = request.data.get('semester')
    section = request.data.get('section')
    files = request.FILES.getlist('photos')
    
    if not all([name, usn, semester, section, files]):
        return Response({
            'success': False,
            'message': 'Missing required fields'
        })
    
    encodings = []
    
    # Process each photo and extract face encodings
    for file in files:
        img_bytes = file.read()
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Convert to RGB (dlib expects RGB images)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Detect faces
        faces = face_detector(rgb_img)
        
        if not faces:
            return Response({
                'success': False,
                'message': f'No face detected in one of the uploaded images. Please ensure clear, well-lit photos.'
            })
        
        if len(faces) > 1:
            return Response({
                'success': False,
                'message': f'Multiple faces detected in one image. Please upload photos with only the student\'s face.'
            })
        
        for face in faces:
            shape = shape_predictor(rgb_img, face)
            face_encoding = np.array(face_recognizer.compute_face_descriptor(rgb_img, shape))
            encodings.append(face_encoding)
    
    if not encodings:
        return Response({
            'success': False,
            'message': 'No valid face encodings could be generated. Please try again with clearer photos.'
        })
    
    # Load existing students
    existing_students = load_all_students()
    
    # Check if this face already exists in the system
    for student in existing_students:
        if student['usn'] != usn:  # Skip the current student's previous encodings
            for encoding in encodings:
                if is_same_person(student['encodings'], encoding):
                    return Response({
                        'success': False,
                        'message': f'This face appears to match an existing student ({student["name"]}). Please verify the student\'s identity.'
                    })
    
    # Update or create student
    student_exists = False
    for student in existing_students:
        if student['usn'] == usn:
            student['name'] = name
            student['encodings'] = encodings
            student['semester'] = semester
            student['section'] = section
            student_exists = True
            break
         # If student doesn't exist, add new entry
    if not student_exists:
        existing_students.append({
            "name": name,
            "usn": usn,
            "encodings": encodings,
            "semester": semester,
            "section": section
        })
    
    # Save all students back to pickle file
    with open(settings.PICKLE_FILE, 'wb') as f:
        for student in existing_students:
            pickle.dump(student, f)
    
    # Update or create student in database
    student_obj, created = Student.objects.update_or_create(
        usn=usn,
        defaults={
            'name': name,
            'semester': semester,
            'section': section
        }
    )
    
    message = f"Student {'updated' if student_exists else 'enrolled'} successfully"
    return Response({
        'success': True,
        'message': message
    })

@api_view(['POST'])
def take_attendance(request):
    """Take attendance using face recognition."""
    if face_detector is None or shape_predictor is None or face_recognizer is None:
        return Response({
            'success': False,
            'message': 'Face recognition models not loaded. Please check server configuration.'
        })
    
    if sheets_service is None or drive_service is None:
        return Response({
            'success': False,
            'message': 'Google API not configured. Please check server configuration.'
        })
    
    subject = request.data.get('subject')
    section = request.data.get('section')
    semester = request.data.get('semester')
    files = request.FILES.getlist('class_images')
    
    if not all([subject, section, semester, files]):
        return Response({
            'success': False,
            'message': 'Missing required fields'
        })
    
    # Get or create Google Sheet
    sheet_id = get_google_sheet_id(subject, section, semester)
    if not sheet_id:
        sheet_id = create_google_sheet(subject, section, semester)
    
    # Create attendance record in database
    attendance_record = AttendanceRecord.objects.create(
        semester=semester,
        section=section,
        subject=subject,
        sheet_id=sheet_id
    )
    
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    attendance_file = f"attendance_{semester}_{subject}_{section}.txt"
    file_path = os.path.join(settings.STUDENT_DATA_PATH, attendance_file)
    attendance_record.file_path = file_path
    attendance_record.save()
    
    present_students = set()  # Use set to avoid duplicates
    
    # Load all enrolled students first
    enrolled_students = load_all_students()
    class_students = [s for s in enrolled_students if s['semester'] == semester and s['section'] == section]
    
    # Process each class photo
    for file in files:
        img_bytes = file.read()
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        faces = face_detector(rgb_img)
        
        # Process each detected face
        for face in faces:
            shape = shape_predictor(rgb_img, face)
            face_encoding = np.array(face_recognizer.compute_face_descriptor(rgb_img, shape))
            
            # Compare with each enrolled student
            for student in class_students:
                if is_same_person(student['encodings'], face_encoding):
                    present_students.add((student['name'], student['usn']))
                    break
    
    # Get absent students
    all_class_students = [(student['name'], student['usn']) for student in class_students]
    absent_students = [(name, usn) for name, usn in all_class_students if (name, usn) not in present_students]
    
    # Update attendance in Google Sheets
    update_attendance_in_sheet(sheet_id, list(present_students), absent_students, timestamp)
    
    # Save attendance in text file
    with open(file_path, 'a') as report:
        report.write(f"\n--- Attendance Session: {timestamp} ---\n")
        report.write("Present Students: " + ", ".join([name for name, _ in present_students]) + "\n")
        report.write("Absent Students: " + ", ".join([name for name, _ in absent_students]) + "\n")
    
    # Save attendance details in database
    for name, usn in present_students:
        try:
            student = Student.objects.get(usn=usn)
            AttendanceDetail.objects.create(
                record=attendance_record,
                student=student,
                status=True  # Present
            )
        except Student.DoesNotExist:
            pass
    
    for name, usn in absent_students:
        try:
            student = Student.objects.get(usn=usn)
            AttendanceDetail.objects.create(
                record=attendance_record,
                student=student,
                status=False  # Absent
            )
        except Student.DoesNotExist:
            pass
    
    sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit?usp=sharing"
    
    return Response({
        'success': True,
        'message': f"Attendance taken for {semester} {subject} ({section})",
        'present_students': [f"{name} ({usn})" for name, usn in present_students],
        'absent_students': [f"{name} ({usn})" for name, usn in absent_students],
        'sheet_url': sheet_url
    })

@api_view(['GET'])
def get_attendance_files(request):
    """Get list of attendance files for statistics."""
    semester = request.query_params.get('semester')
    section = request.query_params.get('section')
    subject = request.query_params.get('subject')
    
    if not all([semester, section, subject]):
        return Response({
            'success': False,
            'message': 'Missing required parameters'
        })
    
    # Get attendance records from database
    records = AttendanceRecord.objects.filter(
        semester=semester,
        section=section,
        subject=subject
    ).order_by('-date')
    
    files = []
    for record in records:
        if record.file_path and os.path.exists(record.file_path):
            file_name = os.path.basename(record.file_path)
            files.append({
                'id': str(record.id),
                'name': f"{record.date.strftime('%Y-%m-%d')} - {subject}"
            })
    
    return Response({
        'success': True,
        'files': files
    })

@api_view(['POST'])
def generate_statistics(request):
    """Generate attendance statistics and PDF report."""
    file_id = request.data.get('file_id')
    
    if not file_id:
        return Response({
            'success': False,
            'message': 'Missing file ID'
        })
    
    try:
        record = AttendanceRecord.objects.get(id=file_id)
        file_path = record.file_path
        
        if not file_path or not os.path.exists(file_path):
            return Response({
                'success': False,
                'message': 'Attendance file not found'
            })
        
        # Parse attendance records
        attendance_records = parse_attendance(file_path)
        if not attendance_records:
            return Response({
                'success': False,
                'message': 'Failed to parse attendance file'
            })
        
        # Calculate statistics
        stats = calculate_statistics(attendance_records)
        
        # Generate PDF
        pdf_filename = f"attendance_report_{record.semester}_{record.subject}_{record.section}.pdf"
        pdf_path = os.path.join(settings.MEDIA_ROOT, pdf_filename)
        os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
        
        generate_pdf(stats, pdf_path)
        
        # Prepare response data
        above_75 = []
        below_75 = []
        
        for student, percentage in stats.items():
            if percentage >= 75:
                above_75.append({'student': student, 'percentage': percentage})
            else:
                below_75.append({'student': student, 'percentage': percentage})
        
        # Sort by percentage (descending)
        above_75.sort(key=lambda x: x['percentage'], reverse=True)
        below_75.sort(key=lambda x: x['percentage'], reverse=True)
        
        pdf_url = f"/media/{pdf_filename}"
        
        return Response({
            'success': True,
            'above_75': above_75,
            'below_75': below_75,
            'pdf_url': pdf_url
        })
        
    except AttendanceRecord.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Attendance record not found'
        })
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error generating statistics: {str(e)}'
        })

def download_file(request, filename):
    """Download a file."""
    file_path = os.path.join(settings.MEDIA_ROOT, filename)
    if os.path.exists(file_path):
        return FileResponse(open(file_path, 'rb'), as_attachment=True)
    return JsonResponse({'error': 'File not found'}, status=404)

# Helper functions for Google Sheets
def get_google_sheet_id(subject, section, semester):
    """Retrieve the Google Sheet ID for the given semester, subject, and section."""
    sheet_id_file = os.path.join(settings.STUDENT_DATA_PATH, f'{subject}_{section}_{semester}_sheet_id.txt')
    if os.path.exists(sheet_id_file):
        with open(sheet_id_file, 'r') as file:
            sheet_id = file.read().strip()
        
        # Verify if the sheet exists by making a request to read the sheet's metadata
        try:
            sheets_service.spreadsheets().get(spreadsheetId=sheet_id).execute()
            return sheet_id  # Sheet exists, return the ID
        except HttpError as e:
            if e.resp.status == 404:
                print(f"Sheet with ID {sheet_id} not found. Creating a new sheet...")
                return create_google_sheet(subject, section, semester)
            else:
                raise  # Reraise the exception for other HTTP errors
    else:
        print("Sheet ID file not found. Creating a new sheet...")
        return create_google_sheet(subject, section, semester)

def create_google_sheet(subject, section, semester):
    """Create a new Google Sheet and save its ID."""
    try:
        spreadsheet = {
            'properties': {'title': f'Attendance_{semester}_{subject}_{section}'},
            'sheets': [
                {'properties': {'title': 'Present'}},
                {'properties': {'title': 'Absent'}}
            ]
        }
        # Create the sheet
        sheet = sheets_service.spreadsheets().create(body=spreadsheet).execute()
        sheet_id = sheet['spreadsheetId']
        
        # Save the sheet ID to a file for future use
        sheet_id_file = os.path.join(settings.STUDENT_DATA_PATH, f'{subject}_{section}_{semester}_sheet_id.txt')
        with open(sheet_id_file, 'w') as file:
            file.write(sheet_id)
        
        # Make the sheet viewable by anyone with the link (view only)
        drive_service.permissions().create(
            fileId=sheet_id,
            body={'type': 'anyone', 'role': 'reader'}
        ).execute()
        
        return sheet_id
    except HttpError as err:
        print(f"Error creating or sharing the sheet: {err}")
        return None

def update_attendance_in_sheet(sheet_id, present_students, absent_students, timestamp):
    """Update attendance data in Google Sheet."""
    range_present = 'Present!A1'
    range_absent = 'Absent!A1'
    values_present = [[timestamp] + [f"{name} ({usn})" for name, usn in present_students]]
    values_absent = [[timestamp] + [f"{name} ({usn})" for name, usn in absent_students]]

    # Append the attendance data without overwriting existing data
    sheets_service.spreadsheets().values().append(
        spreadsheetId=sheet_id,
        range=range_present,
        valueInputOption='RAW',
        body={'values': values_present}
    ).execute()

    # Append absent students
    sheets_service.spreadsheets().values().append(
        spreadsheetId=sheet_id,
        range=range_absent,
        valueInputOption='RAW',
        body={'values': values_absent}
    ).execute()

# Helper functions for attendance statistics
def parse_attendance(file_path):
    """Parse attendance file and extract records."""
    try:
        attendance_records = []
        with open(file_path, "r", encoding="utf-8") as file:
            lines = file.readlines()
            session_date = None
            present = []
            absent = []

            for line in lines:
                if line.startswith("--- Attendance Session:"):
                    if session_date:
                        attendance_records.append({"date": session_date, "present": present, "absent": absent})
                    timestamp = line.split(": ")[1].strip().split(" ")[0]
                    session_date = datetime.strptime(timestamp, "%Y-%m-%d")
                    present = []
                    absent = []
                elif line.startswith("Present Students:"):
                    present = [student.strip() for student in line.split(":")[1].split(",") if student.strip()]
                elif line.startswith("Absent Students:"):
                    absent = [student.strip() for student in line.split(":")[1].split(",") if student.strip()]

            # Add the last session's attendance
            if session_date:
                attendance_records.append({"date": session_date, "present": present, "absent": absent})

        return attendance_records

    except Exception as e:
        print(f"Error parsing attendance file: {e}")
        return []

def calculate_statistics(attendance_records):
    """Calculate attendance percentages for each student."""
    total_sessions = len(attendance_records)
    if total_sessions == 0:
        return {}

    attendance = {}
    for session in attendance_records:
        for student in session["present"]:
            attendance[student] = attendance.get(student, 0) + 1
        for student in session["absent"]:
            attendance.setdefault(student, 0)  # Ensure absent students are included

    stats = {student: (count / total_sessions) * 100 for student, count in attendance.items()}
    return stats

def generate_pdf(stats, output_file):
    """Generate PDF report with attendance statistics."""
    c = canvas.Canvas(output_file, pagesize=letter)
    width, height = letter

    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(220, height - 40, "Attendance Statistics")

    # Column Headers
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 80, "Above 75% Attendance")
    c.drawString(350, height - 80, "Below 75% Attendance")

    # Draw the lists of students
    c.setFont("Helvetica", 10)

    above_75 = [(student, percentage) for student, percentage in stats.items() if percentage >= 75]
    below_75 = [(student, percentage) for student, percentage in stats.items() if percentage < 75]

    y_position_above = height - 100
    y_position_below = height - 100

    # Printing Above 75% Attendance
    for student, percentage in above_75:
        c.drawString(50, y_position_above, f"{student}: {percentage:.2f}%")
        y_position_above -= 15
        if y_position_above < 50:
            c.showPage()
            c.setFont("Helvetica", 10)
            y_position_above = height - 50

    # Printing Below 75% Attendance
    for student, percentage in below_75:
        c.drawString(350, y_position_below, f"{student}: {percentage:.2f}%")
        y_position_below -= 15
        if y_position_below < 50:
            c.showPage()
            c.setFont("Helvetica", 10)
            y_position_below = height - 50

    c.save()