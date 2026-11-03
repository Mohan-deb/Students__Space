try:
    from functools import wraps
    from flask import session, redirect, url_for, request, jsonify

except FileNotFoundError:
    pass
except ModuleNotFoundError:
    pass

def login_required(func):

    @wraps(func)
    def wrapper(*args, **kwargs):
        
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify(success=False, error="Please sign in again."), 401
            return redirect(url_for("student_login"))

        return func(*args, **kwargs)

    return wrapper

def role_required(*allowed_roles):

    def decorator(func):

        @wraps(func)
        def wrapper(*args, **kwargs):

            # Authentication check
            if "user_id" not in session:
                if request.path.startswith("/api/"):
                    return jsonify(success=False, error="Please sign in again."), 401
                return redirect(url_for("home"))

            # Authorization check 
            if session.get("role") not in allowed_roles:
                if request.path.startswith("/api/"):
                    return jsonify(success=False, error="You are not allowed to access this data."), 403
                return "403 Forbidden", 403

            return func(*args, **kwargs)

        return wrapper

    return decorator
