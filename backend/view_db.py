import os
import sqlite3
import django


import sqlite3  
cx = sqlite3.connect("test.db")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'telemedicine.settings')
django.setup()

from django.db import connection

def view_database():
    print("=" * 60)
    print("📊 DATABASE VIEWER (via Python)")
    print("=" * 60)
    
    cursor = connection.cursor()
    
    # Show all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = cursor.fetchall()
    
    print("\n📋 TABLES:")
    print("-" * 40)
    for table in tables:
        print(f"  📄 {table[0]}")
    
    # Show Users
    print("\n👤 USERS:")
    print("-" * 40)
    cursor.execute("SELECT id, username, email, is_staff, is_superuser, is_active FROM auth_user;")
    for row in cursor.fetchall():
        print(f"ID: {row[0]} | {row[1]} | {row[2]} | Staff: {row[3]} | Superuser: {row[4]} | Active: {row[5]}")
    
    # Show Patients
    print("\n🏥 PATIENTS:")
    print("-" * 40)
    try:
        cursor.execute("""
            SELECT p.id, u.username, p.phone, p.blood_type, p.created_at 
            FROM api_patientprofile p
            JOIN auth_user u ON p.user_id = u.id;
        """)
        for row in cursor.fetchall():
            print(f"ID: {row[0]} | {row[1]} | Phone: {row[2]} | Blood: {row[3]} | Created: {row[4]}")
    except:
        print("No patients found or table doesn't exist")
    
    # Show Doctors
    print("\n👨‍⚕️ DOCTORS:")
    print("-" * 40)
    try:
        cursor.execute("""
            SELECT d.id, u.username, d.specialization, d.hospital, d.consultation_fee, d.rating 
            FROM api_doctorprofile d
            JOIN auth_user u ON d.user_id = u.id;
        """)
        for row in cursor.fetchall():
            print(f"ID: {row[0]} | {row[1]} | {row[2]} | {row[3]} | Fee: ${row[4]} | Rating: {row[5]}★")
    except:
        print("No doctors found or table doesn't exist")
    
    # Show Appointments
    print("\n📅 APPOINTMENTS:")
    print("-" * 40)
    try:
        cursor.execute("""
            SELECT a.appointment_id, a.appointment_date, a.start_time, a.status, 
                   p.user_id, d.user_id
            FROM api_appointment a
            JOIN api_patientprofile p ON a.patient_id = p.id
            JOIN api_doctorprofile d ON a.doctor_id = d.id
            LIMIT 10;
        """)
        for row in cursor.fetchall():
            print(f"ID: {row[0]} | Date: {row[1]} | Time: {row[2]} | Status: {row[3]}")
    except:
        print("No appointments found or table doesn't exist")
    
    # Counts
    print("\n📊 COUNTS:")
    print("-" * 40)
    cursor.execute("SELECT COUNT(*) FROM auth_user;")
    print(f"Users: {cursor.fetchone()[0]}")
    
    try:
        cursor.execute("SELECT COUNT(*) FROM api_patientprofile;")
        print(f"Patients: {cursor.fetchone()[0]}")
    except:
        print("Patients: 0")
    
    try:
        cursor.execute("SELECT COUNT(*) FROM api_doctorprofile;")
        print(f"Doctors: {cursor.fetchone()[0]}")
    except:
        print("Doctors: 0")
    
    try:
        cursor.execute("SELECT COUNT(*) FROM api_appointment;")
        print(f"Appointments: {cursor.fetchone()[0]}")
    except:
        print("Appointments: 0")

if __name__ == "__main__":
    view_database()