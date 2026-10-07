from pathlib import Path
import sqlite3

BASE_DIR = Path(__file__).resolve().parent

DATABASE_PATH = BASE_DIR / "students_space.db"

connection = sqlite3.connect(DATABASE_PATH)