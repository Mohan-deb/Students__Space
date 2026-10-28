from exceptions import students_exceptions as se
from pathlib import Path
import sqlite3 as s
from werkzeug.security import check_password_hash

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

        self.curser.execute("""
            INSERT INTO students
            (pin, name, mail, branch, year, semester, password_hash)
            VALUES(?, ?, ?, ?, ?, ?, ?)
            """,data)
        
        
        self.database_commit()


    def check_student(self, data):
        """This method for checking the student existing or not in the database"""

        self.curser.execute("""
            SELECT password_hash FROM students WHERE mail = ? 
        """,(data[0],))

        # get the hashed password from the database
        hashed_password = self.curser.fetchone()
        user_entered_password = data[1]

        # if password there then check that password
        if hashed_password:
            # if password doesn't match then raise execption
            if not check_password_hash(hashed_password[0], data[1]):
                raise se.StudentPasswordIncorrect
        else:
            raise se.StudentEmailNotFound


    def database_commit(self):
        """This method to Commit the database"""
        self.connect.commit()


    def close_database(self):
        """Close the Database Connection"""
        self.connect.close()
