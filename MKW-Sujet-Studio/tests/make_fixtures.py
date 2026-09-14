from PIL import Image
from pathlib import Path
p=Path('/private/tmp/mkw-fixtures');p.mkdir(exist_ok=True)
for fmt,ext in [('PNG','png'),('TIFF','tiff'),('WEBP','webp')]:
    Image.new('RGBA',(80,60),(230,20,50,128)).save(p/f'test.{ext}',fmt)
(p/'broken.jpg').write_bytes(b'broken image')
(p/'broken.otf').write_bytes(b'broken font')
