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

CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE RESTRICT ,
    branch TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE RESTRICT,
    question_type TEXT NOT NULL CHECK((question_type = 'community' AND teacher_id IS NULL) OR (question_type = 'teacher_tagged' AND teacher_id IS NOT NULL)),
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_branch
ON questions(branch);

CREATE INDEX IF NOT EXISTS idx_questions_student
ON questions(student_id);

CREATE TABLE IF NOT EXISTS answers (
    answer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    student_id INTEGER  REFERENCES students(id) ON DELETE RESTRICT,
    teacher_id INTEGER  REFERENCES teachers(id) ON DELETE RESTRICT,
    answer_description TEXT NOT NULL,
    created_at TEXT NOT NULL,
    CHECK((student_id IS NOT NULL AND teacher_id IS NULL) OR(student_id IS NULL AND teacher_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS notifications(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK(
        notification_type IN (
            'question_published','question_answered','teacher_tagged','question_resolved'
        )
    ),
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0, 1)),created_at TEXT NOT NULL,
    CHECK(
        (student_id IS NOT NULL AND teacher_id IS NULL) OR 
        (
            student_id IS NULL AND teacher_id IS NOT NULL
        )
    )
);