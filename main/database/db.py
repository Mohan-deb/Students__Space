import sqlite3 as s
from pathlib import Path

from flask import current_app, g


def get_db():

    """
    Get the SQLite connection for the current 
    Flask application context.
    """

    if "db" not in g: 

        database_path = current_app.config["DATABASE"]

        g.db = s.connect(
            database_path,
            timeout=10
        )

        g.db.row_factory = s.Row

        # Enable foreign key enforcement
        g.db.execute("PRAGMA foreign_keys = ON")

    return g.db


def close_db(error=None):

    """
    Close the connection when the Flask
    application context ends.
    """

    database = g.pop("db", None)

    if database is not None:
        database.close()


def init_db():

    """
    Create database tables using schema.sql
    """

    database = get_db()

    schema_path = (
        Path(__file__).resolve().parent / "schema.sql"
    )

    with open(schema_path, "r", encoding="utf-8") as file:

        database.executescript(file.read())

    database.commit()


def init_app(app):

    """
    Register databse cleanup with Flask
    """

    app.teardown_appcontext(close_db)