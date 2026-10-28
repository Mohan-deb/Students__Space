from flask import Flask, render_template, request, redirect, url_for
from database.main_database import StudentDatabase, s
from werkzeug.security import generate_password_hash
from exceptions import students_exceptions as studente

app = Flask(__name__)

student_database = StudentDatabase()

@app.route("/")
def home():
    return render_template("homepage.html")


@app.route("/student_login", methods=["GET", "POST"])
def student_login():

    if request.method == "POST":
        data = (
            request.form.get("studentmail","").strip(),
            request.form.get("password","").strip()
            )

        try:
            student_database.connection()
            student_database.create_student()
            student_database.check_student(data)
            return redirect(url_for("student_login_"))

        except studente.StudentEmailNotFound:
            return redirect(request.path + "?message=emailnotfound")

        except studente.StudentPasswordIncorrect:
            return redirect(request.path + "?message=wrongpassword")
        
        finally:
            student_database.close_database()

    return render_template("StudentLogin.html")


@app.route("/teacher_login")
def teacher_login():
    return render_template("TeacherLogin.html")


@app.route("/student_login_")
def student_login_():
    return render_template("student_dashboard.html")


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
            student_database.connection()
            student_database.create_student()
            student_database.insert_student(data)
        except s.IntegrityError:
            return redirect(request.path + "?message=exists")
        finally:
            student_database.close_database()

        return redirect(url_for("student_login", message="success"))
    
    return render_template("signupform.html")


@app.route("/forgot_password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        # later: update password in database

        return redirect(url_for("student_login"))

    return render_template("ForgotPass.html")


if __name__ == "__main__":
    app.run(debug=True) 