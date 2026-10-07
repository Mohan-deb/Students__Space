from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("homepage.html")


@app.route("/student_login")
def student_login():
    return render_template("StudentLogin.html")


@app.route("/teacher_login")
def teacher_login():
    return render_template("TeacherLogin.html")


@app.route("/student_login_")
def student_login_():
    return render_template("student_dashboard.html")


@app.route("/create_account")
def create_account():
    return render_template("signupform.html")


@app.route("/forgot_password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        # later: update password in database

        return redirect(url_for("student_login"))

    return render_template("ForgotPass.html")


if __name__ == "__main__":
    app.run(debug=True) 