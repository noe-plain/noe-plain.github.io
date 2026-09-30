'use strict';
const MKWFormats = (() => {
 const defaults=()=>[{w:1080,h:1920,top:200,bottom:500},{w:1080,h:1080,top:100,bottom:200},{w:1080,h:1350,top:100,bottom:200}];
 function validate(f){return f&&['w','h','top','bottom'].every(k=>Number.isInteger(f[k]))&&f.w>=240&&f.h>=240&&f.w<=10000&&f.h<=10000&&f.w*f.h<=40000000&&f.top>=0&&f.bottom>=0&&f.top+f.bottom<f.h;}
 const legacy=()=>[{w:1080,h:1080,top:100,bottom:200},{w:1080,h:1920,top:200,bottom:500}];
 return {defaults,validate,legacy};
})();
let formatDraft=[],setupWasBusy=false,setupCommitted=false;
function openProjectSetup(){
 setupWasBusy=busy;setupCommitted=false;busy=true;
 formatDraft=MKWFormats.defaults().map(f=>({...f,enabled:true}));
 $('#setupError').textContent='';renderFormatSetup();$('#projectSetup').showModal();
}
function renderFormatSetup(){
 $('#formatChoices').innerHTML=formatDraft.map((f,i)=>`<fieldset class="format-choice" data-format="${i}"><legend><label><input type="checkbox" data-format-enabled ${f.enabled?'checked':''}> ${MKW.ratio(f.w,f.h).replace('x',':')}</label></legend><div class="format-fields">${[['w','Breite'],['h','Höhe'],['top','Schutzzone oben'],['bottom','Schutzzone unten']].map(([key,label])=>`<label>${label} (px)<input type="number" data-format-key="${key}" min="${key==='w'||key==='h'?240:0}" max="10000" step="1" value="${f[key]}"></label>`).join('')}</div></fieldset>`).join('');
 $('#formatChoices').querySelectorAll('[data-format]').forEach(row=>{
  const f=formatDraft[+row.dataset.format];row.querySelector('[data-format-enabled]').onchange=e=>f.enabled=e.target.checked;
  row.querySelectorAll('[data-format-key]').forEach(input=>input.oninput=()=>{f[input.dataset.formatKey]=Number(input.value);row.querySelector('legend label').lastChild.textContent=' '+(f.w>0&&f.h>0?MKW.ratio(f.w,f.h).replace('x',':'):'Eigenes Format')});
 });
}
$('#addFormat').onclick=()=>{formatDraft.push({w:1080,h:1440,top:100,bottom:200,enabled:true});renderFormatSetup();$('#formatChoices').lastElementChild.scrollIntoView({block:'nearest'})};
$('#cancelSetup').onclick=()=>$('#projectSetup').close();
$('#projectSetup').addEventListener('close',()=>{if(!setupCommitted)busy=setupWasBusy});
$('#createProject').onclick=()=>{
 const formats=formatDraft.filter(f=>f.enabled).map(({w,h,top,bottom})=>({w,h,top,bottom}));
 if(!formats.length||formats.some(f=>!MKWFormats.validate(f))){$('#setupError').textContent='Wähle mindestens ein Format. Breite/Höhe: 240–10000 px, maximal 40 Mio. Pixel. Obere und untere Schutzzone müssen zusammen kleiner als die Bildhöhe sein.';return}
 if(new Set(formats.map(f=>`${f.w}x${f.h}`)).size!==formats.length){$('#setupError').textContent='Jede Bildgrösse bitte nur einmal auswählen.';return}
 if(editingText)editingText.el.blur();const fonts=p.fonts;p=fresh();p.fonts=fonts;p.formats=formats;selected=null;history=[];future=[];revision=savedRevision=0;busy=false;
 setupCommitted=true;$('#projectSetup').close();$('#startDialog').close();render();status('Projekt bereit · Bilder hinzufügen.');
};
