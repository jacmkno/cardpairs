import sqlite3
import json

# SQLite database file
database_file = "data.db"

class UserRegister:
    @staticmethod
    def register_user(handler):
        form = handler.get_post_data()

        username = form.get("username", "")
        email = form.get("email", "")
        password = form.get("password", "")

        if not all([username, email, password]):
            handler.send_response(400)
            handler.send_header("Content-type", "text/html")
            handler.end_headers()
            handler.wfile.write(b"Missing form fields")
            return

        # Validate the data (you can add your own validation logic here)

        # Save the data to the database
        conn = sqlite3.connect(database_file)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                email TEXT,
                password TEXT
            )
        """)

        cursor.execute("INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
                       (username, email, password))
        conn.commit()
        
        user_id = cursor.lastrowid

        # Retrieve the inserted row from the database
        cursor.execute("SELECT * FROM users WHERE id=?", (user_id,))
        row = cursor.fetchone()

        conn.close()

        response = {
            "id": row[0],
            "username": row[1],
            "email": row[2],
            "password": row[3]
        }

        json_response = json.dumps(response)

        handler.send_response(200)
        handler.send_header("Content-type", "application/json")
        handler.end_headers()
        handler.wfile.write(json_response.encode("utf-8"))


    @staticmethod
    def authenticate_user(handler):
        form = handler.get_post_data()

        username = form.get("username", "")
        password = form.get("password", "")

        if not all([username, password]):
            handler.send_response(400)
            handler.send_header("Content-type", "text/html")
            handler.end_headers()
            handler.wfile.write(b"Missing form fields")
            return

        conn = sqlite3.connect(database_file)
        cursor = conn.cursor()

        # Retrieve the user from the database based on the username and password
        cursor.execute("SELECT * FROM users WHERE username=? AND password=?", (username, password))
        row = cursor.fetchone()

        conn.close()

        if row is None:
            handler.send_response(401)
            handler.send_header("Content-type", "text/html")
            handler.end_headers()
            handler.wfile.write(b"Invalid credentials")
        else:
            response = {
                "id": row[0],
                "username": row[1],
                "email": row[2]
            }

            json_response = json.dumps(response)

            handler.send_response(200)
            handler.send_header("Content-type", "application/json")
            handler.end_headers()
            handler.wfile.write(json_response.encode("utf-8"))