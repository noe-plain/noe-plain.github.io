import base64, io, json, tempfile, threading, unittest, urllib.request, urllib.error, zipfile, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server
from PIL import Image, ImageCms

def raw_image(fmt='PNG',mode='RGB',size=(120,80),**kwargs):
    im=Image.new(mode,size,(210,70,35,110) if mode=='RGBA' else (210,70,35));out=io.BytesIO();im.save(out,fmt,**kwargs);return out.getvalue()

class Images(unittest.TestCase):
    def test_formats(self):
        for fmt in ('JPEG','PNG','TIFF','WEBP'):
            with self.subTest(fmt=fmt):
                raw=raw_image(fmt);n=server.normalize(raw)
                self.assertEqual((n['width'],n['height']),(120,80));self.assertTrue(n['data'].startswith('data:image/png;base64,'))
    def test_exif(self):
        exif=Image.Exif();exif[274]=6
        n=server.normalize(raw_image('JPEG',exif=exif))
        self.assertEqual((n['width'],n['height']),(80,120))
    def test_exif_capture_date(self):
        exif=Image.Exif();exif[36867]='2026:08:31 19:30:00'
        n=server.normalize(raw_image('JPEG',exif=exif))
        self.assertEqual((n['captureDate'],n['captureDay']),('31.08.26','Montag'))
    def test_alpha(self):
        n=server.normalize(raw_image(mode='RGBA'));im=Image.open(io.BytesIO(base64.b64decode(n['data'].split(',')[1])))
        self.assertEqual(im.getpixel((0,0))[3],110)
    def test_profile(self):
        n=server.normalize(raw_image(icc_profile=server.SRGB));self.assertEqual(n['warning'],'')
        im=Image.open(io.BytesIO(base64.b64decode(n['data'].split(',')[1])))
        self.assertEqual(im.info['icc_profile'],server.SRGB)
    def test_lab_profile_conversion(self):
        lab=Image.new('LAB',(30,20),(150,150,120))
        source=ImageCms.ImageCmsProfile(ImageCms.createProfile('LAB'))
        out=io.BytesIO();lab.save(out,'TIFF',icc_profile=source.tobytes())
        n=server.normalize(out.getvalue())
        im=Image.open(io.BytesIO(base64.b64decode(n['data'].split(',')[1])))
        expected=ImageCms.profileToProfile(lab,source,ImageCms.createProfile('sRGB'),outputMode='RGB')
        self.assertEqual(im.getpixel((0,0)),expected.getpixel((0,0)))
        self.assertEqual(im.mode,'RGB');self.assertEqual(n['warning'],'')
    def test_broken(self):
        with self.assertRaises(Exception):server.normalize(b'not an image')
        with self.assertRaises(ValueError):server.normalize(raw_image(icc_profile=b'broken'))
    def test_jpg(self):
        for wh in [(1080,1080),(1080,1920),(1080,1350),(531,719)]:
            im=Image.open(io.BytesIO(server.jpg(raw_image(size=wh))))
            self.assertEqual(im.size,wh);self.assertEqual(im.format,'JPEG');self.assertEqual(im.info['icc_profile'],server.SRGB)
            self.assertTrue(all(x==1 for table in im.quantization.values() for x in table),'quality100 quantization')
            self.assertTrue(all(part[1:3]==(1,1) for part in im.layer),'4:4:4 subsampling')

class HTTP(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory();cls.previous=server.DATA;server.DATA=Path(cls.temp.name)
        cls.http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler);cls.http.export_folder=Path(cls.temp.name)
        threading.Thread(target=cls.http.serve_forever,daemon=True).start();cls.url=f'http://127.0.0.1:{cls.http.server_port}'
    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown();cls.http.server_close();server.DATA=cls.previous;cls.temp.cleanup()
    def request(self,path,body,token=server.TOKEN):
        return urllib.request.urlopen(urllib.request.Request(self.url+path,data=body,headers={'Host':f'127.0.0.1:{self.http.server_port}','X-MKW-Token':token}))
    def test_autosave(self):
        content=b'{"version": 1, "test": "portable"}'
        self.request('/api/autosave',content);self.assertEqual((server.DATA/'autosave.mkw').read_bytes(),content)
    def test_conflict(self):
        data=json.dumps({'name':'test.jpg','png':'data:image/png;base64,'+base64.b64encode(raw_image()).decode()}).encode()
        self.request('/api/export',data);before=(server.DATA/'test.jpg').read_bytes()
        with self.assertRaises(urllib.error.HTTPError) as e:self.request('/api/export',data)
        self.assertIn('existiert',e.exception.read().decode());self.assertEqual(before,(server.DATA/'test.jpg').read_bytes())
    def test_auth(self):
        with self.assertRaises(urllib.error.HTTPError) as e:self.request('/api/autosave',b'{}',token='wrong')
        self.assertEqual(e.exception.code,403)
    def test_zip(self):
        jpg=server.jpg(raw_image());body=json.dumps([{'name':'bild.jpg','jpg':'data:image/jpeg;base64,'+base64.b64encode(jpg).decode()}]).encode()
        z=zipfile.ZipFile(io.BytesIO(self.request('/api/zip',body).read()));self.assertEqual(z.read('bild.jpg'),jpg)
    def test_bundled_harriet_fonts(self):
        for name in ('HarrietText-Bold.otf','HarrietText-BoldItalic.otf'):
            with self.subTest(name=name):
                response=urllib.request.urlopen(self.url+'/fonts/'+name)
                self.assertGreater(len(response.read()),600000)
if __name__=='__main__':unittest.main(verbosity=2)
