#!/usr/bin/env python3
import base64, io, json, os, secrets, subprocess, sys, threading, webbrowser, zipfile
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from PIL import Image, ImageOps, ImageCms
ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get('MKW_DATA_DIR', str(ROOT / 'lokale-daten')))
PORT = int(os.environ.get('MKW_PORT', '8765'))
TOKEN = secrets.token_urlsafe(32)
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
Image.MAX_IMAGE_PIXELS = 80000000

def normalize(raw):
    with Image.open(io.BytesIO(raw)) as src:
        if src.width * src.height > 80000000: raise ValueError('Bild hat mehr als 80 Millionen Pixel.')
        src.load()
        im = ImageOps.exif_transpose(src)
        profile = src.info.get('icc_profile')
        warning = ''
        alpha = im.getchannel('A') if im.mode == 'RGBA' else None
        if profile:
            try:
                im = ImageCms.profileToProfile(im, ImageCms.ImageCmsProfile(io.BytesIO(profile)), ImageCms.createProfile('sRGB'), outputMode='RGB')
            except Exception as e:
                raise ValueError('Eingebettetes Farbprofil kann nicht sicher nach sRGB konvertiert werden: ' + str(e))
        else:
            warning = 'Kein Farbprofil: sRGB angenommen.'
            im = im.convert('RGBA' if 'A' in im.getbands() or 'transparency' in im.info else 'RGB')
        if alpha is not None:
            im.putalpha(alpha)
        out = io.BytesIO()
        im.save(out, 'PNG', icc_profile=SRGB)
        return dict(data='data:image/png;base64,' + base64.b64encode(out.getvalue()).decode(), width=im.width, height=im.height, warning=warning)

def jpg(raw):
    with Image.open(io.BytesIO(raw)) as im:
        out=io.BytesIO()
        im.convert('RGB').save(out, 'JPEG', quality=100, subsampling=0, icc_profile=SRGB)
        return out.getvalue()

class Handler(BaseHTTPRequestHandler):
    def reply(self, data, kind='application/json', status=200):
        if not isinstance(data, bytes): data=json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'")
        self.end_headers(); self.wfile.write(data)
    def valid_host(self):
        return self.headers.get('Host') in (f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}')
    def do_GET(self):
        if not self.valid_host(): return self.reply({'error':'Host nicht erlaubt'}, status=403)
        path=self.path.split('?')[0]
        if path=='/api/srgb': return self.reply(SRGB, 'application/octet-stream')
        if path=='/api/session': return self.reply({'token':TOKEN})
        if path=='/api/autosave':
            p=DATA/'autosave.mkw'
            return self.reply(p.read_bytes() if p.exists() else b'null')
        files={'/':'index.html','/fonts/ReplicaLL-Bold.otf':'static/fonts/ReplicaLL-Bold.otf','/state.js':'static/state.js','/layout.js':'static/layout.js','/renderer.js':'static/renderer.js','/studio.js':'static/studio.js','/psd.js':'static/psd.js','/start.js':'static/start.js','/vendor/ag-psd.js':'static/vendor/ag-psd.js','/style.css':'static/style.css','/core.js':'static/core.js','/logo-black.svg':'mkw-logo-bold-pos.svg','/logo-white.svg':'mkw-logo-bold-neg.svg'}
        if path not in files: return self.reply({'error':'Nicht gefunden'},status=404)
        p=ROOT/files[path]
        mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.otf':'font/otf'}[p.suffix]
        self.reply(p.read_bytes(),mime)
    def do_POST(self):
        if not self.valid_host() or self.headers.get('X-MKW-Token')!=TOKEN: return self.reply({'error':'Zugriff verweigert'},status=403)
        try:
            size=int(self.headers.get('Content-Length','0'))
            if size>600*1024*1024: raise ValueError('Anfrage zu gross (maximal 600 MB).')
            raw=self.rfile.read(size)
            if self.path=='/api/import': return self.reply(normalize(raw))
            if self.path=='/api/jpg': return self.reply(jpg(raw),'image/jpeg')
            if self.path=='/api/autosave':
                json.loads(raw); DATA.mkdir(exist_ok=True)
                tmp=DATA/'autosave.tmp'; tmp.write_bytes(raw); tmp.replace(DATA/'autosave.mkw')
                return self.reply({'ok':True})
            if self.path=='/api/folder':
                if sys.platform!='darwin': raise ValueError('Ordnerdialog benötigt macOS. Bitte ZIP verwenden.')
                result=subprocess.run(['osascript','-e','POSIX path of (choose folder with prompt "Zielordner für JPGs wählen")'],capture_output=True,text=True)
                if result.returncode: raise ValueError('Ordnerwahl abgebrochen.')
                self.server.export_folder=Path(result.stdout.strip())
                return self.reply({'folder':str(self.server.export_folder)})
            if self.path=='/api/export':
                payload=json.loads(raw); folder=getattr(self.server,'export_folder',None)
                if not folder: raise ValueError('Zuerst Zielordner wählen.')
                name=payload['name']
                if Path(name).name!=name or not name.endswith('.jpg'): raise ValueError('Ungültiger Dateiname.')
                data=jpg(base64.b64decode(payload['png'].split(',')[1]))
                try:
                    with (folder/name).open('xb') as f: f.write(data)
                except FileExistsError: raise ValueError('Datei existiert bereits, nicht überschrieben: '+name)
                return self.reply({'ok':True})
            if self.path=='/api/zip':
                items=json.loads(raw); out=io.BytesIO()
                with zipfile.ZipFile(out,'w',zipfile.ZIP_STORED) as z:
                    for item in items: z.writestr(item['name'], base64.b64decode(item['jpg'].split(',')[1]))
                return self.reply(out.getvalue(),'application/zip')
            self.reply({'error':'Nicht gefunden'},status=404)
        except Exception as e: self.reply({'error':str(e)},status=400)
    def log_message(self, *args): pass

if __name__=='__main__':
    try: server=ThreadingHTTPServer(('127.0.0.1',PORT),Handler)
    except OSError as error:
        print(str(error)); print('Port 8765 ist belegt. Ein bereits geöffnetes Tool unter http://127.0.0.1:8765 verwenden oder den anderen Dienst beenden.'); sys.exit(1)
    print(f'MKW Studio läuft lokal: http://127.0.0.1:{PORT} — Beenden mit Ctrl+C')
    if '--no-browser' not in sys.argv: threading.Timer(.5,lambda:webbrowser.open(f'http://127.0.0.1:{PORT}')).start()
    try: server.serve_forever()
    except KeyboardInterrupt: server.server_close()
