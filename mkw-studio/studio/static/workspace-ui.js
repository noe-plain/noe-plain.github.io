'use strict';
// Google Fonts Material Symbols Rounded, bundled locally for GitHub Pages.
const studioIconNames={image:'image',crop:'crop',text:'text_fields',logo:'branding_watermark',export:'download',undo:'undo',redo:'redo',folder:'folder_open',save:'save',new:'note_add',plus:'add',minus:'remove',close:'close',up:'expand_less',down:'expand_more',trash:'delete',replace:'swap_vert',move:'open_with',layers:'layers',duplicate:'content_copy',select:'arrow_selector_tool',content:'drag_pan',gradient:'gradient',angle:'chevron_right',hand:'drag_pan',zoom:'zoom_in',visible:'visibility',hidden:'visibility_off',locked:'lock',unlocked:'lock_open',front:'keyboard_arrow_up',back:'keyboard_arrow_down',warning:'warning',info:'info',guides:'grid_on',snap:'align_horizontal_center',sidebar:'right_panel_close',sidebarOpen:'right_panel_open',fit:'center_focus_strong'};
function studioIcon(name,extra=''){
 const symbol=studioIconNames[name]||studioIconNames.plus;
 return `<svg class="ui-icon ${extra}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-google-icon="${symbol}"><use width="24" height="24" href="static/icons/material-symbols.svg#${symbol}"></use></svg>`;
}

let studioSidebarOpen=!matchMedia('(max-width:760px)').matches,studioWarningItems=[];
function studioSetSidebar(open){
 const viewport=$('#carouselViewport'),canvas=$('#carouselCanvas');
 const rect=viewport?.getBoundingClientRect(),art=canvas?.getBoundingClientRect();
 const center=rect&&art?{x:(rect.left+viewport.clientWidth/2-art.left)/carouselZoom,y:(rect.top+viewport.clientHeight/2-art.top)/carouselZoom}:null;
 studioSidebarOpen=open;document.body.classList.toggle('sidebar-hidden',!open);document.body.classList.toggle('tools-open',open);
 for(const id of ['toolsToggle','carouselSidebarToggle']){
  const button=$('#'+id);if(!button)continue;
  button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Einstellungen ausblenden':'Einstellungen einblenden');button.title=button.getAttribute('aria-label');
  button.innerHTML=studioIcon(open?'sidebar':'sidebarOpen')+'<span>Einstellungen</span>';
 }
 if(center&&p.carousel){carouselRefresh();const next=canvas.getBoundingClientRect(),view=viewport.getBoundingClientRect();viewport.scrollLeft+=next.left+center.x*carouselZoom-view.left-viewport.clientWidth/2;viewport.scrollTop+=next.top+center.y*carouselZoom-view.top-viewport.clientHeight/2;}
}
function studioToggleSidebar(){studioSetSidebar(!studioSidebarOpen)}

function studioSetWarnings(items){
 studioWarningItems=items;
 const button=$(p.carousel?'#carouselNotice':'#postNotice');
 if(button){button.hidden=!items.length;button.innerHTML=studioIcon('warning')+`<span>${items.length} Hinweis${items.length===1?'':'e'}</span>`;button.setAttribute('aria-expanded',String(!$('#studioWarnings').hidden));}
 const list=$('#studioWarningList');
 list.innerHTML=items.map((item,index)=>`<button class="studio-warning-item" data-warning-index="${index}">${studioIcon('warning')}<span><strong>${esc(item.title)}</strong><span>${esc(item.message)}</span></span>${studioIcon('angle')}</button>`).join('');
 list.querySelectorAll('[data-warning-index]').forEach(button=>button.onclick=()=>studioFocusWarning(items[+button.dataset.warningIndex]));
 if(!items.length)studioCloseWarnings();
}
function studioCloseWarnings(){
 $('#studioWarnings').hidden=true;
 for(const id of ['postNotice','carouselNotice'])$('#'+id)?.setAttribute('aria-expanded','false');
}
function studioToggleWarnings(){
 const panel=$('#studioWarnings'),open=panel.hidden;panel.hidden=!open;
 $(p.carousel?'#carouselNotice':'#postNotice')?.setAttribute('aria-expanded',String(open));
 if(open)panel.querySelector('[data-warning-index]')?.focus();
}
function studioFocusWarning(item){
 studioCloseWarnings();studioSetSidebar(true);
 if(p.carousel){
  const o=p.carousel.objects.find(o=>o.id===item.id);if(!o)return;
  carouselTool('select');carouselSelect([o.id]);
  const viewport=$('#carouselViewport'),rect=viewport.getBoundingClientRect(),art=$('#carouselCanvas').getBoundingClientRect();
  viewport.scrollLeft+=art.left+(o.x+o.w/2)*carouselZoom-rect.left-viewport.clientWidth/2;
  viewport.scrollTop+=art.top+(o.y+o.h/2)*carouselZoom-rect.top-viewport.clientHeight/2;
 }else{
  if(editingText)editingText.el.blur();selectBoard(item.id);if(item.key)layer=item.key;chooseStep(item.step);
  document.querySelector(`.board-card[data-id="${item.id}"]`)?.scrollIntoView({block:'center',inline:'center'});
 }
}

const studioWarnings=document.createElement('section');studioWarnings.id='studioWarnings';studioWarnings.className='studio-notices';studioWarnings.hidden=true;studioWarnings.setAttribute('aria-labelledby','studioWarningsTitle');
studioWarnings.innerHTML=`<div class="studio-notices-heading"><h2 id="studioWarningsTitle">Hinweise zum Artwork</h2><button id="closeStudioWarnings" class="icon-button" aria-label="Hinweise schliessen">${studioIcon('close')}</button></div><p>Klicke auf einen Hinweis, um das Element zu prüfen.</p><div id="studioWarningList"></div>`;
document.body.append(studioWarnings);
$('#closeStudioWarnings').onclick=studioCloseWarnings;$('#postNotice').onclick=studioToggleWarnings;$('#toolsToggle').onclick=studioToggleSidebar;
$('#postViewControls').setAttribute('aria-label','Zoom');document.querySelector('footer').append($('#postViewControls'));
studioSetSidebar(studioSidebarOpen);
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#studioWarnings,#postNotice,#carouselNotice'))studioCloseWarnings()});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#studioWarnings').hidden){studioCloseWarnings();event.stopPropagation()}},true);
matchMedia('(max-width:760px)').addEventListener('change',event=>studioSetSidebar(!event.matches));
