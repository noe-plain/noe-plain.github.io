"""Independent ZIP/XML checks for the experimental single empty IDML page."""
import io, json, sys, zipfile
import xml.etree.ElementTree as ET
archive = zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))
entries = archive.infolist()
assert entries[0].filename == 'mimetype' and entries[0].compress_type == zipfile.ZIP_STORED
assert archive.read('mimetype') == b'application/vnd.adobe.indesign-idml-package'
assert len(entries) == len(set(archive.namelist())) == 8
assert archive.testzip() is None
assert all(not n.startswith('/') and '..' not in n.split('/') for n in archive.namelist())
roots = {n: ET.fromstring(archive.read(n)) for n in archive.namelist() if n.endswith('.xml')}
container = roots['META-INF/container.xml']
assert container.find('.//{urn:oasis:names:tc:opendocument:xmlns:container}rootfile').get('full-path') == 'designmap.xml'
design = roots['designmap.xml']
refs = [el.get('src') for el in design if el.tag.startswith('{http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging}')]
assert len(refs) == 5 and all(n in roots for n in refs)
ids = [el.get('Self') for root in roots.values() for el in root.iter() if el.get('Self')]
assert len(ids) == len(set(ids))
pages = [el for root in roots.values() for el in root.iter('Page')]
assert len(pages) == 1
bounds = [float(v) for v in pages[0].get('GeometricBounds').split()]
prefs = roots['Resources/Preferences.xml'].find('DocumentPreference')
assert prefs.get('FacingPages') == 'false' and prefs.get('PagesPerDocument') == '1'
assert bounds == [0, 0, float(prefs.get('PageHeight')), float(prefs.get('PageWidth'))]
assert not any(el.tag in ('TextFrame','Rectangle','Story') for root in roots.values() for el in root.iter())
print(json.dumps({'width':bounds[3], 'height':bounds[2], 'name':design.get('Name'), 'pages':len(pages)}))
