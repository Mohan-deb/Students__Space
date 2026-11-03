try:
    from werkzeug.security import check_password_hash, generate_password_hash
    from exceptions import common_exceptions as ce
    from database.db import get_db
except FileNotFoundError:
      pass
except ModuleNotFoundError:
      pass

class StudentService():

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
            WHERE lower(mail) = lower(?)
            """,
            (email,)
        ).fetchone()

        return student

    def get_student_by_id(self, student_id):
        database = get_db()
        student = database.execute(
            "SELECT id, name, mail, branch, year, semester "
            "FROM students WHERE id = ?",
            (student_id,)
        ).fetchone()
        return dict(student) if student else None

    def update_profile(self, student_id, name, email, branch, year):
        database = get_db()
        database.execute(
            """
            UPDATE students
            SET name = ?, mail = ?, branch = ?, year = ?
            WHERE id = ?
            """,
            (name, email, branch, year, student_id)
        )
        database.commit()

    def change_password(self, student_id, current_password, new_password):
        database = get_db()
        student = database.execute(
            "SELECT password_hash FROM students WHERE id = ?",
            (student_id,)
        ).fetchone()
        if student is None or not check_password_hash(
            student["password_hash"], current_password
        ):
            return False

        database.execute(
            "UPDATE students SET password_hash = ? WHERE id = ?",
            (generate_password_hash(new_password), student_id)
        )
        database.commit()
        return True


    def check_student(self, email, password):

        """
        Method to check whether student exist or not
        """

        student = self.get_student_by_email(email)

        if student is None:
            raise ce.EmailNotFound

        if not check_password_hash(student["password_hash"], password):
            raise ce.PasswordIncorrect

        return {
            "id": student["id"]
        }


class CommunityService:
    """Question, answer, message, and notification operations."""

    def list_questions(self, teacher_id=None):
        database = get_db()
        where = ""
        parameters = ()
        if teacher_id is not None:
            where = "WHERE q.teacher_id IS NULL OR q.teacher_id = ?"
            parameters = (teacher_id,)

        rows = database.execute(
            f"""
            SELECT q.id, q.student_id, q.subject, q.title, q.description,
                   q.teacher_id, q.created_at,
                   s.name AS student_name,
                   t.teacher_name AS teacher_name,
                   COUNT(a.id) AS answer_count
            FROM questions AS q
            JOIN students AS s ON s.id = q.student_id
            LEFT JOIN teachers AS t ON t.id = q.teacher_id
            LEFT JOIN answers AS a ON a.question_id = q.id
            {where}
            GROUP BY q.id
            ORDER BY q.created_at DESC, q.id DESC
            """,
            parameters
        ).fetchall()

        questions = [dict(row) for row in rows]
        if not questions:
            return []

        placeholders = ",".join("?" for _ in questions)
        answer_rows = database.execute(
            f"""
            SELECT a.id, a.question_id, a.student_id, a.teacher_id,
                   a.content, a.created_at,
                   COALESCE(s.name, t.teacher_name) AS author_name
            FROM answers AS a
            LEFT JOIN students AS s ON s.id = a.student_id
            LEFT JOIN teachers AS t ON t.id = a.teacher_id
            WHERE a.question_id IN ({placeholders})
            ORDER BY a.created_at, a.id
            """,
            tuple(question["id"] for question in questions)
        ).fetchall()

        answers_by_question = {}
        for row in answer_rows:
            answer = dict(row)
            answers_by_question.setdefault(answer["question_id"], []).append(answer)

        for question in questions:
            question["answer_records"] = answers_by_question.get(question["id"], [])
            question["answers"] = len(question["answer_records"])
            question["answer_count"] = question["answers"]
            question["status"] = (
                "answered" if question["answer_count"] else "unanswered"
            )
            question["teacher_tagged"] = question["teacher_id"] is not None
            question["teacherTagged"] = question["teacher_tagged"]
            question["author"] = question["student_name"]
            question["time"] = question["created_at"]
            question["teacher"] = question["teacher_name"]

        return questions

    def create_question(self, student_id, title, subject, description, teacher_id=None):
        database = get_db()
        cursor = database.execute(
            """
            INSERT INTO questions (student_id, subject, title, description, teacher_id)
            VALUES (?, ?, ?, ?, ?)
            """,
            (student_id, subject, title, description, teacher_id)
        )
        question_id = cursor.lastrowid

        if teacher_id is not None:
            database.execute(
                """
                INSERT INTO notifications
                    (teacher_id, question_id, kind, title, content)
                VALUES (?, ?, 'tagged_question', 'You were tagged in a question', ?)
                """,
                (teacher_id, question_id, title)
            )

        database.commit()
        return question_id

    def add_answer(self, question_id, role, user_id, content):
        database = get_db()
        question = database.execute(
            "SELECT id, student_id, teacher_id, title FROM questions WHERE id = ?",
            (question_id,)
        ).fetchone()
        if question is None:
            return None, "Question not found."

        if role == "student":
            if question["student_id"] == user_id:
                return None, "You cannot answer your own question."
            if question["teacher_id"] is not None:
                return None, "This question is waiting for the tagged teacher."
            student_id, teacher_id = user_id, None
            name_row = database.execute(
                "SELECT name FROM students WHERE id = ?", (user_id,)
            ).fetchone()
        else:
            if question["teacher_id"] is not None and question["teacher_id"] != user_id:
                return None, "This question is tagged to another teacher."
            student_id, teacher_id = None, user_id
            name_row = database.execute(
                "SELECT teacher_name AS name FROM teachers WHERE id = ?", (user_id,)
            ).fetchone()

        cursor = database.execute(
            """
            INSERT INTO answers (question_id, student_id, teacher_id, content)
            VALUES (?, ?, ?, ?)
            """,
            (question_id, student_id, teacher_id, content)
        )
        answer_id = cursor.lastrowid
        author_name = name_row["name"] if name_row else "A user"
        database.execute(
            """
            INSERT INTO notifications
                (student_id, question_id, kind, title, content)
            VALUES (?, ?, 'question_answer', 'Your question received an answer', ?)
            """,
            (question["student_id"], question_id,
             f"{author_name} answered: {question['title']}")
        )
        database.commit()
        return answer_id, None

    def student_statistics(self, student_id):
        database = get_db()
        row = database.execute(
            """
            SELECT
                COUNT(DISTINCT q.id) AS asked,
                COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN q.id END) AS answered,
                COUNT(DISTINCT CASE WHEN a.id IS NULL THEN q.id END) AS pending
            FROM questions AS q
            LEFT JOIN answers AS a ON a.question_id = q.id
            WHERE q.student_id = ?
            """,
            (student_id,)
        ).fetchone()
        given = database.execute(
            "SELECT COUNT(*) FROM answers WHERE student_id = ?",
            (student_id,)
        ).fetchone()[0]
        return {**dict(row), "answers_given": given}

    def teacher_statistics(self, teacher_id):
        database = get_db()
        tagged = database.execute(
            "SELECT COUNT(*) FROM questions WHERE teacher_id = ?",
            (teacher_id,)
        ).fetchone()[0]
        pending_tagged = database.execute(
            """
            SELECT COUNT(*) FROM questions AS q
            WHERE q.teacher_id = ?
              AND NOT EXISTS (SELECT 1 FROM answers AS a WHERE a.question_id = q.id)
            """,
            (teacher_id,)
        ).fetchone()[0]
        pending = database.execute(
            """
            SELECT COUNT(*) FROM questions AS q
            WHERE (q.teacher_id IS NULL OR q.teacher_id = ?)
              AND NOT EXISTS (SELECT 1 FROM answers AS a WHERE a.question_id = q.id)
            """,
            (teacher_id,)
        ).fetchone()[0]
        answered = database.execute(
            "SELECT COUNT(DISTINCT question_id) FROM answers WHERE teacher_id = ?",
            (teacher_id,)
        ).fetchone()[0]
        subjects = database.execute(
            """
            SELECT DISTINCT subject FROM questions
            WHERE teacher_id = ? OR id IN (
                SELECT question_id FROM answers WHERE teacher_id = ?
            )
            ORDER BY subject
            """,
            (teacher_id, teacher_id)
        ).fetchall()
        return {
            "tagged": tagged,
            "pending_tagged": pending_tagged,
            "pending": pending,
            "answered": answered,
            "subjects": [row["subject"] for row in subjects]
        }

    def send_message(self, student_id, teacher_id, content):
        database = get_db()
        teacher = database.execute(
            "SELECT teacher_name FROM teachers WHERE id = ?", (teacher_id,)
        ).fetchone()
        if teacher is None:
            return False

        student = database.execute(
            "SELECT name FROM students WHERE id = ?", (student_id,)
        ).fetchone()
        cursor = database.execute(
            """
            INSERT INTO messages (sender_student_id, recipient_teacher_id, content)
            VALUES (?, ?, ?)
            """,
            (student_id, teacher_id, content)
        )
        database.execute(
            """
            INSERT INTO notifications (teacher_id, kind, title, content)
            VALUES (?, 'student_message', 'New student message', ?)
            """,
            (teacher_id, f"{student['name']} sent you a message.")
        )
        database.commit()
        return cursor.lastrowid

    def list_teacher_messages(self, teacher_id):
        database = get_db()
        rows = database.execute(
            """
            SELECT m.id, m.content, m.created_at, s.name AS sender_name,
                   s.mail AS sender_email
            FROM messages AS m
            JOIN students AS s ON s.id = m.sender_student_id
            WHERE m.recipient_teacher_id = ?
            ORDER BY m.created_at DESC, m.id DESC
            """,
            (teacher_id,)
        ).fetchall()
        return [dict(row) for row in rows]

    def list_notifications(self, role, user_id):
        database = get_db()
        recipient = "student_id" if role == "student" else "teacher_id"
        rows = database.execute(
            f"""
            SELECT id, kind, title, content, question_id, created_at, is_read
            FROM notifications
            WHERE {recipient} = ?
            ORDER BY created_at DESC, id DESC
            """,
            (user_id,)
        ).fetchall()
        return [dict(row) for row in rows]

    def mark_notification_read(self, role, user_id, notification_id=None):
        database = get_db()
        recipient = "student_id" if role == "student" else "teacher_id"
        if notification_id is None:
            database.execute(
                f"UPDATE notifications SET is_read = 1 WHERE {recipient} = ?",
                (user_id,)
            )
            changed = True
        else:
            cursor = database.execute(
                f"UPDATE notifications SET is_read = 1 WHERE id = ? AND {recipient} = ?",
                (notification_id, user_id)
            )
            changed = cursor.rowcount > 0
        database.commit()
        return changed

    def platform_totals(self):
        database = get_db()
        return {
            "total_students": database.execute(
                "SELECT COUNT(*) FROM students"
            ).fetchone()[0],
            "total_teachers": database.execute(
                "SELECT COUNT(*) FROM teachers"
            ).fetchone()[0]
        }
