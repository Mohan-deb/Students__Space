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