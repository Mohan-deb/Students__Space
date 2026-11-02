try:
    from werkzeug.security import check_password_hash
    from exceptions import common_exceptions as ce
    from database.db import get_db
except FileNotFoundError:
      pass

class StudentDatabase():

    """
    Student Operations Done here
    """
    
    def insert_student(self, data):
        """
        Method to Insert student in database
        """
    
        database = get_db()

        database.execute(
        """
        INSERT INTO students
        (
            pin,
            name,
            mail,
            branch,
            year,
            semester,
            password_hash
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        data
        )

        database.commit()


    def get_student_by_email(self, email):
        """
        This method for checking the student existing or not
        in the database by using student email
        """

        database = get_db()

        student = database.execute(
            """
            SELECT *
            FROM students
            WHERE mail = ?
            """,
            (email,)
        ).fetchone()

        return student


    def check_student(self, email, password):

        """
        Method to check whether student exist or not
        """

        student = self.get_student_by_email(email)

        if student is None:
            raise ce.EmailNotFound

        if not check_password_hash(student[7], password):
            raise ce.PasswordIncorrect
