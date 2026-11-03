CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pin TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        mail TEXT UNIQUE NOT NULL,
        branch TEXT NOT NULL,
        year TEXT NOT NULL,
        semester TEXT NOT NULL,
        password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    teacher_name TEXT NOT NULL,

    mail TEXT UNIQUE NOT NULL,

    branch TEXT NOT NULL,
    
    password_hash TEXT NOT NULL

);

CREATE TABLE IF NOT EXISTS ADMIN (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_name TEXT NOT NULL,
    admin_mail TEXT UNIQUE NOT NULL,
    admin_password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    teacher_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    student_id INTEGER,
    teacher_id INTEGER,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CHECK (
        (student_id IS NOT NULL AND teacher_id IS NULL) OR
        (student_id IS NULL AND teacher_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_student_id INTEGER NOT NULL,
    recipient_teacher_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    teacher_id INTEGER,
    question_id INTEGER,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL,
    CHECK (
        (student_id IS NOT NULL AND teacher_id IS NULL) OR
        (student_id IS NULL AND teacher_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_questions_student_created
    ON questions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_teacher_created
    ON questions(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_question
    ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_student
    ON answers(student_id);
CREATE INDEX IF NOT EXISTS idx_answers_teacher
    ON answers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient
    ON messages(recipient_teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_student
    ON notifications(student_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_teacher
    ON notifications(teacher_id, is_read, created_at DESC);
