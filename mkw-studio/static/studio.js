'use strict';
let step='text',editingText=null,exportPlan=[];
const iconPaths={image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',crop:'<path d="M6 3v15h15M3 6h15v15"/>',text:'<path d="M4 6V3h16v3M12 3v18M8 21h8"/>',logo:'<path d="m12 3 9 5-9 13L3 8zM3 8h18M8 8l4 13 4-13M8 8l4-5 4 5"/>',export:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',undo:'<path d="m9 4-5 5 5 5M4 9h9a7 7 0 0 1 0 14" transform="translate(0 -2)"/>',redo:'<path d="m15 4 5 5-5 5m5-5h-9a7 7 0 0 0 0 14" transform="translate(0 -2)"/>',folder:'<path d="M3 7V4h7l2 3h9v13H3z"/>',save:'<path d="M4 3h13l4 4v14H3V3zM7 3v6h10V3M7 21v-8h10v8"/>',new:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 7v10M7 12h10"/>',plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',up:'<path d="m5 14 7-7 7 7"/>',down:'<path d="m5 10 7 7 7-7"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',replace:'<path d="m4 8 4-4 4 4M8 4v12m12 0-4 4-4-4m4 4V8"/>',move:'<path d="M12 2v20M2 12h20m-13-7 3-3 3 3m-6 14 3 3 3-3M5 9l-3 3 3 3m14-6 3 3-3 3"/>',layers:'<path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/>',duplicate:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>'};
function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name]||iconPaths.plus}</svg>`}
function icons(){document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);if(el.dataset.step)el.innerHTML+=`<span class="dock-label">${{import:'Bilder',text:'Text',logo:'Logo',crop:'Ausschnitt',export:'Export'}[el.dataset.step]}</span>`})}
function smallButton(name,title,action,id){return `<button class="icon-button" data-action="${action}" data-id="${esc(id)}" title="${title}" aria-label="${title}">${icon(name)}</button>`}
function on(id,event,fn){const el=$('#'+id);if(el)el.addEventListener(event,fn)}
function mutate(fn,full=true){checkpoint();fn();changed(full)}
function touchMeta(){revision++;clearTimeout(saveTimer);saveTimer=setTimeout(autosave,1200)}
const textTypes=[['date','Überschrift'],['title','Konzerttitel'],['subtitle','Untertitel']];
function textTypeSummary(b){return textTypes.filter(([key])=>b&&(b.elements[key].enabled??b.elements[key].visible)).map(([,label])=>label)}
function textTypePicker(im){const b=p.boards.find(b=>b.imageId===im.id),active=textTypeSummary(b);return `<details class="text-type-picker" data-text-picker="${esc(im.id)}"><summary aria-label="Textarten auswählen · ${esc(im.name)}"><span class="text-selection" data-text-summary>${active.join(' · ')||'Keine Texte ausgewählt'}</span><span class="text-count" data-text-count>${active.length}/3</span><svg class="picker-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="text-type-options" role="group" aria-label="Textarten · ${esc(im.name)}"><div class="picker-heading">Texte auf diesem Bild</div>${textTypes.map(([key,label])=>`<label><input type="checkbox" data-text-type="${key}" data-image="${esc(im.id)}" ${b&&(b.elements[key].enabled??b.elements[key].visible)?'checked':''}><span>${label}</span></label>`).join('')}<small>Gilt für alle Formate dieses Bildes.</small>${familyPicker(im)}</div></details>`}
function familyPicker(im){const config=familyConfig(p.boards.find(b=>b.imageId===im.id)?.family),custom=!!Object.keys(p.familyOverrides?.[im.id]||{}).length;return `<div class="family-picker"><label><input type="checkbox" data-family-mode="${esc(im.id)}" ${config.enabled?'checked':''}><span>Familienkonzert</span></label><div class="family-settings" data-family-settings="${esc(im.id)}" ${config.enabled?'':'hidden'}><div class="family-palette" data-family-palette="${esc(im.id)}" aria-label="Acht Buchstabenfarben"></div><button type="button" data-family-shift="${esc(im.id)}">Farbreihenfolge wechseln</button><small>Illustration als PNG/WebP mit transparentem Hintergrund hinzufügen. Bunte Schrift mit 2 px Kontur.</small></div><button type="button" data-family-reset="${esc(im.id)}" ${im.id!==p.images[0]?.id&&custom?'':'hidden'}>Design vom ersten Bild übernehmen</button></div>`}
function setFamilyDesign(imageId,changes){
 const first=imageId===p.images[0]?.id;p.familyOverrides??={};
 if(first)p.meta.familyDesign={...familyConfig(p.boards.find(b=>b.imageId===imageId)?.family),...changes};
 else{p.familyOverrides[imageId]??={};for(const key of Object.keys(changes))p.familyOverrides[imageId][key]=true}
 for(const b of p.boards){const next=familyConfig(b.family);let affected=false;for(const [key,value] of Object.entries(changes))if(b.imageId===imageId||first&&!p.familyOverrides[b.imageId]?.[key]){next[key]=value;affected=true}if(affected)applyFamilyBoard(b,next)}
 refreshFamilyControls();renderPanel();syncOverlays(true);
}
function refreshFamilyControls(){
 for(const im of p.images){const f=familyConfig(p.boards.find(b=>b.imageId===im.id)?.family),picker=document.querySelector(`[data-text-picker="${im.id}"]`);if(!picker)continue;picker.querySelector('[data-family-mode]').checked=f.enabled;picker.querySelector('[data-family-settings]').hidden=!f.enabled;picker.querySelector('[data-family-palette]').innerHTML=MKWFamily.runs('12345678',f.offset).map(r=>`<span style="background:${r.color}" title="${r.color}"></span>`).join('');picker.querySelector('[data-family-reset]').hidden=im.id===p.images[0]?.id||!Object.keys(p.familyOverrides?.[im.id]||{}).length}
}
function imageAction(name,label,title,action,id,disabled=false){return `<button class="image-action ${action==='removeImage'?'image-action-delete':''}" data-action="${action}" data-id="${esc(id)}" title="${title}" aria-label="${title}" ${disabled?'disabled':''}>${icon(name)}${label?`<span>${label}</span>`:''}</button>`}
function imageHeading(im,i){return `<div class="group-heading"><div class="image-heading-top"><span class="image-number" aria-label="Bild ${i+1}">${String(i+1).padStart(2,'0')}</span><div class="image-caption"><strong title="${esc(im.name)}">${esc(im.name)}</strong><small class="image-metadata">${im.width} × ${im.height} px<span aria-hidden="true"> · </span>${im.captureDate?esc(im.captureDay)+' '+esc(im.captureDate):'Kein Aufnahmedatum'}</small></div><div class="group-actions" role="group" aria-label="Bildaktionen">${imageAction('replace','Ersetzen','Bild ersetzen','replace',im.id)}<span class="action-separator"></span>${imageAction('up','','Bild nach oben','imageUp',im.id,i===0)}${imageAction('down','','Bild nach unten','imageDown',im.id,i===p.images.length-1)}${imageAction('plus','Format','Zeichenfläche hinzufügen','addBoard',im.id)}<span class="action-separator"></span>${imageAction('trash','','Bild entfernen','removeImage',im.id)}</div></div><div class="image-settings"><label class="image-copyright"><span class="image-field-label">Copyright</span><input data-copyright="${esc(im.id)}" aria-label="Copyright · ${esc(im.name)}" placeholder="Bildbeschreibung © Name" value="${esc(p.boards.find(b=>b.imageId===im.id)?.elements.copyright.text||'')}" /></label><div class="image-text-field"><span class="image-field-label">Textarten</span>${textTypePicker(im)}</div></div></div>`}
document.addEventListener('click',ev=>{document.querySelectorAll('.text-type-picker[open]').forEach(picker=>{if(!picker.contains(ev.target))picker.open=false})});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){const picker=document.activeElement.closest('.text-type-picker[open]');if(picker){picker.open=false;picker.querySelector('summary').focus();ev.preventDefault()}}});
function setImageTextType(imageId,key,enabled){
 for(const b of p.boards.filter(b=>b.imageId===imageId)){b.elements[key].enabled=enabled;b.elements[key].visible=enabled}
 if(enabled){selected=p.boards.find(b=>b.imageId===imageId)?.id;layer=key;step='text'}
 syncTextTypes();renderPanel();updateDock();syncOverlays(true);
}
function syncTextTypes(){
 document.querySelectorAll('[data-text-type]').forEach(input=>{const e=p.boards.find(b=>b.imageId===input.dataset.image)?.elements[input.dataset.textType];input.checked=!!e&&(e.enabled??e.visible)});
 document.querySelectorAll('[data-text-picker]').forEach(picker=>{const active=textTypeSummary(p.boards.find(b=>b.imageId===picker.dataset.textPicker));picker.querySelector('[data-text-summary]').textContent=active.join(' · ')||'Keine Texte ausgewählt';picker.querySelector('[data-text-count]').textContent=active.length+'/3'});
}
function render(){
 const s=surfaceScale();$('#empty').hidden=!!p.images.length;$('#addMoreImages').hidden=!p.images.length;$('#undo').disabled=!history.length;$('#redo').disabled=!future.length;for(const [id,value] of [['projectCode',p.meta.code],['projectName',p.meta.title]])if(document.activeElement!==$('#'+id))$('#'+id).value=value||'';
 $('#boardSpace').innerHTML=p.images.map((im,i)=>`<section class="image-group">${imageHeading(im,i)}<div class="board-row">${p.boards.filter(b=>b.imageId===im.id).map(b=>`<article class="board-card ${b.id===selected?'selected':''}" data-id="${esc(b.id)}" style="width:${b.w*s}px"><div class="board-label"><span>${MKW.ratio(b.w,b.h)} <small>· ${b.w} × ${b.h}</small></span><button data-action="boardOptions" data-id="${esc(b.id)}" title="Zeichenfläche bearbeiten" aria-label="Zeichenfläche bearbeiten">•••</button></div><div class="board-surface" style="width:${b.w*s}px;height:${b.h*s}px"><canvas data-board="${esc(b.id)}" aria-label="${esc(im.name)} · ${MKW.ratio(b.w,b.h)}"></canvas><div class="interaction" data-board="${esc(b.id)}"></div></div></article>`).join('')}</div></section>`).join('');
 document.querySelectorAll('[data-family-mode]').forEach(input=>input.onchange=()=>mutate(()=>setFamilyDesign(input.dataset.familyMode,{enabled:input.checked}),false));
 document.querySelectorAll('[data-family-shift]').forEach(button=>button.onclick=()=>mutate(()=>{const b=p.boards.find(b=>b.imageId===button.dataset.familyShift);setFamilyDesign(button.dataset.familyShift,{offset:((b.family?.offset||0)+1)%8})},false));
 document.querySelectorAll('[data-family-reset]').forEach(button=>button.onclick=()=>mutate(()=>{const id=button.dataset.familyReset;delete p.familyOverrides[id];const config=familyConfig(p.boards.find(b=>b.imageId===p.images[0]?.id)?.family);for(const b of p.boards.filter(b=>b.imageId===id))applyFamilyBoard(b,config);refreshFamilyControls();renderPanel()},false));
 refreshFamilyControls();
 document.querySelectorAll('[data-text-type]').forEach(input=>input.onchange=()=>mutate(()=>setImageTextType(input.dataset.image,input.dataset.textType,input.checked),false));
 document.querySelectorAll('[data-copyright]').forEach(input=>{input.onfocus=()=>checkpoint();input.onblur=()=>{input.value=MKWLayout.copyrightText(input.value)};input.oninput=()=>{const id=input.dataset.copyright,text=MKWLayout.copyrightText(input.value);p.textOverrides??={};p.textOverrides[id]??={};p.textOverrides[id].copyright=true;for(const b of p.boards.filter(b=>b.imageId===id)){b.elements.copyright.text=text;b.elements.copyright.visible=!!text.trim()}if(board()?.imageId===id&&$('#copyrightText'))$('#copyrightText').value=text;changed(false)}});
 document.querySelectorAll('canvas[data-board]').forEach(c=>c.onpointerdown=ev=>{const b=p.boards.find(b=>b.id===c.dataset.board);if(step==='crop')beginMove(ev,b,'image');else selectBoard(b.id)});
 renderPanel();updateDock();draw();
}
function updateDock(){document.querySelectorAll('.dock [data-step]').forEach(b=>b.classList.toggle('active',b.dataset.step===step));$('#viewValue').textContent=Math.round(view*100)+'%'}
function chooseStep(value){if(editingText)editingText.el.blur();if(value==='import'){add();return}step=value;if(!selected)selected=p.boards[0]?.id;if(value==='text'&&!MKWLayout.keys.includes(layer))layer='title';if(value==='logo')layer='logo';updateDock();renderPanel();syncOverlays(true);draw();if(value==='export')openExport()}
function renderPanel(){
 const b=board(),panel=$('#stepPanel');panel.hidden=!b||step==='export';$('#toolTitle').textContent=!b?'Dein Bild gestalten':{text:'Text gestalten',logo:'Logo auswählen',crop:'Bildausschnitt',export:'Vorschau & Export'}[step]||'Dein Bild gestalten';$('#toolEmpty').hidden=!!b&&step!=='export';$('#toolEmpty').textContent=step==='export'?'Wähle im Exportfenster deine Formate und Dateinamen.':'Wähle ein Bild und einen Schritt in der Prozessleiste.';if(!b)return;
 if(step==='crop'){
  panel.innerHTML=`<div class="panel-row"><button data-fit="fill">Fläche füllen</button><button data-fit="fit">Einpassen</button><button data-fit="center">Zentrieren</button><label>Bild <input id="scale" aria-label="Bildskalierung in Prozent" type="number" min="0.1" step="0.1" value="${(b.image.scale*100).toFixed(1)}"> %</label><label>Zeichenflächenfarbe <input id="bg" aria-label="Zeichenflächenfarbe" type="color" value="${b.family?.enabled?b.family.background:b.bg}"></label><section class="tool-details" aria-label="Weitere Bildwerkzeuge"><div class="more-options"><button data-fit="original">Originalgrösse</button><button data-fit="reset">Zurücksetzen</button><label>Drehen <input id="angle" type="number" value="${b.image.angle}">°</label><button id="flipX">↔ Spiegeln</button><button id="flipY">↕ Spiegeln</button></div></section></div><p class="panel-caption">Bild ziehen. An einer Ecke skalieren. <strong>Das Seitenverhältnis bleibt erhalten.</strong></p>`;
  panel.querySelectorAll('[data-fit]').forEach(el=>el.onclick=()=>{mutate(()=>fit(b,el.dataset.fit),false);renderPanel()});on('scale','change',ev=>mutate(()=>b.image.scale=Math.max(.001,Math.min(100,+ev.target.value/100||.001)),false));on('angle','change',ev=>mutate(()=>b.image.angle=Number(ev.target.value)||0,false));for(const key of ['flipX','flipY'])on(key,'click',()=>mutate(()=>b.image[key]*=-1,false));on('bg','change',ev=>mutate(()=>{if(b.family?.enabled)setFamilyDesign(b.imageId,{background:ev.target.value});else b.bg=ev.target.value},false));
 }else if(step==='text'){
  const e=b.elements[layer]||b.elements.title,first=p.images[0]?.id===b.imageId,custom=p.textOverrides?.[b.imageId]?.[layer];
  panel.innerHTML=`<div class="panel-row text-tools"><select id="textLayer" aria-label="Text auswählen">${options(Object.entries(elementNames).filter(([k])=>k!=='logo'),layer)}</select><label>Grösse <input id="textSize" type="number" min="1" max="5000" value="${Math.round(e.size)}"></label><label class="color-label" title="Textfarbe"><input id="textColor" aria-label="Textfarbe" ${b.family?.enabled?'disabled title="Buchstabenfarben im Familienkonzert-Menü ändern"':''} type="color" value="${e.color}"></label><select id="textAlign" aria-label="Textausrichtung" ${layer==='copyright'?'disabled':''}>${options([['left','Links'],['center','Mitte'],['right','Rechts']],e.align)}</select><label><input id="textVisible" type="checkbox" ${e.visible?'checked':''}> Sichtbar</label><section class="tool-details" aria-label="Schriften"><h3>Schriften</h3><div class="more-options"><button id="replica">Replica importieren</button><button id="harriet">Harriet importieren</button><select id="fontRole" aria-label="Schrift">${options([['Replica LL','Replica LL'],['Harriet Regular','Harriet V2 Text Regular'],['Harriet','Harriet Bold'],['Harriet Italic','Harriet Bold Italic'],['Arial','Arial'],['Georgia','Georgia']],e.role)}</select><label><input id="uppercase" type="checkbox" ${layer==='date'?'checked disabled':p.meta.uppercase?'checked':''}> GROSSBUCHSTABEN</label></div><p class="panel-caption">${fontStatus['Replica LL']?'Replica geladen.':'Replica fehlt.'} ${fontStatus['Harriet Regular']?'Harriet V2 Text Regular geladen.':'Harriet fehlt – Georgia als Ersatz.'}</p></section>${!first&&custom?'<button id="resetText">Vorlagentext verwenden</button>':''}</div><p class="panel-caption">${first?'Erstes Bild: <strong>Dein Text gilt für alle Bilder ohne eigene Anpassung.</strong>':'<strong>Änderungen gelten nur für dieses Bild – in beiden Formaten.</strong>'} Titelgrösse folgt gleichem Titel · Überschrift und Untertitel teilen eine Grösse · Haupttextbox nur vertikal · Copyright fest im rechten Rand.</p>`;
  if(layer==='copyright'){const input=document.createElement('input');input.type='text';input.id='copyrightText';input.setAttribute('aria-label','Copyright eingeben');input.placeholder='Bildbeschreibung © Name';input.value=e.text;input.onfocus=()=>checkpoint();input.oninput=()=>{setSharedText(b,'copyright',input.value.replace(/[\r\n]+/g,' '));changed(false)};panel.querySelector('.panel-row').prepend(input)}
  on('textLayer','change',ev=>{if(editingText)editingText.el.blur();layer=ev.target.value;renderPanel();syncOverlays(true)});
  on('textSize','input',ev=>mutate(()=>setSharedTextSize(b,layer,Math.max(1,Math.min(5000,+ev.target.value||1))),false));
  for(const [id,key] of [['textColor','color'],['textAlign','align'],['fontRole','role'],['textVisible','visible']])on(id,'change',ev=>mutate(()=>{if(key==='visible'&&textTypes.some(([k])=>k===layer))setImageTextType(b.imageId,layer,ev.target.checked);else e[key]=key==='visible'?ev.target.checked:ev.target.value},false));
  on('uppercase','change',ev=>mutate(()=>{p.meta.uppercase=ev.target.checked;if(p.meta.uppercase){for(const x of p.boards)x.elements.title.text=x.elements.title.text.toUpperCase();p.meta.headline=p.meta.headline.toUpperCase()}},false));
  on('replica','click',()=>{fontRole='Replica LL';$('#fontFile').click()});on('harriet','click',()=>{fontRole='Harriet Regular';$('#fontFile').click()});
  on('resetText','click',()=>mutate(()=>{delete p.textOverrides[b.imageId][layer];const template=p.boards.find(x=>x.imageId===p.images[0].id)?.elements[layer];for(const x of p.boards.filter(x=>x.imageId===b.imageId)){x.elements[layer].text=template?.text||'';x.elements[layer].visible=x.elements[layer].enabled!==false&&(template?.visible||false)}},false));
 }else if(step==='logo'){
  const e=b.elements.logo;
  panel.innerHTML=`<div class="panel-row"><button class="logo-choice ${e.source==='black'&&e.visible?'active':''}" data-logo="black" title="Musikkollegium Schwarz"><img src="mkw-logo-bold-pos.svg" alt="Musikkollegium Schwarz"></button><button class="logo-choice dark ${e.source==='white'&&e.visible?'active':''}" data-logo="white" title="Musikkollegium Weiss"><img src="mkw-logo-bold-neg.svg" alt="Musikkollegium Weiss"></button>${p.logos.map(l=>`<button class="logo-choice ${e.source===l.id&&e.visible?'active':''}" data-logo="${esc(l.id)}" title="${esc(l.name)}"><img src="${esc(l.data)}" alt="${esc(l.name)}"></button>`).join('')}<button id="customLogo">Eigenes Logo</button><button id="noLogo">Ohne Logo</button><span>650 px · oben rechts</span><button id="allLogos">Auf alle übertragen</button></div><p class="panel-caption">Logo fest an der oberen rechten Ecke der Safe-Zone. Bei sehr kleinen freien Formaten wird es passend verkleinert.</p>`;
  panel.querySelectorAll('[data-logo]').forEach(el=>el.onclick=()=>mutate(()=>{for(const x of p.boards.filter(x=>x.imageId===b.imageId)){x.elements.logo.source=el.dataset.logo;x.elements.logo.visible=true}}));on('customLogo','click',()=>$('#logoFile').click());on('noLogo','click',()=>mutate(()=>{for(const x of p.boards.filter(x=>x.imageId===b.imageId))x.elements.logo.visible=false}));on('allLogos','click',()=>mutate(()=>{for(const x of p.boards){const scale=x.w/b.w;x.elements.logo={...clone(e),x:e.x*scale,y:e.y*scale,size:e.size*scale}}}));
 }
}
function beginText(b,key,el){
 selected=b.id;layer=key;checkpoint();editingText={boardId:b.id,key,el};el.classList.add('editing');el.style.color=b.elements[key].color;
 document.querySelectorAll('.board-card').forEach(c=>c.classList.toggle('selected',c.dataset.id===b.id));renderPanel();draw();
}
function setSharedText(b,key,text){
 if(key==='date')text=text.toUpperCase();
 if(key==='copyright')text=MKWLayout.copyrightText(text);
 const first=p.images[0]?.id===b.imageId;p.textOverrides??={};
 if(!first){p.textOverrides[b.imageId]??={};p.textOverrides[b.imageId][key]=true}
 for(const target of p.boards){if(first?!p.textOverrides[target.imageId]?.[key]||target.imageId===b.imageId:target.imageId===b.imageId){target.elements[key].text=text;target.elements[key].visible=target.elements[key].enabled??!!text;}}
 if(key==='copyright')document.querySelectorAll('[data-copyright]').forEach(input=>{if(document.activeElement!==input)input.value=p.boards.find(t=>t.imageId===input.dataset.copyright)?.elements.copyright.text||''});
 if(first){const metaKey={date:'concert',title:'headline',subtitle:'subtitle'}[key];if(metaKey)p.meta[metaKey]=text}
}
function setSharedTextSize(b,key,size){
 const source=b.elements[key],keys=key==='title'?['title']:['date','subtitle'].includes(key)?['date','subtitle']:[key];
 for(const target of p.boards)for(const targetKey of keys)if(keys.length>1||target.elements[targetKey].text===source.text)target.elements[targetKey].size=size;
}
function inputText(b,key,el){const text=el.innerText.replace(/\r/g,'').replace(/\n$/,'');setSharedText(b,key,key==='title'&&p.meta.uppercase?text.toUpperCase():text);if(key==='date'||key==='title'&&p.meta.uppercase)el.style.textTransform='uppercase';changed(false)}
function endText(b,key,el){syncTextTypes();if(!editingText)return;editingText=null;el.classList.remove('editing');el.style.textTransform='';syncOverlays(true);draw();renderPanel();}
function add(){if(busy)return;replaceId=null;$('#files').multiple=true;$('#files').click()}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
function editBoardOptions(b){
 selected=b.id;step='crop';updateDock();$('#toolTitle').textContent='Format anpassen';$('#toolEmpty').hidden=true;const panel=$('#stepPanel');panel.hidden=false;panel.innerHTML=`<div class="panel-row"><label>Breite <input id="width" type="number" value="${b.w}"></label><label>Höhe <input id="height" type="number" value="${b.h}"></label><select id="resizeMode"><option value="canvas">Fläche ändern</option><option value="layout">Layout proportional skalieren</option></select><button id="resize">Anwenden</button><button data-size="1080,1080">1:1</button><button data-size="1080,1920">9:16</button><button data-size="1080,1650">4:5</button><button id="duplicate">Duplizieren</button><button id="boardUp">←</button><button id="boardDown">→</button><button id="deleteBoard">Löschen</button></div>`;
 on('resize','click',()=>resize(+$('#width').value,+$('#height').value,$('#resizeMode').value));panel.querySelectorAll('[data-size]').forEach(el=>el.onclick=()=>{const [w,h]=el.dataset.size.split(',').map(Number);resize(w,h,$('#resizeMode').value)});on('duplicate','click',()=>mutate(()=>{const n=clone(b);n.id=uid();p.boards.splice(p.boards.indexOf(b)+1,0,n);selected=n.id}));on('deleteBoard','click',()=>mutate(()=>{p.boards=p.boards.filter(x=>x.id!==b.id);selected=p.boards[0]?.id}));for(const [id,d] of [['boardUp',-1],['boardDown',1]])on(id,'click',()=>mutate(()=>{const group=p.boards.filter(x=>x.imageId===b.imageId);reorder(group,b.id,d);let n=0;p.boards=p.boards.map(x=>x.imageId===b.imageId?group[n++]:x)}));syncOverlays(true);
}
$('#boardSpace').onclick=ev=>{const el=ev.target.closest('[data-action]');if(!el)return;const {action,id}=el.dataset;if(action==='replace'){replaceId=id;$('#files').multiple=false;$('#files').click();return}if(action==='boardOptions'){editBoardOptions(p.boards.find(b=>b.id===id));return}if(action==='removeImage'&&!confirm('Dieses Bild mit seinen Zeichenflächen entfernen?'))return;mutate(()=>{if(action==='removeImage'){p.images=p.images.filter(i=>i.id!==id);p.boards=p.boards.filter(b=>b.imageId!==id);selected=p.boards[0]?.id}if(action==='imageUp'||action==='imageDown')reorder(p.images,id,action==='imageUp'?-1:1);if(action==='addBoard'){const im=p.images.find(i=>i.id===id),b=createBoard(im);const sibling=p.boards.find(b=>b.imageId===id);if(sibling)for(const key of ['date','title','subtitle','copyright']){b.elements[key].text=sibling.elements[key].text;b.elements[key].visible=sibling.elements[key].visible;b.elements[key].enabled=sibling.elements[key].enabled}p.boards.push(b);selected=b.id}})};
document.querySelectorAll('.dock [data-step]').forEach(el=>el.onclick=()=>chooseStep(el.dataset.step));$('#emptyAdd').onclick=add;$('#addMoreImages').onclick=add;$('#files').onchange=ev=>importFiles([...ev.target.files]);
for(const [id,key] of [['projectCode','code'],['projectName','title']])on(id,'input',ev=>{p.meta[key]=ev.target.value;touchMeta()});
window.addEventListener('dragover',ev=>ev.preventDefault());window.addEventListener('drop',ev=>{ev.preventDefault();if(busy)return;replaceId=null;importFiles([...ev.dataTransfer.files])});
$('#undo').onclick=()=>{if(editingText)editingText.el.blur();undo()};$('#redo').onclick=()=>{if(editingText)editingText.el.blur();redo()};
window.addEventListener('keydown',ev=>{if(busy)return;if((ev.metaKey||ev.ctrlKey)&&ev.key.toLowerCase()==='z'&&!document.activeElement.isContentEditable&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){ev.preventDefault();ev.shiftKey?redo():undo()}});
function setView(v){if(editingText)editingText.el.blur();view=Math.max(.2,Math.min(3,v));render()}$('#zoomIn').onclick=()=>setView(view+.2);$('#zoomOut').onclick=()=>setView(view-.2);$('#viewValue').onclick=()=>setView(1);
$('#open').onclick=()=>$('#projectFile').click();
$('#projectFile').onchange=async ev=>{
 const f=ev.target.files[0];if(!f)return;
 const fromStart=$('#startDialog').open;if(busy&&!fromStart){ev.target.value='';return}
 const buttons=['startNew','startContinue','startOpen'].map(id=>$('#'+id)),disabled=buttons.map(b=>b.disabled);
 if(fromStart)buttons.forEach(b=>b.disabled=true);
 try{
  const q=validate(JSON.parse(await f.text()));
  if(!fromStart&&p.images.length&&!confirm('Aktuelles Projekt durch die gewählte Datei ersetzen?'))return;
  busy=true;await restore(q);
  if(fromStart)$('#startDialog').close();
  busy=false;changed();status('Projekt geöffnet.');
 }catch(e){if(fromStart)$('#startStatus').textContent='Projekt konnte nicht geöffnet werden: '+e.message;else alert('Projekt konnte nicht geöffnet werden: '+e.message)}
 finally{busy=fromStart&&$('#startDialog').open;if(fromStart)buttons.forEach((b,i)=>b.disabled=disabled[i]);ev.target.value=''}
};
$('#newproject').onclick=()=>{if(confirm('Neues Projekt beginnen? Bei Bedarf dein aktuelles Projekt zuerst speichern.'))mutate(()=>{const fonts=p.fonts;p=fresh();p.fonts=fonts;selected=null})};
function saveFileName(extension){return MKW.clean(($('#saveName').value.trim()||p.meta.title).replace(/\.(mkw|psd)$/i,''))+'.'+extension}
function chooseSaveTarget(name,extension){
 if(!window.showSaveFilePicker)return Promise.resolve(null);
 return window.showSaveFilePicker({suggestedName:name,types:[{description:extension==='mkw'?'Studio-Projekt':'Photoshop-Datei',accept:{[extension==='mkw'?'application/json':'image/vnd.adobe.photoshop']:['.'+extension]}}]});
}
async function writeSaveFile(handle,blob,name){
 if(!handle){download(blob,name);return}
 const stream=await handle.createWritable();
 try{await stream.write(blob);await stream.close()}catch(e){try{await stream.abort()}catch{}throw e}
}
function setSaveBusy(value){busy=value;for(const id of ['savePSD','saveProject','closeSave','saveName'])$('#'+id).disabled=value}
$('#save').onclick=()=>{
 if(editingText)editingText.el.blur();$('#psdStatus').textContent='';$('#saveName').value=MKW.clean(p.meta.title);
 $('#saveLocationHint').textContent=window.showSaveFilePicker?'Im nächsten Schritt wählst du den Speicherort.':'Dieser Browser speichert per Download. Den Speicherort bestimmt deine Browser-Einstellung.';
 $('#saveDialog').showModal();
};
$('#closeSave').onclick=()=>$('#saveDialog').close();
$('#saveProject').onclick=async()=>{
 if(busy)return;setSaveBusy(true);
 try{
  const name=saveFileName('mkw'),handle=await chooseSaveTarget(name,'mkw');
  await autosave();await writeSaveFile(handle,new Blob([JSON.stringify(p)],{type:'application/json'}),name);
  status(handle?'Studio-Projekt unter gewähltem Namen gespeichert.':'Studio-Projekt: Download gestartet.');$('#saveDialog').close();
 }catch(e){$('#psdStatus').textContent=e.name==='AbortError'?'Speichern abgebrochen.':'Projekt konnte nicht gespeichert werden: '+e.message}
 finally{setSaveBusy(false)}
};
$('#fontFile').onchange=async ev=>{const f=ev.target.files[0];if(!f)return;try{const data=await dataURL(f);await new FontFace(fontRole,`url(${data})`).load();checkpoint();p.fonts=p.fonts.filter(x=>x.role!==fontRole);p.fonts.push({role:fontRole,name:f.name,data});await loadFonts();changed()}catch(e){alert('Schrift kann nicht geladen werden: '+e.message)}ev.target.value=''};
$('#logoFile').onchange=async ev=>{const f=ev.target.files[0];if(!f)return;try{const data=await dataURL(f);await image(data);mutate(()=>{const l={id:uid(),name:f.name,data};p.logos.push(l);if(board())for(const b of p.boards.filter(x=>x.imageId===board().imageId)){b.elements.logo.source=l.id;b.elements.logo.visible=true}})}catch(e){alert('Logo kann nicht geladen werden: '+e.message)}ev.target.value=''};
const orderedBoards=()=>p.images.flatMap(im=>p.boards.filter(b=>b.imageId===im.id));
async function openExport(){
 if(!p.boards.length){status('Zuerst Bilder importieren.');return}
 $('#exportFields').innerHTML=field('Konzertdatum · TT.MM.JJ','date',p.meta.date,'text','placeholder="15.11.26"')+field('Projektkürzel','code',p.meta.code,'text','placeholder="E2"')+field('Projekttitel','title',p.meta.title,'text','placeholder="Dichterlos"')+field('Startnummer','start',p.meta.start,'number','min="0" step="1"');
 for(const key of ['date','code','title','start'])on(key,'input',ev=>{p.meta[key]=key==='start'?+ev.target.value:ev.target.value;revision++;clearTimeout(saveTimer);saveTimer=setTimeout(autosave,1200);updateExportNames()});
 $('#exportNames').innerHTML=orderedBoards().map(b=>`<label class="export-card" data-id="${esc(b.id)}"><div class="export-preview"></div><input type="checkbox" data-export-id="${esc(b.id)}" ${b.checked?'checked':''}> <small>${MKW.ratio(b.w,b.h)} · ${b.w} × ${b.h} px</small><span class="export-name"></span></label>`).join('');
 $('#exportNames').onchange=ev=>{if(ev.target.dataset.exportId){p.boards.find(b=>b.id===ev.target.dataset.exportId).checked=ev.target.checked;changed(false);updateExportNames()}};
 $('#exportDialog').showModal();updateExportNames();
 for(const b of orderedBoards()){const c=makeCanvas(240,Math.round(240*b.h/b.w));await paint(c.getContext('2d'),b,c.width/b.w);const cell=[...document.querySelectorAll('.export-card')].find(el=>el.dataset.id===b.id);if(cell){const img=document.createElement('img');img.src=c.toDataURL();img.alt=asset(b).name;cell.querySelector('.export-preview').replaceChildren(img)}}
}
function updateExportNames(){
 let error='',names=[];const bs=orderedBoards().filter(b=>b.checked);try{names=MKW.names(p.meta,bs);if(!bs.length)throw Error('Wähle mindestens ein Sujet.')}catch(e){error=e.message}exportPlan=error?[]:bs.map((b,i)=>({board:clone(b),name:names[i]}));
 document.querySelectorAll('.export-card').forEach(el=>{const x=exportPlan.find(x=>x.board.id===el.dataset.id);el.querySelector('.export-name').textContent=x?.name||'Nicht im Export'});$('#exportStatus').textContent=error||`${bs.length} Sujets · Bestehende Dateien werden nicht überschrieben.`;$('#zip').disabled=$('#folder').disabled=!!error;
}
$('#closeExport').onclick=()=>{$('#exportDialog').close();step='text';renderPanel();updateDock();syncOverlays(true)};
async function runExport(mode){
 if(busy||!exportPlan.length)return;busy=true;const plan=[...exportPlan];$('#exportDialog').querySelectorAll('input').forEach(el=>el.disabled=true);$('#zip').disabled=$('#folder').disabled=$('#closeExport').disabled=true;const failures=[],items=[];let successes=0;
 try{if(mode==='folder')await api('/api/folder','');for(let i=0;i<plan.length;i++){const x=plan[i];$('#exportStatus').textContent=`Export ${i+1} / ${plan.length}: ${x.name}`;try{const png=await canvasPNG(x.board);if(mode==='folder')await api('/api/export',JSON.stringify({name:x.name,png}));else{const blob=await(await api('/api/jpg',new Blob([bytesFromData(png)],{type:'image/png'}))).blob();items.push({name:x.name,jpg:await dataURL(blob)})}successes++}catch(e){failures.push(`${x.name}: ${e.message}`)}}if(mode==='zip'&&items.length)download(await(await api('/api/zip',JSON.stringify(items))).blob(),MKW.clean(p.meta.title)+'_JPGs.zip');$('#exportStatus').textContent=`${successes} von ${plan.length} JPGs ${mode==='zip'?'im ZIP heruntergeladen':'gespeichert'}.${failures.length?'\n'+failures.join('\n'):''}`;status(`${successes} JPGs exportiert`)}catch(e){$('#exportStatus').textContent=e.message}finally{busy=false;$('#exportDialog').querySelectorAll('input').forEach(el=>el.disabled=false);$('#zip').disabled=$('#folder').disabled=$('#closeExport').disabled=false}
}
function bytesFromData(data){const base64=data.slice(data.indexOf(',')+1);if(Uint8Array.fromBase64)return Uint8Array.fromBase64(base64);const binary=atob(base64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes}
$('#zip').onclick=()=>runExport('zip');$('#folder').onclick=()=>runExport('folder');$('#exportDialog').addEventListener('cancel',ev=>{if(busy)ev.preventDefault()});window.addEventListener('beforeunload',ev=>{if(savedRevision<revision){ev.preventDefault();ev.returnValue=''}});

$('#toolsToggle').onclick=()=>{const open=document.body.classList.toggle('tools-open');$('#toolsToggle').setAttribute('aria-expanded',String(open));$('#toolsToggle').textContent=open?'Schliessen':'Werkzeuge'};
