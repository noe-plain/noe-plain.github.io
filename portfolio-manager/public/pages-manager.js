'use strict';
let pageEntries=[],pageSection='*',pageQuery='';
async function loadPagesOverview(){
 const root=$('#management');root.innerHTML='<p class="hint">Seiten werden geladen …</p>';
 try{const paths=await api('/api/studio/pages');const entries=await Promise.all(paths.map(async file=>{const result=await api('/api/studio/page?file='+encodeURIComponent(file));const doc=new DOMParser().parseFromString(result.html,'text/html');return {file,title:doc.title||file,description:doc.querySelector('meta[name="description"]')?.content||'',section:file.includes('/')?file.slice(0,file.lastIndexOf('/')):'Hauptseiten'};}));if(type!=='pages')return;pages=paths;pageEntries=entries;renderPagesOverview();}catch(error){root.textContent=error.message;root.append(button('Erneut versuchen',loadPagesOverview));}
}
function renderPagesOverview(){
 const root=managerShell('SEITENVERWALTUNG','Seiten im Überblick');root.querySelector('.manager-actions').append(button('＋ Seite aus Vorlage',()=>newPageDialog(),'primary'));
 root.querySelector('.manager-status').textContent='Wähle eine Seite zum Bearbeiten. Neue Seiten übernehmen das Layout einer vorhandenen Vorlage.';
 const search=document.createElement('input');search.type='search';search.placeholder='Titel oder Seitenadresse suchen …';search.setAttribute('aria-label','Seiten suchen');search.value=pageQuery;search.oninput=()=>{pageQuery=search.value;drawPages();};
 const folders=document.createElement('select');folders.setAttribute('aria-label','Seitenbereich');folders.add(new Option('Alle Bereiche','*'));[...new Set(pageEntries.map(p=>p.section))].sort().forEach(s=>folders.add(new Option(s,s)));folders.value=pageSection;folders.onchange=()=>{pageSection=folders.value;drawPages();};root.querySelector('.manager-toolbar').append(search,folders);
 root.querySelector('.manager-body').innerHTML='<div class="pages-grid"></div><p class="manager-count"></p>';drawPages();
}
function drawPages(){
 const grid=$('#management .pages-grid');grid.replaceChildren();const items=pageEntries.filter(p=>(pageSection==='*'||p.section===pageSection)&&`${p.title} ${p.file}`.toLowerCase().includes(pageQuery.toLowerCase()));
 for(const page of items){const card=document.createElement('article');card.className='page-card';const kind=page.file==='index.html'?'Startseite':page.file.startsWith('portfolio/projekte/')?'Projektvorlage':'Seite';card.innerHTML=`<div class="page-card-meta"><span class="category-tag">${esc(kind)}</span><span>${esc(page.section)}</span></div><h3>${esc(page.title)}</h3><p class="page-address">/${esc(page.file)}</p><p class="page-description">${esc(page.description||(kind==='Projektvorlage'?'Das Layout dieser Seite wird von den jeweiligen Projekten verwendet.':'Bestehende Website-Seite'))}</p><div class="page-card-actions"></div>`;card.querySelector('.page-card-actions').append(button('Bearbeiten',()=>openPageEditor(page.file),'primary'),button('Vorschau',()=>previewPage(page.file)),button('Kopieren',()=>newPageDialog(page.file)));grid.append(card);}
 if(!items.length)grid.innerHTML='<p class="empty">Keine Seiten für diese Suche gefunden.</p>';$('#management .manager-count').textContent=`${items.length} von ${pageEntries.length} Seiten`;
}
async function openPageEditor(file,draft){
 if(!draft&&!discard())return;
 const result=draft||await api('/api/studio/page?file='+encodeURIComponent(file));
 pageFile=file;pageHtml=result.html;revision=result.revision;data=[{id:file,title:file}];selected=0;saved();
 $('#management').hidden=true;$('.workspace').hidden=false;$('.workspace').classList.add('page-workspace');$('#page-editor-nav').hidden=false;$('#page-editor-path').textContent='/'+file;
 $('#back-to-pages').onclick=safely(()=>navigate('pages'));$('#editing-title').textContent=new DOMParser().parseFromString(pageHtml,'text/html').title||file;
 renderFields();if(draft)mark();else schedulePreview();
}
async function previewPage(file){
 const el=dialog('Seitenvorschau');el.classList.add('page-preview-dialog');const result=await api('/api/studio/page?file='+encodeURIComponent(file));const id=crypto.randomUUID();const preview=await api('/api/studio/preview',{id,file,html:result.html});
 if(!el.isConnected)return;const frame=document.createElement('iframe');frame.title='Originalansicht: '+file;frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-downloads');frame.src=preview.prefix+file;el.querySelector('.manager-dialog-body').append(frame);
}
function newPageDialog(source){
 if(!pageEntries.length){notice('Es ist keine vorhandene Seite als Vorlage verfügbar.',true);return;}
 const el=dialog('Seite aus Vorlage erstellen');const form=document.createElement('form');const templateLabel=document.createElement('label');templateLabel.textContent='Vorlage';const template=document.createElement('select');template.name='template';pageEntries.forEach(page=>template.add(new Option(page.title+' · '+page.file,page.file)));template.value=source||pageEntries[0].file;templateLabel.append(template);
 const filename=labeled('Neue Seitenadresse','',{name:'filename',required:true});filename.querySelector('input').placeholder='zum-beispiel-ueber-mich';filename.querySelector('input').pattern='[a-z0-9][a-z0-9_-]*';
 const hint=document.createElement('p');hint.className='hint';const updateHint=()=>{hint.textContent='Die Kopie wird im selben Ordner erstellt: /'+template.value.slice(0,template.value.lastIndexOf('/')+1)+'… .html';};template.onchange=updateHint;updateHint();const submit=document.createElement('button');submit.type='submit';submit.className='primary';submit.textContent='Kopie im Editor öffnen';form.append(templateLabel,filename,hint,submit);el.querySelector('.manager-dialog-body').append(form);
 form.onsubmit=safely(async event=>{event.preventDefault();if(managerBusy)return;const name=form.elements.filename.value.trim();if(!/^[a-z0-9][a-z0-9_-]*$/.test(name))throw Error('Bitte Kleinbuchstaben, Zahlen und Bindestriche verwenden.');const file=template.value.slice(0,template.value.lastIndexOf('/')+1)+name+'.html';if(pages.includes(file))throw Error('Diese Seitenadresse existiert bereits.');managerBusy=true;submit.disabled=true;try{const original=await api('/api/studio/page?file='+encodeURIComponent(template.value));el.close();await openPageEditor(file,{html:original.html,revision:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'});notice('Kopie geöffnet. Speichere die neue Seite lokal und verlinke sie anschliessend.');}finally{managerBusy=false;submit.disabled=false;}});
}
function renderPageForm(root){
 const note=document.createElement('p');note.className='hint';note.textContent='HTML direkt bearbeiten. Die Vorschau zeigt deine Änderungen vor dem Speichern.';root.append(note);
 const label=document.createElement('label');label.textContent='HTML der gesamten Seite';
 const source=document.createElement('textarea');source.className='html-source page-html-editor';source.value=pageHtml;source.spellcheck=false;source.wrap='off';source.autocapitalize='off';source.setAttribute('autocomplete','off');source.setAttribute('aria-label','HTML der gesamten Seite');
 source.addEventListener('input',()=>{pageHtml=source.value;mark();});
 label.append(source);root.append(label);
}
