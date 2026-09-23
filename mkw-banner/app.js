(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const assets = window.MKW_ASSETS;
  const state = {w:300,h:600, zoom:1, panX:0, panY:0, image:null, sponsors:null, logo:'white', sponsorWidth:1, glyphs:assets.glyphs};
  const encoder = new TextEncoder();
  const sourceImage = new Image(); sourceImage.src = assets.background;
  const sponsorImage = new Image(); sponsorImage.src = assets.sponsors;
  const logoMarkup = atob(assets.logo.split(',')[1]);
  let refreshTimer, cropDrag = null, selectedRange = null;

  function dimension() { return {w:state.w,h:state.h, margin:Math.round(state.w*.06), bottom:Math.round(state.h*.10), textW:Math.round(state.w*.88), textH:Math.round(state.h*.50)}; }
  function baseScale() { return Math.max(state.w*1.1/state.image.naturalWidth,state.h*1.1/state.image.naturalHeight)*state.zoom; }
  function clampPan() {
    if (!state.image) return;
    const s=baseScale();
    state.panX=Math.max(-Math.max(0,(state.image.naturalWidth*s-state.w*1.1)/2),Math.min(Math.max(0,(state.image.naturalWidth*s-state.w*1.1)/2),state.panX));
    state.panY=Math.max(-Math.max(0,(state.image.naturalHeight*s-state.h*1.1)/2),Math.min(Math.max(0,(state.image.naturalHeight*s-state.h*1.1)/2),state.panY));
  }
  function drawCrop() {
    if (!state.image) return;
    clampPan();
    const canvas=$('cropCanvas'),ctx=canvas.getContext('2d');canvas.width=state.w;canvas.height=state.h;
    const scale=baseScale(), x=(state.w-state.image.naturalWidth*scale)/2+state.panX, y=(state.h-state.image.naturalHeight*scale)/2+state.panY;
    ctx.drawImage(state.image,x,y,state.image.naturalWidth*scale,state.image.naturalHeight*scale);
  }
  function expandedImage() {
    const c=document.createElement('canvas');c.width=Math.round(state.w*1.1);c.height=Math.round(state.h*1.1);
    const ctx=c.getContext('2d'),scale=baseScale();
    ctx.drawImage(state.image,(c.width-state.image.naturalWidth*scale)/2+state.panX,(c.height-state.image.naturalHeight*scale)/2+state.panY,state.image.naturalWidth*scale,state.image.naturalHeight*scale);
    return c;
  }
  function setupCrop() {
    $('zoomValue').textContent=Math.round(state.zoom*100)+' %'; drawCrop(); scheduleRefresh();
  }
  $('cropCanvas').addEventListener('pointerdown',e=>{cropDrag={x:e.clientX,y:e.clientY,px:state.panX,py:state.panY};e.target.setPointerCapture(e.pointerId)});
  $('cropCanvas').addEventListener('pointermove',e=>{if(!cropDrag)return;const rect=e.target.getBoundingClientRect();state.panX=cropDrag.px+(e.clientX-cropDrag.x)*state.w/rect.width;state.panY=cropDrag.py+(e.clientY-cropDrag.y)*state.h/rect.height;setupCrop()});
  $('cropCanvas').addEventListener('pointerup',()=>cropDrag=null);
  $('cropCanvas').addEventListener('pointercancel',()=>cropDrag=null);
  $('zoom').addEventListener('input',e=>{state.zoom=+e.target.value;setupCrop()});
  async function loadImage(file,kind){if(!file)return;const img=new Image(),url=URL.createObjectURL(file);try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});if(kind==='background'){state.image=img;state.zoom=1;state.panX=state.panY=0;$('zoom').value='1';$('imageName').textContent=file.name;setupCrop()}else{state.sponsors=img;$('sponsorName').textContent=file.name;scheduleRefresh()}}catch(e){setStatus('Das Bild konnte nicht geladen werden: '+file.name,true)}finally{ /* URL stays valid while the image is in use. */ }}
  $('imageFile').addEventListener('change',e=>loadImage(e.target.files[0],'background'));
  $('sponsorFile').addEventListener('change',e=>loadImage(e.target.files[0],'sponsors'));
  function setDimensions(w,h){state.w=w;state.h=h;state.panX=state.panY=0;state.zoom=1;$('zoom').value='1';$('width').value=w;$('height').value=h;$('previewDimensions').textContent=w+' × '+h+' PX';layoutEditor();setupCrop()}
  $('preset').addEventListener('change',e=>{if(e.target.value==='custom')return;const [w,h]=e.target.value.split('x').map(Number);setDimensions(w,h);$('sizeLimit').value=e.target.value==='600x500'?'100':'150';$('filename').value=e.target.value==='600x500'?'MKW_Banner_Mobile':'MKW_Banner_Desktop'});
  for (const id of ['width','height']) $(id).addEventListener('change',()=>{const w=+$('width').value,h=+$('height').value;if(w<100||h<100||w>1200||h>1200){setStatus('Auflösung: 100 bis 1200 px pro Seite.',true);return}$('preset').value='custom';setDimensions(w,h)});
  $('clickUrl').addEventListener('input',scheduleRefresh);
  for(const id of ['logoWhite','logoBlack'])$(id).addEventListener('click',()=>{state.logo=id==='logoWhite'?'white':'black';$('logoWhite').classList.toggle('active',state.logo==='white');$('logoBlack').classList.toggle('active',state.logo==='black');scheduleRefresh()});
  $('sponsorWidth').addEventListener('input',e=>{state.sponsorWidth=+e.target.value/100;$('sponsorWidthValue').textContent=e.target.value+' %';scheduleRefresh()});

  function addLine(text='',face='replica',size=37){const line=document.createElement('div');line.className='copy-line';line.contentEditable='true';line.spellcheck=false;line.dataset.leading='1.05';line.dataset.face=face;line.dataset.size=size;line.style.fontFamily=face==='harriet'?'Harriet':'Replica';line.style.fontSize=size+'px';line.style.lineHeight='1.05';line.textContent=text;line.addEventListener('input',()=>{updateLineList();scheduleRefresh()});line.addEventListener('paste',e=>{e.preventDefault();const plain=e.clipboardData.getData('text/plain').replace(/\s*\r?\n\s*/g,' ');document.execCommand('insertText',false,plain)});line.addEventListener('focus',()=>{selectedRange=null;syncActiveLine()});line.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=addLine();line.after(next);updateLineList();next.focus();scheduleRefresh()}if(e.key==='Backspace'&&line.textContent===''&&$('textEditor').children.length>1){e.preventDefault();const prev=line.previousElementSibling||line.nextElementSibling;line.remove();updateLineList();prev.focus();scheduleRefresh()}});$('textEditor').append(line);updateLineList();return line}
  function currentLine(){const active=document.activeElement;if(active?.classList?.contains('copy-line'))return active;return $('textEditor').children[+$('lineSelect').value]||$('textEditor').firstElementChild}
  function syncActiveLine(){const idx=[...$('textEditor').children].indexOf(currentLine());if(idx>=0)$('lineSelect').value=idx;const line=currentLine();$('leading').value=line.dataset.leading||'1.05';$('leadingValue').textContent=Number($('leading').value).toFixed(2)}
  function updateLineList(){const old=$('lineSelect').value;$('lineSelect').replaceChildren(...[...$('textEditor').children].map((line,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`Zeile ${i+1} · ${(line.textContent||'Leer').slice(0,20)}`;return o}));$('lineSelect').value=old&&+$('lineSelect').options.length>+old?old:'0';syncActiveLine()}
  $('lineSelect').addEventListener('change',syncActiveLine);
  $('leading').addEventListener('input',e=>{const line=currentLine();line.dataset.leading=e.target.value;line.style.lineHeight=e.target.value;$('leadingValue').textContent=Number(e.target.value).toFixed(2);scheduleRefresh()});
  $('addLine').addEventListener('click',()=>{const line=addLine('');line.focus();scheduleRefresh()});
  $('removeLine').addEventListener('click',()=>{if($('textEditor').children.length===1)return;const line=currentLine();const next=line.previousElementSibling||line.nextElementSibling;line.remove();updateLineList();next.focus();scheduleRefresh()});
  document.addEventListener('selectionchange',()=>{const s=window.getSelection();if(s?.rangeCount&&$('textEditor').contains(s.anchorNode))selectedRange=s.getRangeAt(0).cloneRange()});
  $('applyStyle').addEventListener('click',()=>{
    const line=currentLine(),face=$('fontChoice').value,size=Math.max(8,Math.min(120,+$('fontSize').value||37)),color=$('textColor').value;
    if(selectedRange&&!selectedRange.collapsed&&line.contains(selectedRange.commonAncestorContainer)){
      try{const range=selectedRange.cloneRange(),span=document.createElement('span');span.dataset.face=face;span.dataset.size=size;span.dataset.color=color;span.style.fontFamily=face==='harriet'?'Harriet':'Replica';span.style.fontSize=size+'px';span.style.color=color;span.append(range.extractContents());range.insertNode(span);selectedRange=null}catch(e){setStatus('Bitte die Auswahl innerhalb einer einzigen Zeile markieren.',true)}
    }else{line.dataset.face=face;line.dataset.size=size;line.dataset.color=color;line.style.fontFamily=face==='harriet'?'Harriet':'Replica';line.style.fontSize=size+'px';line.style.color=color}
    scheduleRefresh();
  });
  function layoutEditor(){const d=dimension(),scale=Math.min(1,($('editorStage').parentElement.clientWidth-28)/state.w,320/state.h);$('editorStage').style.width=(state.w*scale)+'px';$('editorStage').style.height=(state.h*scale)+'px';$('textEditor').style.left=d.margin*scale+'px';$('textEditor').style.bottom=d.bottom*scale+'px';$('textEditor').style.width=d.textW+'px';$('textEditor').style.height=d.textH+'px';$('textEditor').style.transform=`scale(${scale})`;$('textEditor').style.transformOrigin='bottom left';const lines=[...$('textEditor').children];lines.forEach(line=>{line.style.maxWidth=d.textW+'px'});scheduleRefresh()}
  window.addEventListener('resize',layoutEditor);

  // SVG glyph outlines are derived from the two supplied OpenType files. The export contains no font references or <text> elements.
  function lineRuns(line){
    const runs=[];const inherited={face:line.dataset.face||'replica',size:+line.dataset.size||37,color:line.dataset.color||'#ffffff'};
    function visit(node,style){if(node.nodeType===Node.TEXT_NODE){if(node.textContent)runs.push({...style,text:node.textContent.replace(/\u00a0/g,' ')});return}if(node.nodeType!==Node.ELEMENT_NODE)return;if(node.tagName==='BR'){runs.push({...style,text:' '});return}const next={...style};for(const k of ['face','size','color'])if(node.dataset?.[k])next[k]=k==='size'?+node.dataset[k]:node.dataset[k];for(const child of node.childNodes)visit(child,next)}
    for(const node of line.childNodes)visit(node,inherited);return runs;
  }
  function xml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
  function textSvg(){const d=dimension(),lines=[...$('textEditor').children],measurement=document.createElement('canvas').getContext('2d');let y=0,paths=[],issues=[];
    for(const line of lines){const runs=lineRuns(line),maxSize=Math.max(+line.dataset.size||37,...runs.map(r=>r.size)),leading=+line.dataset.leading||1.05,height=maxSize*leading,baseline=y+maxSize*.87;let x=0;
      for(const run of runs){const face=run.face, font=state.glyphs[face];if(!font){issues.push('Unbekannte Schrift');continue}const chars=Array.from(run.text);measurement.font=`${run.size}px ${face==='harriet'?'Harriet':'Replica'}`;let previous='';
        for(const ch of chars){const glyph=font.chars[ch.codePointAt(0)];if(!glyph){issues.push('Nicht unterstütztes Zeichen: '+ch);previous='';continue}const width=measurement.measureText(ch).width;const kern=previous?measurement.measureText(previous+ch).width-measurement.measureText(previous).width-width:0;x+=kern;if(glyph[0])paths.push(`<path fill="${xml(run.color)}" transform="translate(${x.toFixed(2)} ${baseline.toFixed(2)}) scale(${(run.size/font.upm).toFixed(6)} ${(-run.size/font.upm).toFixed(6)})" d="${xml(glyph[0])}"/>`);x+=width;previous=ch}
      }
      if(x>d.textW+1)issues.push('Text breiter als der Satzspiegel (Zeile '+(lines.indexOf(line)+1)+')');y+=height;
    }
    if(y>d.textH+1)issues.push('Text höher als der Satzspiegel');
    $('textIssue').textContent=[...new Set(issues)].join(' · ');
    return {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${d.textW}" height="${d.textH}" viewBox="0 0 ${d.textW} ${d.textH}">${paths.join('')}</svg>`,issues};
  }

  function sponsorCanvas(){const im=state.sponsors,w=Math.max(1,Math.min(Math.round(state.w*state.sponsorWidth),Math.round(im.naturalWidth*state.h*.18/im.naturalHeight))),h=Math.max(1,Math.round(w*im.naturalHeight/im.naturalWidth)),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);return c}
  function logoSvg(){return logoMarkup.replace(/#fff(?:fff)?\b/gi,state.logo==='white'?'#fff':'#111111')}
  function bannerHtml(bg='background.webp',sponsors='logos.png',text='textlayout.svg',logo='logo.svg'){
    const d=dimension(),logoW=Math.round(state.w*.48),logoX=Math.round(-state.w*.20),logoY=Math.round(state.h*.33-logoW*118.02/618.33*.5),url=$('clickUrl').value.trim()||'https://www.musikkollegium.ch';
    return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="ad.size" content="width=${state.w},height=${state.h}"><title>MKW Werbebanner</title><script>var clickTag=${JSON.stringify(url).replace(/</g,'\\u003c')};<\/script><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}#banner{position:relative;width:${state.w}px;height:${state.h}px;background:#182036;overflow:hidden;cursor:pointer;border:1px solid #333}img{display:block;max-width:none}.bg{position:absolute;left:50%;top:50%;width:${Math.round(state.w*1.1)}px;height:${Math.round(state.h*1.1)}px;transform:translate(-50%,-50%) scale(.909091);transform-origin:center;animation:zoom 12s cubic-bezier(.2,.8,.3,1) forwards}.bg img{width:100%;height:100%}@keyframes zoom{to{transform:translate(-50%,-50%) scale(1)}}.gradient{position:absolute;inset:auto 0 0;height:${Math.round(state.h*.62)}px;background:linear-gradient(to top,rgba(35,40,48,.92),rgba(55,65,78,.78) 35%,rgba(120,135,150,.42) 70%,transparent);mix-blend-mode:multiply}.vignette{position:absolute;inset:0 0 auto;height:${Math.round(state.h*.22)}px;background:linear-gradient(to bottom,rgba(25,30,38,.5),transparent);mix-blend-mode:multiply}.logo{position:absolute;top:${Math.round(state.h*.05)}px;right:${d.margin}px;width:${logoW}px;transform-origin:center;animation:logo 6.75s cubic-bezier(.25,1,.35,1) .3s both}.logo img{width:100%;filter:drop-shadow(0 3px 10px #0009)}@keyframes logo{0%{opacity:0;transform:translateY(-8px)}25%,85%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:1;transform:translate(${logoX}px,${logoY}px) scale(1.5)}}.copy{position:absolute;bottom:${d.bottom}px;left:${d.margin}px;width:${d.textW}px;height:${d.textH}px;transform-origin:0 100%;animation:copy 5.4s cubic-bezier(.25,1,.35,1) .35s both}.copy img{width:100%;height:100%;filter:drop-shadow(0 4px 12px #0008)}@keyframes copy{0%{opacity:0;transform:scale(.82)}26%,85%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.7)}}.sponsors{position:absolute;bottom:${d.bottom}px;left:0;width:100%;display:flex;justify-content:center;animation:sponsors 1s cubic-bezier(.25,1,.35,1) 6s both}.sponsors img{max-width:100%;height:auto;filter:drop-shadow(0 4px 12px #0008)}@keyframes sponsors{0%{opacity:0;transform:scale(.92) translateY(6px)}100%{opacity:1;transform:scale(1) translateY(-6px)}}.link{position:absolute;inset:0;z-index:10}@media(prefers-reduced-motion:reduce){.bg,.logo,.copy,.sponsors{animation:none!important}.bg{transform:translate(-50%,-50%) scale(1)}.logo,.copy{opacity:1!important}.sponsors{opacity:0!important}}</style></head><body><div id="banner" role="banner"><div class="bg"><img src="${bg}" alt=""></div><div class="gradient"></div><div class="vignette"></div><div class="logo"><img src="${logo}" alt="Musikkollegium Winterthur"></div><div class="copy"><img src="${text}" alt="Werbebotschaft"></div><div class="sponsors"><img src="${sponsors}" alt="Partner und Sponsoren"></div><a class="link" href="javascript:void(0)" onclick="window.open(window.clickTag,'_blank')" aria-label="Mehr erfahren"></a></div></body></html>`;
  }
  function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,210)}
  function refresh(){if(!state.image||!state.sponsors)return;const text=textSvg().svg,bg=expandedImage().toDataURL('image/webp',.72),sponsor=sponsorCanvas().toDataURL('image/png');const logo='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(logoSvg());const txt='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(text);
    const frame=$('bannerPreview'),space=$('preview-space');const scale=Math.min(1,(space.clientWidth-10)/state.w,(space.clientHeight-10)/state.h);$('bannerPreview').parentElement.style.width=state.w*scale+'px';$('bannerPreview').parentElement.style.height=state.h*scale+'px';frame.style.width=state.w+'px';frame.style.height=state.h+'px';frame.style.transform=`scale(${scale})`;frame.srcdoc=bannerHtml(bg,sponsor,txt,logo);
  }
  $('replay').addEventListener('click',refresh);
  function setStatus(message,error=false){$('exportStatus').textContent=message;$('exportStatus').classList.toggle('error',error)}

  const u16=(n)=>new Uint8Array([n&255,(n>>>8)&255]);const u32=(n)=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
  function join(...parts){const out=new Uint8Array(parts.reduce((n,a)=>n+a.length,0));let off=0;for(const part of parts){out.set(part,off);off+=part.length}return out}
  const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0});
  function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
  function makeZip(files){let offset=0;const locals=[],centrals=[];for(const [name,data] of files){const n=encoder.encode(name),crc=crc32(data);const local=join(u32(0x04034b50),u16(20),u16(0x800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(n.length),u16(0),n,data);locals.push(local);centrals.push(join(u32(0x02014b50),u16(20),u16(20),u16(0x800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(n.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),n));offset+=local.length}const central=join(...centrals);return join(...locals,central,u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(central.length),u32(offset),u16(0))}
  function chunk(type,data){const t=encoder.encode(type),body=join(t,data);return join(u32be(data.length),body,u32be(crc32(body)))}
  function u32be(n){return new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255])}
  async function png8(canvas){const {width:w,height:h}=canvas,raw=canvas.getContext('2d').getImageData(0,0,w,h).data;const histogram=new Map();for(let i=0;i<raw.length;i+=4){if(raw[i+3]<10)continue;const key=(raw[i]>>3)<<15|(raw[i+1]>>3)<<10|(raw[i+2]>>3)<<5|(raw[i+3]>>3);histogram.set(key,(histogram.get(key)||0)+1)}
    const keys=[...histogram].sort((a,b)=>b[1]-a[1]).slice(0,255).map(x=>x[0]),palette=[[0,0,0,0],...keys.map(k=>[((k>>15)&31)*8+4,((k>>10)&31)*8+4,((k>>5)&31)*8+4,(k&31)*8+4])];const cache=new Map(),scan=new Uint8Array((w+1)*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(raw[i+3]<10)continue;const k=(raw[i]>>3)<<15|(raw[i+1]>>3)<<10|(raw[i+2]>>3)<<5|(raw[i+3]>>3);let idx=cache.get(k);if(idx===undefined){idx=keys.indexOf(k)+1;if(idx===0){let best=Infinity;for(let p=1;p<palette.length;p++){const c=palette[p],dist=(raw[i]-c[0])**2+(raw[i+1]-c[1])**2+(raw[i+2]-c[2])**2+2*(raw[i+3]-c[3])**2;if(dist<best){best=dist;idx=p}}}cache.set(k,idx)}scan[y*(w+1)+1+x]=idx}
    if(!('CompressionStream' in window))throw Error('Dieser Browser unterstützt die PNG8-Kompression nicht. Bitte Safari, Chrome oder Firefox aktualisieren.');
    const stream=new Blob([scan]).stream().pipeThrough(new CompressionStream('deflate'));const compressed=new Uint8Array(await new Response(stream).arrayBuffer());const plte=new Uint8Array(palette.flatMap(c=>c.slice(0,3))),trns=new Uint8Array(palette.map(c=>c[3]));
    return join(new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',join(u32be(w),u32be(h),new Uint8Array([8,3,0,0,0]))),chunk('PLTE',plte),chunk('tRNS',trns),chunk('IDAT',compressed),chunk('IEND',new Uint8Array(0)));
  }
  function canvasWebp(canvas,quality){return new Promise((resolve,reject)=>canvas.toBlob(async blob=>blob?.type==='image/webp'?resolve(new Uint8Array(await blob.arrayBuffer())):reject(Error('WebP-Export wird in diesem Browser nicht unterstützt.')),'image/webp',quality))}
  $('download').addEventListener('click',async()=>{
    const button=$('download');button.disabled=true;setStatus('Bilder werden optimiert …');
    try{if(!state.image||!state.sponsors)throw Error('Bitte Bild und Sponsorenlogos laden.');const {svg,issues}=textSvg();if(issues.length)throw Error(issues.join(' · '));const limit=(+$('sizeLimit').value)*1000,logos=await png8(sponsorCanvas()),text=encoder.encode(svg),logo=encoder.encode(logoSvg()),html=encoder.encode(bannerHtml());const canvas=expandedImage();let best=null,bestQ=0;
      for(const q of [.86,.75,.64,.53,.42,.32,.22,.12]){const image=await canvasWebp(canvas,q);const zip=makeZip([['index.html',html],['background.webp',image],['logo.svg',logo],['textlayout.svg',text],['logos.png',logos]]);if(zip.length<=limit){best=zip;bestQ=q;break}best=zip}
      if(best.length>limit)throw Error(`Der Banner benötigt ${(best.length/1000).toFixed(1)} KB, erlaubt sind ${limit/1000} KB. Bitte ein kleineres Bildformat, kürzeren Text oder weniger Sponsorenlogos wählen.`);
      const filename=($('filename').value.trim()||'MKW_Banner').replace(/[\\/:*?"<>|]/g,'_').replace(/\.zip$/i,'')+'.zip';const url=URL.createObjectURL(new Blob([best],{type:'application/zip'}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);setStatus(`${filename} · ${(best.length/1000).toFixed(1)} KB / ${limit/1000} KB · WebP Qualität ${Math.round(bestQ*100)} %`);
    }catch(e){setStatus(e.message||String(e),true)}finally{button.disabled=false}
  });
  async function start(){await Promise.all([new Promise(r=>{sourceImage.onload=r;if(sourceImage.complete)r()}),new Promise(r=>{sponsorImage.onload=r;if(sponsorImage.complete)r()}),document.fonts.ready]);state.image=sourceImage;state.sponsors=sponsorImage;addLine('WEST SIDE', 'replica',37);addLine('STORY', 'replica',37);addLine('Ein Konzert erleben.', 'harriet',22);layoutEditor();setupCrop()}
  start().catch(e=>setStatus('Initialisierung fehlgeschlagen: '+e.message,true));
})();
