from database.db import get_db
from datetime import datetime,timezone


class NotificationDatabase:
    def insert_notification(self,notification_type,message,question_id,student_id=None,teacher_id=None):
        database = get_db()
        current_time = datetime.now(timezone.utc).isoformat()
        cursor = database.execute("""INSERT INTO notifications (student_id,teacher_id,question_id,notification_type,message,created_at) VALUES (?,?,?,?,?,?)""",
                                  (student_id,teacher_id,question_id,notification_type,message,current_time))
        database.commit()
        return cursor.lastrowid
    
    def get_notifications(self,student_id=None,teacher_id = None):
        database = get_db()
        if student_id is not None:
            cursor = database.execute("""SELECT * FROM notifications WHERE student_id = ? ORDER BY  created_at DESC""",(student_id,))
            
        elif teacher_id is not None:
            cursor = database.execute("""SELECT * FROM notifications WHERE teacher_id =? ORDER BY created_at DESC""",(teacher_id,))
        else:
            return []
        return cursor.fetchall()
    
    def mark_as_read(self, notification_id, student_id=None, teacher_id=None):
        
        database = get_db()

        if student_id is not None:
            cursor = database.execute(
                """
                UPDATE notifications
                SET is_read = 1
                WHERE id = ? AND student_id = ?
                """,
                (notification_id, student_id)
            )

        elif teacher_id is not None:
            cursor = database.execute(
                """
                UPDATE notifications
                SET is_read = 1
                WHERE id = ? AND teacher_id = ?
                """,
                (notification_id, teacher_id)
            )

        else:
            return 0

        database.commit()
        return cursor.rowcount
        
    def notify_question_published(self, question_id, student_id, branch):
        database = get_db()

        message = "A new question has been published in your branch."

        database.execute(
            """
            INSERT INTO notifications
            (student_id, question_id, notification_type, message, created_at)
            SELECT id, ?, 'question_published', ?, ?
            FROM students
            WHERE branch = ? AND id != ?
            """,
            (
                question_id, message,
                datetime.now(timezone.utc).isoformat(),
                branch, student_id
            )
        )

        database.execute(
            """
            INSERT INTO notifications
            (teacher_id, question_id, notification_type, message, created_at)
            SELECT id, ?, 'question_published', ?, ?
            FROM teachers
            WHERE branch = ?
            """,
            (
                question_id, message,
                datetime.now(timezone.utc).isoformat(),
                branch
            )
        )

        database.commit()
        
    def notify_teacher_tagged(self, question_id, teacher_id):
        self.insert_notification(
            notification_type="teacher_tagged",
            message="You have been tagged in a new question.",
            question_id=question_id,
            teacher_id=teacher_id
        )
        
    def question_resolved(self,question_id,student_id,teacher_id=None):
        self.insert_notification(
            notification_type="question_resolved",
            message="Your question has been marked as resolved..",
            question_id = question_id,
            student_id =student_id
        )
        if teacher_id is  not None:
            self.insert_notification(
                notification_type="question_resolved",
                message="A question you were tagged in has been resolved..",
                question_id=question_id,
                teacher_id=teacher_id
            )
        
    def notify_question_answered(self,question_id,student_id):
        self.insert_notification(
            notification_type="question_answered",
            message= "Your question  has received a new answer.",
            question_id=question_id,
            student_id=student_id
        )
    def get_unread_count(self, student_id=None, teacher_id=None):
        database = get_db()

        if student_id is not None:
            cursor = database.execute(
            """
            SELECT COUNT(*) AS total
            FROM notifications
            WHERE student_id = ? AND is_read = 0
            """,
            (student_id,)
        )

        elif teacher_id is not None:
            cursor = database.execute(
                """
                SELECT COUNT(*) AS total
                FROM notifications
                WHERE teacher_id = ? AND is_read = 0
                """,
                (teacher_id,)
            )

        else:
            return 0

        return cursor.fetchone()["total"]
    def mark_all_as_read(self, student_id=None, teacher_id=None):
        database = get_db()

        if student_id is not None:
            cursor = database.execute(
                """
                UPDATE notifications
                SET is_read = 1
                WHERE student_id = ? AND is_read = 0
                """,
                (student_id,)
            )

        elif teacher_id is not None:
            cursor = database.execute(
                """
                UPDATE notifications
                SET is_read = 1
                WHERE teacher_id = ? AND is_read = 0
                """,
                (teacher_id,)
            )

        else:
            return 0

        database.commit()
        return cursor.rowcount