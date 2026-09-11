'use strict';
let managerItems=[], managerRevision, managerFolders=[], managerFolder='*', managerCategory='*', managerQuery='', managerKind='all';
let managerBusy=false;
const mediaURL=url=>url.replace(/^\.\.\/\.\.\//,'/');
const safeLink=value=>{try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:null;}catch{return null;}};

async function loadManagement(kind){
    const root=document.querySelector('#management');root.innerHTML='<p class="hint">Verwaltung wird geladen …</p>';
    managerQuery='';
    try{
        const result=await api(kind==='links'?'/api/studio/content/links':'/api/studio/media');
        if(type!==kind)return;
        if(kind==='links'){managerItems=result.data;managerRevision=result.revision;renderLinks();}
        else{managerItems=result.items;managerFolders=result.folders;renderAssets();}
    }catch(error){root.textContent=error.message;root.append(button('Erneut versuchen',()=>loadManagement(kind)));}
}
function managerShell(title,subtitle){
    const root=$('#management');root.innerHTML=`<div class="manager-heading"><div><span class="eyebrow">${esc(title)}</span><h2>${esc(subtitle)}</h2></div><div class="manager-actions"></div></div><div class="manager-toolbar"></div><p class="manager-status" role="status">Änderungen werden lokal gespeichert. Veröffentlichung über „Änderungen prüfen“.</p><div class="manager-body"></div>`;return root;
}
function searchBox(label,onInput){const input=document.createElement('input');input.type='search';input.placeholder=label;input.setAttribute('aria-label',label);input.value=managerQuery;input.oninput=()=>{managerQuery=input.value;onInput();};return input;}
function dialog(title){
    $('#manager-dialog')?.remove();const el=document.createElement('dialog');el.id='manager-dialog';
    el.innerHTML=`<div class="dialog-heading"><h2>${esc(title)}</h2></div><div class="manager-dialog-body"></div>`;
    const close=button('×',()=>{if(managerBusy)return;if(!dirty||confirm('Ungespeicherte Eingaben verwerfen?'))el.close();});close.setAttribute('aria-label','Schliessen');el.querySelector('.dialog-heading').append(close);
    el.addEventListener('cancel',event=>{if(managerBusy||(dirty&&!confirm('Ungespeicherte Eingaben verwerfen?')))event.preventDefault();});
    el.addEventListener('close',()=>{saved();el.remove();});document.body.append(el);el.showModal();return el;
}
function labeled(label,value,options={}){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.value=value||'';input.type=options.type||'text';input.required=!!options.required;if(options.name)input.name=options.name;wrap.append(input);return wrap;}
function setStatus(message){const target=$('#management .manager-status');if(target)target.textContent=message;}

function renderLinks(){
    const root=managerShell('LINKSAMMLUNG','Links verwalten');root.querySelector('.manager-actions').append(button('＋ Link hinzufügen',()=>editLink(-1),'primary'));
    const toolbar=root.querySelector('.manager-toolbar');toolbar.append(searchBox('Name oder Adresse suchen …',drawLinks));
    const select=document.createElement('select');select.setAttribute('aria-label','Link-Kategorie');select.add(new Option('Alle Kategorien','*'));[...new Set(managerItems.map(i=>i.category||''))].sort().forEach(c=>select.add(new Option(c||'Ohne Kategorie',c)));if(![...select.options].some(o=>o.value===managerCategory))managerCategory='*';select.value=managerCategory;select.onchange=()=>{managerCategory=select.value;drawLinks();};toolbar.append(select);
    root.querySelector('.manager-body').innerHTML='<div class="table-scroll"><table class="links-table"><thead><tr><th>Name / Adresse</th><th>Kategorie</th><th>Aktionen</th></tr></thead><tbody></tbody></table></div><p class="manager-count"></p>';drawLinks();
}
function drawLinks(){
    const body=$('#management tbody');body.replaceChildren();let count=0;
    managerItems.forEach((item,index)=>{
        if(managerCategory!=='*'&&(item.category||'')!==managerCategory)return;
        if(!`${item.name} ${item.url}`.toLowerCase().includes(managerQuery.toLowerCase()))return;
        count++;const tr=document.createElement('tr'),main=document.createElement('td'),category=document.createElement('td'),actions=document.createElement('td');
        const name=document.createElement('strong');name.textContent=item.name||'Ohne Namen';main.append(name);
        const target=safeLink(item.url);const url=document.createElement(target?'a':'span');url.textContent=item.url||'Keine Adresse';if(target){url.href=target;url.target='_blank';url.rel='noopener noreferrer';}main.append(url);
        const badge=document.createElement('span');badge.className='category-tag';badge.textContent=item.category||'Ohne Kategorie';category.append(badge);
        actions.className='row-actions';actions.append(button('Bearbeiten',()=>editLink(index)),button('Entfernen',async()=>{
            if(managerBusy||!confirm(`„${item.name}“ aus der Linksammlung entfernen?`))return;
            managerBusy=true;try{const next=managerItems.filter((_,i)=>i!==index);const result=await api('/api/studio/content/links',{data:next,revision:managerRevision},'PUT');managerItems=next;managerRevision=result.revision;renderLinks();notice('Link lokal entfernt.');}finally{managerBusy=false;}
        },'danger'));tr.append(main,category,actions);body.append(tr);
    });
    if(!count){const row=document.createElement('tr');row.innerHTML='<td colspan="3" class="empty">Keine passenden Links. Passe den Filter an oder füge einen Link hinzu.</td>';body.append(row);}
    $('#management .manager-count').textContent=`${count} von ${managerItems.length} Links`;
}
function editLink(index){
    if(managerBusy)return;
    const item=index<0?{name:'',url:'',category:''}:managerItems[index];const el=dialog(index<0?'Link hinzufügen':'Link bearbeiten');
    const form=document.createElement('form');const fields=document.createElement('fieldset');
    fields.append(labeled('Name',item.name,{name:'name',required:true}),labeled('Webadresse',item.url,{name:'url',type:'url',required:true}),labeled('Kategorie',item.category,{name:'category'}));
    const categories=document.createElement('datalist');categories.id='link-categories';[...new Set(managerItems.map(i=>i.category).filter(Boolean))].sort().forEach(c=>categories.append(new Option(c,c)));fields.querySelector('[name=category]').setAttribute('list',categories.id);fields.append(categories);
    const submit=document.createElement('button');submit.type='submit';submit.className='primary';submit.textContent='Lokal speichern';fields.append(submit);form.append(fields);el.querySelector('.manager-dialog-body').append(form);
    form.oninput=()=>{dirty=true;};form.onsubmit=safely(async event=>{event.preventDefault();if(managerBusy)return;const values=new FormData(form);const name=values.get('name').trim();const url=safeLink(values.get('url').trim());if(!name||!url)throw Error('Bitte einen Namen und eine gültige http- oder https-Adresse eingeben.');const next=structuredClone(managerItems);const record={...item,name,url,category:values.get('category').trim()};if(index<0)next.push(record);else next[index]=record;
        managerBusy=true;fields.disabled=true;try{const result=await api('/api/studio/content/links',{data:next,revision:managerRevision},'PUT');managerItems=next;managerRevision=result.revision;saved();el.close();renderLinks();notice('Link lokal gespeichert.');}finally{managerBusy=false;fields.disabled=false;}
    });
}

function renderAssets(){
    const root=managerShell('MEDIATHEK','Dateien organisieren');const actions=root.querySelector('.manager-actions');
    actions.append(button('Ordner erstellen',newMediaFolder),button('＋ Dateien hochladen',chooseUpload,'primary'));
    const toolbar=root.querySelector('.manager-toolbar');toolbar.append(searchBox('Dateinamen suchen …',drawAssets));const select=document.createElement('select');select.setAttribute('aria-label','Dateityp');for(const [value,label]of [['all','Alle Dateitypen'],['image','Bilder'],['video','Videos'],['document','Dokumente']])select.add(new Option(label,value));select.value=managerKind;select.onchange=()=>{managerKind=select.value;drawAssets();};toolbar.append(select);
    root.querySelector('.manager-body').innerHTML='<div class="asset-layout"><aside class="folder-sidebar" aria-label="Medienordner"><h3>Ordner</h3><div></div></aside><section class="asset-results"><div class="asset-breadcrumb"></div><div class="asset-grid"></div><p class="manager-count"></p></section></div>';
    if(managerFolder!=='*'&&!managerFolders.includes(managerFolder))managerFolder='*';
    const folders=root.querySelector('.folder-sidebar>div');for(const folder of ['*',...managerFolders]){
        const b=button('',()=>{managerFolder=folder;root.querySelectorAll('[data-folder]').forEach(el=>el.classList.toggle('active',el.dataset.folder===folder));drawAssets();});b.dataset.folder=folder;b.classList.toggle('active',managerFolder===folder);
        const count=managerItems.filter(item=>folder==='*'||item.folder===folder).length;b.innerHTML=`<span>${folder==='*'?'Alle Dateien':esc(folder||'Hauptordner')}</span><small>${count}</small>`;folders.append(b);
    }
    drawAssets();
}
function drawAssets(){
    const grid=$('#management .asset-grid');grid.replaceChildren();const items=managerItems.filter(item=>(managerFolder==='*'||item.folder===managerFolder)&&item.title.toLowerCase().includes(managerQuery.toLowerCase())&&(managerKind==='all'||(managerKind==='image'?item.image:managerKind==='video'?/\.(mp4|mov|webm)$/i.test(item.url):/\.pdf$/i.test(item.url))));
    $('#management .asset-breadcrumb').textContent=managerFolder==='*'?'Alle Dateien':managerFolder||'Hauptordner';
    for(const item of items){const card=button('',()=>assetDetails(item),'asset-card');const visual=document.createElement('div');visual.className='asset-visual';if(item.image){const img=document.createElement('img');img.src=mediaURL(item.url);img.alt='';img.loading='lazy';visual.append(img);}else{visual.classList.add('asset-file');visual.textContent=/\.pdf$/i.test(item.url)?'PDF':'VIDEO';}const name=document.createElement('strong');name.textContent=item.title;const meta=document.createElement('small');meta.textContent=`${item.variants.length} Varianten · ${item.folder||'Hauptordner'}`;card.append(visual,name,meta);grid.append(card);}
    if(!items.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=managerQuery||managerKind!=='all'?'Keine passenden Dateien. Passe die Suche oder den Dateityp an.':'Dieser Ordner ist leer. Lade hier deine ersten Dateien hoch.';grid.append(empty);}
    $('#management .manager-count').textContent=`${items.length} von ${managerItems.length} Medien · Ein Eintrag je Original`;
}
async function refreshAssets(){const result=await api('/api/studio/media');if(type!=='media')return;managerItems=result.items;managerFolders=result.folders;renderAssets();}
function newMediaFolder(){if(managerBusy)return;const el=dialog('Ordner erstellen');const form=document.createElement('form');const label=labeled('Ordnername',managerFolder&&managerFolder!=='*'?managerFolder+'/':'',{name:'folder',required:true});const hint=document.createElement('p');hint.className='hint';hint.textContent='Unterordner mit / trennen, zum Beispiel Reisen/Schweiz.';const submit=document.createElement('button');submit.type='submit';submit.className='primary';submit.textContent='Ordner erstellen';form.append(label,hint,submit);el.querySelector('.manager-dialog-body').append(form);form.oninput=()=>{dirty=true;};form.onsubmit=safely(async e=>{e.preventDefault();if(managerBusy)return;const folder=form.elements.folder.value.trim();managerBusy=true;submit.disabled=true;try{await api('/api/studio/media/folders',{folder});managerFolder=folder;saved();el.close();await refreshAssets();notice('Ordner erstellt.');}finally{managerBusy=false;submit.disabled=false;}});}
function uploadWithProgress(body,onProgress){
    return new Promise((resolve,reject)=>{
        const xhr=new XMLHttpRequest();xhr.open('POST','/api/upload');xhr.setRequestHeader('X-CMS-Token',token);
        xhr.upload.addEventListener('progress',event=>onProgress(event.lengthComputable?Math.round(event.loaded/event.total*100):null,false));
        xhr.upload.addEventListener('load',()=>onProgress(null,true));
        xhr.addEventListener('load',()=>{let result;try{result=JSON.parse(xhr.responseText);}catch{reject(Error('Ungültige Serverantwort (HTTP '+xhr.status+').'));return;}if(xhr.status<200||xhr.status>=300||!result.success){reject(Error(result.error||'Upload fehlgeschlagen (HTTP '+xhr.status+').'));return;}resolve(result);});
        xhr.addEventListener('error',()=>reject(Error('Verbindung zum lokalen CMS unterbrochen. Bitte vor einem erneuten Upload prüfen, ob die Datei bereits angekommen ist.')));
        xhr.addEventListener('abort',()=>reject(Error('Upload abgebrochen.')));
        xhr.send(body);
    });
}
function chooseUpload(){
    if(managerBusy)return;
    const input=document.createElement('input');input.type='file';input.accept='image/*,video/*,application/pdf';input.multiple=true;input.hidden=true;document.body.append(input);
    input.addEventListener('cancel',()=>input.remove());
    input.onchange=safely(async()=>{
        const files=[...input.files];input.remove();if(!files.length)return;
        const folder=managerFolder==='*'?'uploads':managerFolder;
        const el=dialog('Dateien werden hochgeladen');el.classList.add('upload-dialog');const host=el.querySelector('.manager-dialog-body');
        const info=document.createElement('p');info.className='hint';info.textContent='Ziel: '+(folder||'Hauptordner')+'. Nach der Übertragung werden die Bildformate und Grössen erstellt.';
        const total=document.createElement('p');total.className='upload-total';total.setAttribute('role','status');total.textContent=`0 von ${files.length} Dateien abgeschlossen`;
        host.append(info,total);
        const rows=files.map(file=>{const row=document.createElement('div');row.className='upload-row';const name=document.createElement('strong');name.textContent=file.name;const stage=document.createElement('span');stage.textContent='Wartet';stage.setAttribute('role','status');const bar=document.createElement('progress');bar.max=100;bar.value=0;bar.setAttribute('aria-label',file.name);row.append(name,stage,bar);host.append(row);return {row,stage,bar};});
        managerBusy=true;dirty=true;let finished=0,background=0;
        try{
            ({token}=await api('/api/studio/session'));
            for(let i=0;i<files.length;i++){
                const file=files[i],view=rows[i];view.stage.textContent='Übertragung beginnt …';
                const body=new FormData();body.append('file',file);body.append('originalName',file.name);body.append('folder',folder);
                let result;
                try{result=await uploadWithProgress(body,(percent,processing)=>{
                    if(processing){view.stage.textContent=file.type.startsWith('image/')?'Bild wird optimiert · Formate und Grössen werden erstellt …':'Datei wird verarbeitet …';view.bar.removeAttribute('value');}
                    else{view.stage.textContent=percent===null?'Wird übertragen …':`Übertragung: ${percent} %`;if(percent===null)view.bar.removeAttribute('value');else view.bar.value=percent;}
                });}catch(error){view.stage.textContent=error.message;view.row.classList.add('upload-failed');view.bar.hidden=true;throw error;}
                finished++;view.bar.value=100;view.row.classList.add('upload-done');
                if(result.isAsync){background++;view.stage.textContent='Übertragen · Videokonvertierung läuft im Hintergrund';}else view.stage.textContent='Fertig · lokal gespeichert';
                total.textContent=`${finished} von ${files.length} Dateien abgeschlossen`;
            }
            managerFolder=folder;
            el.querySelector('h2').textContent='Upload abgeschlossen';
            if(background)total.textContent=`${finished} Dateien übertragen · ${background} Videos werden noch konvertiert.`;
            try{await refreshAssets();}catch{info.textContent='Die Dateien sind gespeichert. Bitte die Mediathek neu laden, um sie anzuzeigen.';}
            setStatus(`${finished} Dateien lokal hochgeladen.`);
        }catch(error){
            el.querySelector('h2').textContent='Upload unterbrochen';total.textContent=`${finished} von ${files.length} Dateien gespeichert. Erfolgreiche Uploads bleiben erhalten.`;
            for(let i=finished+1;i<rows.length;i++)rows[i].stage.textContent='Nicht hochgeladen';
            try{await refreshAssets();}catch{}
            throw error;
        }finally{
            managerBusy=false;saved();host.append(button('Schliessen',()=>el.close(),'primary'));
        }
    });input.click();
}
function assetDetails(item){
    if(managerBusy)return;const el=dialog(item.title);el.classList.add('asset-dialog');const body=el.querySelector('.manager-dialog-body');
    const preview=document.createElement('div');preview.className='asset-detail-preview';if(item.image){const img=document.createElement('img');img.src=mediaURL(item.url);img.alt=item.title;preview.append(img);}else if(/\.(mp4|mov|webm)$/i.test(item.url)){const video=document.createElement('video');video.src=mediaURL(item.url);video.controls=true;preview.append(video);}else preview.textContent='PDF-Dokument';body.append(preview);
    const info=document.createElement('p');info.className='hint';info.textContent=`${item.folder||'Hauptordner'} · ${item.variants.length} Formate und Grössen`;body.append(info);
    const actions=document.createElement('div');actions.className='asset-detail-actions';const link=document.createElement('a');link.href=mediaURL(item.url);link.target='_blank';link.rel='noopener';link.textContent='Datei öffnen ↗';actions.append(link,button('Pfad kopieren',async()=>{await navigator.clipboard.writeText(item.url);notice('Medienpfad kopiert.');}));body.append(actions);
    const form=document.createElement('form');const label=document.createElement('label');label.textContent='In Ordner verschieben';const select=document.createElement('select');select.name='folder';managerFolders.forEach(folder=>select.add(new Option(folder||'Hauptordner',folder)));select.value=item.folder;label.append(select);const submit=document.createElement('button');submit.type='submit';submit.textContent='Verschieben';form.append(label,submit);form.onsubmit=safely(async e=>{e.preventDefault();if(managerBusy||select.value===item.folder)return;managerBusy=true;submit.disabled=true;try{const result=await api('/api/studio/media/move',{id:item.id,folder:select.value});managerFolder=select.value;el.close();await refreshAssets();notice(`${result.files} Dateien verschoben; ${result.updated} Inhaltsdateien aktualisiert.`);}finally{managerBusy=false;submit.disabled=false;}});body.append(form);
    const variants=document.createElement('details');variants.className='variants';const summary=document.createElement('summary');summary.textContent=`Alle Varianten (${item.variants.length})`;variants.append(summary);item.variants.forEach(url=>{const a=document.createElement('a');a.href=mediaURL(url);a.target='_blank';a.rel='noopener';a.textContent=url.split('/').pop();variants.append(a);});body.append(variants);
}
