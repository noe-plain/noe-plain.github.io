'use strict';
const studioPreferenceDefaults={guideColour:'#93a8ef',snapColour:'#f5a8e8',snapDistance:6,exportFormat:'jpg',advanced:false,pdfPreset:'linkedin',lineHeight:95};
let studioPreferences={...studioPreferenceDefaults};
try{const saved=JSON.parse(localStorage.getItem('mkw-studio-preferences')||'{}');if(['linkedin','linkedin-square','original','compact'].includes(saved.pdfPreset))studioPreferences.pdfPreset=saved.pdfPreset;if(Number.isFinite(saved.lineHeight)&&saved.lineHeight>=20&&saved.lineHeight<=300)studioPreferences.lineHeight=saved.lineHeight;if(typeof saved.advanced==='boolean')studioPreferences.advanced=saved.advanced;for(const key of ['guideColour','snapColour'])if(/^#[0-9a-f]{6}$/i.test(saved[key]))studioPreferences[key]=saved[key];if(Number.isInteger(saved.snapDistance)&&saved.snapDistance>=1&&saved.snapDistance<=40)studioPreferences.snapDistance=saved.snapDistance;if(['jpg','png','webp'].includes(saved.exportFormat))studioPreferences.exportFormat=saved.exportFormat}catch{}
function studioApplyPreferences(){
 const style=document.documentElement.style;style.setProperty('--studio-guide-colour',studioPreferences.guideColour);style.setProperty('--studio-guide-soft',studioPreferences.guideColour+'88');style.setProperty('--studio-guide-faint',studioPreferences.guideColour+'33');style.setProperty('--studio-snap-colour',studioPreferences.snapColour);
 for(const id of ['guideColour','snapColour','snapDistance'])$('#'+id).value=studioPreferences[id];$('#defaultExportFormat').value=studioPreferences.exportFormat;$('#advancedMode').checked=studioPreferences.advanced;carouselSyncAdvancedTools();
 try{localStorage.setItem('mkw-studio-preferences',JSON.stringify(studioPreferences))}catch{}
}
for(const id of ['guideColour','snapColour'])$('#'+id).oninput=event=>{studioPreferences[id]=event.target.value;studioApplyPreferences()};
$('#snapDistance').onchange=event=>{studioPreferences.snapDistance=Math.max(1,Math.min(40,Math.round(Number(event.target.value)||6)));studioApplyPreferences()};
$('#defaultExportFormat').onchange=event=>{studioPreferences.exportFormat=event.target.value;p.exportOptions={...p.exportOptions,format:event.target.value};touchMeta();studioApplyPreferences()};
$('#advancedMode').onchange=event=>{studioPreferences.advanced=event.target.checked;studioApplyPreferences()};
studioApplyPreferences();
function studioSetTheme(theme){
 theme=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=theme;
 try{localStorage.setItem('mkw-studio-theme',theme)}catch{}
 document.querySelectorAll('[data-theme-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===theme)));
 document.querySelectorAll('header .brand img,.start-brand img').forEach(logo=>logo.src=theme==='light'?'mkw-logo-bold-pos.svg':'mkw-logo-bold-neg.svg');
}
$('#settings').onclick=()=>{studioRenderFontSettings();$('#settingsDialog').showModal()};
$('#closeSettings').onclick=()=>$('#settingsDialog').close();
document.querySelectorAll('[data-theme-choice]').forEach(button=>button.onclick=()=>studioSetTheme(button.dataset.themeChoice));
studioSetTheme(document.documentElement.dataset.theme);

function studioPrepareSave(){
 $('#projectCode').value=p.meta.code||'';$('#projectName').value=p.meta.title||'';$('#saveDate').value=p.meta.date||'';$('#saveName').dataset.custom='false';
 $('#psdDescription').textContent=p.carousel?'Zusammenhängendes Artwork, Ebenen, Texte und ein Slice pro Slide':'Zeichenflächen, Textebenen und eingebettete Bilder';
}
function studioRefreshSaveName(){if($('#saveDialog').open&&$('#saveName').dataset.custom!=='true')$('#saveName').value=MKW.projectName(p.meta)}
$('#saveName').addEventListener('input',()=>$('#saveName').dataset.custom='true');
for(const id of ['projectCode','projectName'])$('#'+id).addEventListener('input',studioRefreshSaveName);
$('#saveDate').oninput=event=>{p.meta.date=event.target.value;touchMeta();studioRefreshSaveName()};
