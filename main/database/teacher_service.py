try: 
    from exceptions import common_exceptions as ce
    from database.db import get_db
    from werkzeug.security import check_password_hash, generate_password_hash
except FileNotFoundError:
    pass
except ModuleNotFoundError:
    pass

class TeacherService():

    """
    Handles teacher database operations.
    """

    def insert_teacher(self, teacher_name, email, branch, password):
        """
        Create a teacher account with a hashed password.
        """
        database = get_db()

        database.execute(
        """
        INSERT INTO teachers
        (
            teacher_name,
            mail,
            branch,
            password_hash
        )
        VALUES (?, ?, ?, ?)
        """,
        (teacher_name, email, branch, generate_password_hash(password))
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
            WHERE lower(mail) = lower(?)
            """,
            (email,)
            ).fetchone()

        return teacher

    def get_teacher_by_id(self, teacher_id):
        database = get_db()
        teacher = database.execute(
            """
            SELECT id, teacher_name, mail, branch
            FROM teachers
            WHERE id = ?
            """,
            (teacher_id,)
        ).fetchone()
        return dict(teacher) if teacher else None

    def list_teachers(self):
        database = get_db()
        rows = database.execute(
            "SELECT id, teacher_name, branch FROM teachers ORDER BY teacher_name"
        ).fetchall()
        return [dict(row) for row in rows]

    def update_profile(self, teacher_id, name, email):
        database = get_db()
        database.execute(
            "UPDATE teachers SET teacher_name = ?, mail = ? WHERE id = ?",
            (name, email, teacher_id)
        )
        database.commit()

    def change_password(self, teacher_id, current_password, new_password):
        database = get_db()
        teacher = database.execute(
            "SELECT password_hash FROM teachers WHERE id = ?",
            (teacher_id,)
        ).fetchone()
        if teacher is None or not check_password_hash(
            teacher["password_hash"], current_password
        ):
            return False

        database.execute(
            "UPDATE teachers SET password_hash = ? WHERE id = ?",
            (generate_password_hash(new_password), teacher_id)
        )
        database.commit()
        return True


    def check_teacher(self, email, password):
        """
        Method to check teacher exist or not
        with teacher entered data.
        """

        teacher = self.get_teacher_by_email(email)

        if teacher is None:
            raise ce.EmailNotFound

        if not check_password_hash(teacher["password_hash"], password):
            raise ce.PasswordIncorrect

        return {
            "id": teacher["id"]
        }
