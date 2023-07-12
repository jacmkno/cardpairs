import http.server
import socketserver
import cgi
from register_user import UserRegister

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api":
            self.api()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == "/api/session/register":
            UserRegister.register_user(self)
        else:
            super().do_POST()

    def api(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        self.wfile.write(b"API Response")

# Set the server address and port
host = "localhost"
port = 8000

# Set up the socket server
with socketserver.TCPServer((host, port), Handler) as httpd:
    print(f"Server started at {host}:{port}")

    # Start the server
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass

    httpd.server_close()
    print("Server stopped.")
