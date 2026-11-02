from database.db import get_db
from datetime import datetime,timezone
from database.notification_database import NotificationDatabase

class QuestionDatabase:
    def __init__(self):
        self.notification_db = NotificationDatabase()
    
    def get_questions(self,branch):
        database = get_db()
        cursor = database.execute("""SELECT * FROM questions WHERE branch = ? ORDER BY created_at DESC""",(branch,))
        questions = cursor.fetchall()
        return questions
    
    
    def update_question(self,question_id,student_id,title,description):
        database = get_db()
        current_time = datetime.now(timezone.utc).isoformat()
        cursor = database.execute("""UPDATE questions SET title = ? , description = ?,updated_at = ?  WHERE id = ? AND student_id=?""",(title,description,current_time,question_id,student_id))
        database.commit()
        return cursor.rowcount
        
    
    
    def delete_question(self,question_id,student_id):
        database = get_db()
        cursor = database.execute("""DELETE FROM questions WHERE id=? AND student_id =?""",(question_id,student_id))
        database.commit()
        return cursor.rowcount
    
    
    
    def insert_question(self,student_id,branch,title,description,question_type,teacher_id=None):
        database = get_db()
        current_time = datetime.now(timezone.utc).isoformat()
            

        cursor = database.execute(
            """
            INSERT INTO questions (
                student_id,
                branch,
                title,
                description,
                question_type,
                teacher_id,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                student_id,
                branch,
                title,
                description,
                question_type,
                teacher_id,
                current_time,
                current_time
            )
        )

        database.commit()

        question_id = cursor.lastrowid
        self.notification_db.notify_question_published(
            question_id,student_id,branch
        )
        if question_type == "teacher_tagged":
            self.notification_db.notify_teacher_tagged(question_id,teacher_id)
        return question_id
            

    def get_answers(self, question_id):
        database = get_db()
        cursor = database.execute("""SELECT a.answer_id,a.question_id,a.student_id,a.answer_description,a.created_at,a.teacher_id,s.name AS student_name,t.teacher_name AS teacher_name FROM answers AS a  LEFT JOIN students AS s ON a.student_id = s.id LEFT JOIN teachers AS t ON a.teacher_id = t.id WHERE a.question_id =? ORDER BY a.created_at ASC """,(question_id,))
        
        return cursor.fetchall()
        
    
    
    def resolve_question(self, question_id, student_id):
            
        database = get_db()

        question = database.execute(
            "SELECT student_id, teacher_id FROM questions WHERE id = ?",
            (question_id,)
        ).fetchone()

        if question is None or question["student_id"] != student_id:
            return 0

        cursor = database.execute(
            """
            UPDATE questions
            SET status = 'resolved', updated_at = ?
            WHERE id = ? AND status = 'open'
            """,
            (datetime.now(timezone.utc).isoformat(), question_id)
        )

        database.commit()

        if cursor.rowcount == 1:
            self.notification_db.notify_question_resolved(
                question_id,
                question["student_id"],
                question["teacher_id"]
            )

        return cursor.rowcount
    
    
    def get_question_by_id(self,question_id):
        database = get_db()
        cursor = database.execute("""SELECT * FROM questions WHERE id = ?""",(question_id,))
        question = cursor.fetchone()
        return question
    
    def get_questions_by_student(self, student_id):
            
        database = get_db()

        cursor = database.execute(
            """
            SELECT *
            FROM questions
            WHERE student_id = ?
            ORDER BY created_at DESC
            """,
            (student_id,)
        )

        return cursor.fetchall()
    
    def insert_answer(self,question_id,answer_description,student_id=None,teacher_id=None):
            
        database = get_db()

        current_time = datetime.now(timezone.utc).isoformat()

        cursor = database.execute(
            """
            INSERT INTO answers (
                question_id,
                student_id,
                teacher_id,
                answer_description,
                created_at
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                question_id,
                student_id,
                teacher_id,
                answer_description,
                current_time
            )
        )

        database.commit()
        question = database.execute("SELECT student_id FROM questions WHERE id = ?",
                                    (question_id,)
                                    ).fetchone()
        if question:
            self.notification_db.notify_question_answered(
                question_id, question["student_id"]
            )
        return cursor.lastrowid

    