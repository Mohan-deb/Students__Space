try:
    from flask import Flask, render_template, request, redirect, url_for
    from database.student_database import StudentDatabase
    from database.teacher_database import TeacherDatabase
    import sqlite3 as s
    from werkzeug.security import generate_password_hash
    from exceptions import common_exceptions as ce
    from pathlib import Path
    from database.db import init_app, init_db
except FileNotFoundError:
    pass
except ModuleNotFoundError:
    pass

app = Flask(__name__)

app.config["DATABASE"] = str(
    Path(app.root_path)
    / "database"
    / "main_database.db"
)

# Create database tables
with app.app_context():
    init_db()

# Register automatic database cleanup
init_app(app)

student_database = StudentDatabase()
teacher_database = TeacherDatabase()

@app.route("/")
def home():
    return render_template("homepage.html")


@app.route("/student_login", methods=["GET", "POST"])
def student_login():

    if request.method == "POST":

        try:
            student_database.check_student(
                request.form.get("studentmail","").strip().lower(),
                request.form.get("password","").strip()
            )
            return redirect(url_for("student_login_"))

        except ce.EmailNotFound:
            return redirect(request.path + "?message=emailnotfound")

        except ce.PasswordIncorrect:
            return redirect(request.path + "?message=wrongpassword")

    return render_template("StudentLogin.html")


@app.route("/teacher_login", methods=["GET", "POST"])
def teacher_login():
    if request.method == "POST":
        try:
            teacher_database.check_teacher(
                request.form.get("teachermail","").strip(),
                request.form.get("teacherpassword","")
            )

            return redirect(url_for("teacher_dashboard"))
        
        except s.IntegrityError:
            pass
        except ce.EmailNotFound:
            return redirect(request.path + "?message=emailnotfound")
        except ce.PasswordIncorrect:
            return redirect(request.path + "?message=wrongpassword")
        except s.OperationalError:
            pass

    return render_template("teacherLogin.html")


@app.route("/student_login_")
def student_login_():
    return render_template("student_dashboard.html")


@app.route("/teacher_dashboard")
def teacher_dashboard():
    return render_template("teacher_dashboard.html")


@app.route("/create_account", methods=["GET", "POST"])
def create_account():

    if request.method == "POST":
        
        data = (
            request.form.get("userpin", "").strip().lower(),
            request.form.get("createuser", "").strip().lower(),
            request.form.get("usermail", "").strip(),
            request.form.get("branchid", ""),
            request.form.get("year", ""),
            request.form.get("semester", ""),
            generate_password_hash(request.form.get("password", ""))
        )
            
        try:
            student_database.insert_student(data)
        except s.IntegrityError:
            return redirect(request.path + "?message=exists")

        return redirect(url_for("student_login", message="success"))
    
    return render_template("signupform.html")


@app.route("/forgot_password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        # later: update password in database

        return redirect(url_for("student_login"))

    return render_template("ForgotPass.html")



@app.route("/adminlogin",methods=["GET","POST"])
def adminlogin():
    if request.method =="POST":
        return redirect(url_for("adminlogin"))
    return render_template("adminlogin.html")


if __name__ == "__main__":
    app.run(debug=False)