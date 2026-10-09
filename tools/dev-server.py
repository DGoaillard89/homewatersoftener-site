"""Local preview server with caching disabled, so edits and swapped images show on every refresh.
Usage: python3 tools/dev-server.py  (then open http://localhost:8080)"""
import http.server, os, socketserver

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', 8080), NoCacheHandler) as httpd:
    print('Serving on http://localhost:8080')
    httpd.serve_forever()
