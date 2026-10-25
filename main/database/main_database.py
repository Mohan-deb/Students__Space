import threading
from pathlib import Path
import sqlite3 as s

class StudentDatabase:
    """Database creation of the Tables of the users"""

    def __init__(self):

        BASE_DIR = Path(__file__).resolve().parent
        self.database_path = BASE_DIR / "students_space.db"
        
        
    def connection(self):
        """Method to build connection to sqlite"""

        self.connect = s.connect(self.database_path)
        self.curser = self.connect.cursor()

    def create_student(self):

        """Create the student table"""

        print("Create student Thread : ",threading.get_ident())

        self.curser.execute("""
                CREATE TABLE IF NOT EXISTS students (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pin TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    mail TEXT UNIQUE NOT NULL,
                    branch TEXT NOT NULL,
                    year TEXT NOT NULL,
                    semester TEXT NOT NULL,
                    password_hash TEXT NOT NULL
                )
        """)

    def insert_student(self, data):
        "Method to insert the student data"

        print("Insert Student Thread : ", threading.get_ident())

        self.curser.execute("""
            INSERT INTO students
            (pin, name, mail, branch, year, semester, password_hash)
            VALUES(?, ?, ?, ?, ?, ?, ?)
            """,data)
        
        
        self.connect.commit()


    def close_database(self):
        self.connect.close()
