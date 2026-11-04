try:
    import hmac
    import os
    import re
    import secrets
    from flask import (
        Flask, render_template, request, redirect, url_for, session,
        jsonify, flash
    )
    from database.student_service import StudentService
    from database.student_service import CommunityService
    from database.teacher_service import TeacherService
    from database.admin_service import AdminService
    import sqlite3 as s

    from werkzeug.security import generate_password_hash
    from exceptions import common_exceptions as ce
    from database.db import init_app, init_db
    from auth.decorators import login_required, role_required
    from pathlib import Path
    from dotenv import load_dotenv
except ModuleNotFoundError as error:
    raise error


app = Flask(__name__)

# Load environment variables from the .env file
load_dotenv(Path(__file__).resolve().parent / ".env.example")

app.config["SECRET_KEY"] = os.environ.get("STUDENTS_SPACE_SECRET_KEY")

if not app.config["SECRET_KEY"]:
    raise RuntimeError("STUDENTS_SPACE_SECRET_KEY is not configured.")

app.config["DATABASE"] = str(
    Path(app.root_path)
    / "database"
    / "main_database.db"
)

init_app(app)

# Create missing tables without changing existing student or teacher rows.
# Initialize database and create the first admin if needed.
with app.app_context():
    init_db()

    admin_name = os.environ.get("STUDENTS_SPACE_ADMIN_NAME")
    admin_email = os.environ.get("STUDENTS_SPACE_ADMIN_EMAIL")
    admin_password = os.environ.get("STUDENTS_SPACE_ADMIN_PASSWORD")

    if not all([admin_name, admin_email, admin_password]):
        raise RuntimeError(
            "Initial admin credentials are missing from the .env file."
        )

    admin_database = AdminService()

    admin_database.ensure_initial_admin(
        admin_name.strip(),
        admin_email.strip().lower(),
        admin_password
    )

student_database = StudentService()
teacher_database = TeacherService()
community_database = CommunityService()


def csrf_token():
    """Return a session-bound token for HTML forms and dashboard requests."""
    token = session.get("_csrf_token")
    if token is None:
        token = secrets.token_urlsafe(32)
        session["_csrf_token"] = token
    return token


@app.context_processor
def inject_csrf_token():
    return {"csrf_token": csrf_token}


@app.before_request
def protect_state_changing_requests():
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return None

    expected = session.get("_csrf_token")
    supplied = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")
    if not expected or not supplied or not hmac.compare_digest(expected, supplied):
        if request.path.startswith("/api/"):
            return jsonify(success=False, error="Your session token is missing or expired."), 400
        return "Invalid or expired form token.", 400

    return None

@app.route("/")
def home():
    return render_template("homepage.html")


@app.route("/student_login", methods=["GET", "POST"])
def student_login():

    if request.method == "POST":

        try:
            student = student_database.check_student(
                request.form.get("studentmail","").strip().lower(),
                request.form.get("password","").strip()
            )

            session.clear()

            session["user_id"] = student["id"]
            session["role"] = "student"

            return redirect(url_for("student_dashboard"))

        except ce.EmailNotFound:
            return redirect(request.path + "?message=emailnotfound")

        except ce.PasswordIncorrect:
            return redirect(request.path + "?message=wrongpassword")

    return render_template("StudentLogin.html")


@app.route("/teacher_login", methods=["GET", "POST"])
def teacher_login():
    if request.method == "POST":
        try:
            teacher = teacher_database.check_teacher(
                request.form.get("teachermail", "").strip().lower(),
                request.form.get("teacherpassword","")
            )

            session.clear()

            session["user_id"] = teacher["id"]
            session["role"] = "teacher"
 
            return redirect(url_for("teacher_dashboard"))
        
        except ce.EmailNotFound:

            return redirect(
                request.path + "?message=emailnotfound"
            )
        except ce.PasswordIncorrect:

            return redirect(
                request.path + "?message=wrongpassword"
            )
        
    return render_template("TeacherLogin.html")


@app.route("/adminlogin",methods=["GET","POST"])
def adminlogin():
    if request.method == "POST":
        admin = admin_database.check_admin(
            request.form.get("adminname", "").strip(),
            request.form.get("adminpassword", "")
        )
        if admin:
            session.clear()
            session["user_id"] = admin["id"]
            session["role"] = "admin"
            return redirect(url_for("admin_dashboard"))
        flash("Invalid administrator name or password.", "error")
        return redirect(url_for("adminlogin"))
    return render_template("adminlogin.html")


@app.route("/create_account", methods=["GET", "POST"])
def create_account():

    if request.method == "POST":
        pin = request.form.get("userpin", "").strip().lower()
        name = request.form.get("createuser", "").strip()
        email = request.form.get("usermail", "").strip().lower()
        branch = request.form.get("branchid", "")
        year = request.form.get("year", "")
        semester = request.form.get("semester", "")
        password = request.form.get("password", "")
        if (
            not pin or len(name) < 2
            or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email)
            or branch not in {"CME", "EEE", "CIVIL", "CCP"}
            or year not in {"1", "2", "3"}
            or not semester.isdigit() or not 1 <= int(semester) <= 6
            or not password
        ):
            return redirect(request.path + "?message=invalid")
        if password != request.form.get("confirm_password", ""):
            return redirect(request.path + "?message=passwordmismatch")

        data = (
            pin,
            name.lower(),
            email,
            branch,
            year,
            semester,
            generate_password_hash(password)
        )
            
        try:
            student_database.insert_student(data)
        except s.IntegrityError:
            return redirect(request.path + "?message=exists")

        return redirect(url_for("student_login", message="success"))
    
    return render_template("signupform.html")


@app.route("/forgot_password")
def forgot_password():
    return render_template("ForgotPass.html")


@app.route("/student_dashboard")
@role_required("student")
@login_required
def student_dashboard():
    student = student_database.get_student_by_id(session["user_id"])
    if student is None:
        session.clear()
        return redirect(url_for("student_login"))
    branch_labels = {
        "CME": "Computer Engineering",
        "EEE": "Electrical and Electronic Engineering",
        "CIVIL": "Civil Engineering",
        "CCP": "Commercial and Computer Engineering"
    }
    student["branch_label"] = branch_labels.get(student["branch"], student["branch"])
    student["year_label"] = {
        "1": "1st Year", "2": "2nd Year", "3": "3rd Year"
    }.get(student["year"], student["year"])
    notifications = community_database.list_notifications("student", student["id"])
    return render_template(
        "student_dashboard.html",
        student=student,
        stats=community_database.student_statistics(student["id"]),
        teachers=teacher_database.list_teachers(),
        unread_notifications=sum(not item["is_read"] for item in notifications)
    )


@app.route("/teacher_dashboard")
@role_required("teacher")
@login_required
def teacher_dashboard():
    teacher = teacher_database.get_teacher_by_id(session["user_id"])
    if teacher is None:
        session.clear()
        return redirect(url_for("teacher_login"))
    notifications = community_database.list_notifications("teacher", teacher["id"])
    messages = community_database.list_teacher_messages(teacher["id"])
    return render_template(
        "teacher_dashboard.html",
        teacher=teacher,
        stats=community_database.teacher_statistics(teacher["id"]),
        unread_notifications=sum(not item["is_read"] for item in notifications),
        message_count=len(messages)
    )


@app.route("/admin_dashboard", methods=["GET", "POST"])
@role_required("admin")
def admin_dashboard():
    totals = community_database.platform_totals()
    if request.method == "POST":
        teacher_name = request.form.get("teachername", "").strip()
        email = request.form.get("teacheremail", "").strip().lower()
        branch = request.form.get("teacherbranch", "").strip()
        password = request.form.get("password", "")

        if len(teacher_name) < 2 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            flash("Enter a valid teacher name and email address.", "error")
        elif branch not in {"CSE", "EEE", "MECH", "CIVIL", "CCP"}:
            flash("Select a valid teacher branch.", "error")
        elif len(password) < 6:
            flash("Teacher password must contain at least 6 characters.", "error")
        else:
            try:
                teacher_database.insert_teacher(teacher_name, email, branch, password)
                flash("Teacher account created successfully.", "success")
                totals = community_database.platform_totals()
            except s.IntegrityError:
                flash("A teacher account already uses that email address.", "error")

        return redirect(url_for("admin_dashboard") + "#add-teacher")

    return render_template("admin_dashboard.html", **totals)


@app.route("/api/student/dashboard")
@role_required("student")
@login_required
def student_dashboard_data():
    student_id = session["user_id"]
    return jsonify(
        profile=student_database.get_student_by_id(student_id),
        statistics=community_database.student_statistics(student_id),
        questions=community_database.list_questions(),
        teachers=teacher_database.list_teachers(),
        notifications=community_database.list_notifications("student", student_id)
    )


@app.route("/api/teacher/dashboard")
@role_required("teacher")
@login_required
def teacher_dashboard_data():
    teacher_id = session["user_id"]
    return jsonify(
        profile=teacher_database.get_teacher_by_id(teacher_id),
        statistics=community_database.teacher_statistics(teacher_id),
        questions=community_database.list_questions(teacher_id=teacher_id),
        messages=community_database.list_teacher_messages(teacher_id),
        notifications=community_database.list_notifications("teacher", teacher_id)
    )


@app.route("/api/questions", methods=["POST"])
@role_required("student")
@login_required
def create_question():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    subject = str(data.get("subject", "")).strip()
    description = str(data.get("description", "")).strip()
    raw_teacher_id = data.get("teacher_id")

    if not title or len(title) > 200 or not subject or len(subject) > 100:
        return jsonify(success=False, error="Enter a question title and subject."), 400
    if not description or len(description) > 5000:
        return jsonify(success=False, error="Enter a question description (up to 5000 characters)."), 400

    teacher_id = None
    if raw_teacher_id not in (None, ""):
        try:
            teacher_id = int(raw_teacher_id)
        except (TypeError, ValueError):
            return jsonify(success=False, error="Choose a valid teacher."), 400
        if teacher_database.get_teacher_by_id(teacher_id) is None:
            return jsonify(success=False, error="That teacher account was not found."), 400

    question_id = community_database.create_question(
        session["user_id"], title, subject, description, teacher_id
    )
    return jsonify(success=True, question_id=question_id), 201


@app.route("/api/questions/<int:question_id>/answers", methods=["POST"])
@role_required("student")
@login_required
def add_student_answer(question_id):
    data = request.get_json(silent=True) or {}
    content = str(data.get("content", "")).strip()
    if not content or len(content) > 5000:
        return jsonify(success=False, error="Enter an answer (up to 5000 characters)."), 400

    answer_id, error = community_database.add_answer(
        question_id, "student", session["user_id"], content
    )
    if error:
        status = 404 if error == "Question not found." else 403
        return jsonify(success=False, error=error), status
    return jsonify(success=True, answer_id=answer_id), 201


@app.route("/api/teacher/questions/<int:question_id>/answers", methods=["POST"])
@role_required("teacher")
@login_required
def add_teacher_answer(question_id):
    data = request.get_json(silent=True) or {}
    content = str(data.get("content", "")).strip()
    if not content or len(content) > 5000:
        return jsonify(success=False, error="Enter an answer (up to 5000 characters)."), 400

    answer_id, error = community_database.add_answer(
        question_id, "teacher", session["user_id"], content
    )
    if error:
        status = 404 if error == "Question not found." else 403
        return jsonify(success=False, error=error), status
    return jsonify(success=True, answer_id=answer_id), 201


@app.route("/api/messages", methods=["POST"])
@role_required("student")
@login_required
def send_teacher_message():
    data = request.get_json(silent=True) or {}
    content = str(data.get("content", "")).strip()
    try:
        teacher_id = int(data.get("teacher_id"))
    except (TypeError, ValueError):
        return jsonify(success=False, error="Choose a valid teacher."), 400
    if not content or len(content) > 500:
        return jsonify(success=False, error="Enter a message (up to 500 characters)."), 400

    message_id = community_database.send_message(
        session["user_id"], teacher_id, content
    )
    if not message_id:
        return jsonify(success=False, error="That teacher account was not found."), 404
    return jsonify(success=True, message_id=message_id), 201


@app.route("/api/<role>/notifications/<int:notification_id>/read", methods=["POST"])
@role_required("student", "teacher")
@login_required
def mark_notification_read(role, notification_id):
    if role != session.get("role"):
        return jsonify(success=False, error="You cannot update this notification."), 403
    if not community_database.mark_notification_read(role, session["user_id"], notification_id):
        return jsonify(success=False, error="Notification not found."), 404
    return jsonify(success=True)


@app.route("/api/<role>/notifications/read-all", methods=["POST"])
@role_required("student", "teacher")
@login_required
def mark_all_notifications_read(role):
    if role != session.get("role"):
        return jsonify(success=False, error="You cannot update these notifications."), 403
    community_database.mark_notification_read(role, session["user_id"])
    return jsonify(success=True)


@app.route("/api/student/profile", methods=["POST"])
@role_required("student")
@login_required
def update_student_profile():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    branch = str(data.get("branch", "")).strip()
    year = str(data.get("year", "")).strip()
    if len(name) < 2 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return jsonify(success=False, error="Enter a valid name and email address."), 400
    if branch not in {"CME", "EEE", "CIVIL", "CCP"} or year not in {"1", "2", "3"}:
        return jsonify(success=False, error="Choose a valid branch and year."), 400
    try:
        student_database.update_profile(session["user_id"], name, email, branch, year)
    except s.IntegrityError:
        return jsonify(success=False, error="That email address is already in use."), 409
    return jsonify(success=True, profile=student_database.get_student_by_id(session["user_id"]))


@app.route("/api/teacher/profile", methods=["POST"])
@role_required("teacher")
@login_required
def update_teacher_profile():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    if len(name) < 2 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return jsonify(success=False, error="Enter a valid name and email address."), 400
    try:
        teacher_database.update_profile(session["user_id"], name, email)
    except s.IntegrityError:
        return jsonify(success=False, error="That email address is already in use."), 409
    return jsonify(success=True, profile=teacher_database.get_teacher_by_id(session["user_id"]))


@app.route("/api/change-password", methods=["POST"])
@role_required("student", "teacher")
@login_required
def change_password():
    data = request.get_json(silent=True) or {}
    current_password = str(data.get("current_password", ""))
    new_password = str(data.get("new_password", ""))
    if len(new_password) < 8:
        return jsonify(success=False, error="New password must contain at least 8 characters."), 400
    if session["role"] == "student":
        changed = student_database.change_password(
            session["user_id"], current_password, new_password
        )
    else:
        changed = teacher_database.change_password(
            session["user_id"], current_password, new_password
        )
    if not changed:
        return jsonify(success=False, error="Current password is incorrect."), 400
    return jsonify(success=True)

@app.route("/logout")
def logout():

    session.clear()

    return redirect(url_for("home"))

 
if __name__ == "__main__":
    app.run(debug=False)
