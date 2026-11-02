try: 
    from exceptions import common_exceptions as ce
    from database.db import get_db
    from werkzeug.security import check_password_hash
except FileNotFoundError:
    pass
except ModuleNotFoundError:
    pass

class TeacherDatabase():

    """
    Handles teacher database operations.
    """

    def insert_teacher(self):
        """
        Method to Insert teacher details.
        """
        database = get_db()

        database.execute(
        """
        INSERT INTO teachers
        (
            name,
            mail,
            branch,
            password_hash
        )
        VALUES (?, ?, ?, ?)
        """ 
        )

        database.commit()


    def get_teacher_by_email(self, email):
        """
        Get the teacher row from database
        by email
        """

        database = get_db()

        teacher =database.execute(
            """
            SELECT *
            FROM teachers
            WHERE mail = ?
            """,
            (email,)
            ).fetchone()

        return teacher


    def check_teacher(self, email, password):
        """
        Method to check teacher exist or not
        with teacher entered data.
        """

        teacher = self.get_teacher_by_email(email)

        if teacher is None:
            raise ce.EmailNotFound

        if not check_password_hash(teacher[4], password):
            raise ce.PasswordIncorrect