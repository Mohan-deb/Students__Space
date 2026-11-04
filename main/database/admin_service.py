from database.db import get_db
from werkzeug.security import check_password_hash, generate_password_hash


class AdminService:
    """Database operations for administrator accounts."""

    def ensure_initial_admin(self, name, email, password):
        """Create the first admin only when bootstrap credentials are configured."""
        if not name or not email or not password:
            return False

        database = get_db()
        existing = database.execute(
            "SELECT 1 FROM ADMIN LIMIT 1"
        ).fetchone()
        if existing:
            return False

        database.execute(
            """
            INSERT INTO ADMIN (admin_name, admin_mail, admin_password)
            VALUES (?, ?, ?)
            """,
            (name.strip(), email.strip().lower(), generate_password_hash(password))
        )
        database.commit()
        return True

    def check_admin(self, username_or_email, password):
        database = get_db()
        account = database.execute(
            """
            SELECT id, admin_password
            FROM ADMIN
            WHERE lower(admin_name) = lower(?) OR lower(admin_mail) = lower(?)
            """,
            (username_or_email.strip(), username_or_email.strip())
        ).fetchone()

        if account is None:
            return None

        try:
            if not check_password_hash(account["admin_password"], password):
                return None
        except (TypeError, ValueError):
            return None

        return {"id": account["id"]}
