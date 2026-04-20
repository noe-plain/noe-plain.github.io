import json
import random
import string

def get_id():
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=9))

def migrate_design(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)
        
    for p in data:
        blocks = []
        if 'images' in p:
            gallery_items = []
            for img in p['images']:
                if img.get('type') == 'pdf':
                    blocks.append({
                        'id': img.get('id', get_id()),
                        'type': 'pdf',
                        'title': img.get('title', ''),
                        'imageUrl': img.get('imageUrl', ''),
                        'pdfUrl': img.get('pdfUrl', '')
                    })
                elif img.get('imageUrl'):
                    gallery_items.append({'imageUrl': img.get('imageUrl'), 'title': img.get('title', '')})
                    
            if gallery_items:
                blocks.append({
                    'id': get_id(),
                    'type': 'gallery',
                    'title': 'Galerie',
                    'items': gallery_items
                })
            
            p['blocks'] = blocks
            del p['images']
            
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def migrate_video(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)
        
    for p in data:
        blocks = []
        
        if 'pdf' in p and p['pdf']:
            pdf = p['pdf']
            blocks.append({
                'id': get_id(),
                'type': 'pdf',
                'title': pdf.get('title', 'Dokumentation'),
                'pdfUrl': pdf.get('link', ''),
                'imageUrl': pdf.get('image', '')
            })
            
        if 'videos' in p and p['videos']:
            for v in p['videos']:
                blocks.append({
                    'id': get_id(),
                    'type': 'youtube',
                    'title': v.get('title', ''),
                    'videoId': v.get('youtubeId', ''),
                    'tags': ', '.join(v.get('tags', [])) if isinstance(v.get('tags'), list) else ''
                })
                
        p['blocks'] = blocks
        if 'pdf' in p: del p['pdf']
        if 'videos' in p: del p['videos']
        
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

migrate_video('/Users/noeplain/Developer/noe-plain.github.io/portfolio/projekte/video-projects.json')
print('Migrated video-projects.json')
migrate_design('/Users/noeplain/Developer/noe-plain.github.io/portfolio/projekte/designs.json')
print('Migrated designs.json')
migrate_design('/Users/noeplain/Developer/noe-plain.github.io/portfolio/projekte/illustrations.json')
print('Migrated illustrations.json')
