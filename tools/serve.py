import http.server, os, sys
ROOT=sys.argv[1]; CSP=None
for line in open(os.path.join(ROOT,'_headers')):
    if line.strip().startswith('Content-Security-Policy:'): CSP=line.split(':',1)[1].strip().replace(' upgrade-insecure-requests','')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def translate_path(s,path):
        p=path.split('?')[0].split('#')[0]
        full=os.path.join(ROOT,p.lstrip('/'))
        if p=='/' : return os.path.join(ROOT,'index.html')
        if not os.path.exists(full) and os.path.exists(full+'.html'): return full+'.html'
        return super().translate_path(path)
    def end_headers(s):
        if CSP: s.send_header('Content-Security-Policy',CSP)
        super().end_headers()
    def log_message(s,*a): pass
http.server.ThreadingHTTPServer(('127.0.0.1',8088),H).serve_forever()
