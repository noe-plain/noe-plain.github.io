(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const source=Array.isArray(window.MKW_TOOLS)?window.MKW_TOOLS:[];
  const tools=source.filter(t=>t && typeof t.name==='string' && typeof t.path==='string' && /^\.\//.test(t.path));
  const state={category:'Alle',query:''};
  const knownIcons=new Set(['studio','image','tool','code','download','spark']);
  const categories=['Alle',...new Set(tools.map(t=>t.category||'Weitere'))];
  const countText=n=>`${n} Tool${n===1?'':'s'}`;
  $('headerCount').textContent=countText(tools.length).toUpperCase();
  $('heroCount').textContent=countText(tools.length);
  const normalize=text=>String(text||'').toLocaleLowerCase('de-CH').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  function filters(){
    $('filters').replaceChildren(...categories.map(category=>{
      const b=document.createElement('button');b.type='button';b.textContent=category;b.classList.toggle('active',state.category===category);b.setAttribute('aria-pressed',String(state.category===category));
      b.addEventListener('click',()=>{state.category=category;filters();render()});return b;
    }));
  }
  function card(tool,index){
    const a=document.createElement('a');a.className='tool-card';a.href=tool.path;a.setAttribute('aria-label',`${tool.name} öffnen`);
    const top=document.createElement('div');top.className='card-top';
    const icon=document.createElement('div');icon.className='card-icon';icon.setAttribute('aria-hidden','true');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#icon-'+(knownIcons.has(tool.icon)?tool.icon:'tool'));svg.append(use);icon.append(svg);
    const number=document.createElement('span');number.className='card-number';number.textContent=String(index+1).padStart(2,'0');top.append(icon,number);
    const body=document.createElement('div');body.className='card-content';
    const label=document.createElement('span');label.className='card-category';label.textContent=tool.category||'Weitere';
    const title=document.createElement('h3');title.textContent=tool.name;
    const description=document.createElement('p');description.textContent=tool.description||'';
    body.append(label,title,description);
    const bottom=document.createElement('div');bottom.className='card-bottom';
    const action=document.createElement('span');action.textContent='Tool öffnen';const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');bottom.append(action,arrow);
    a.append(top,body,bottom);return a;
  }
  function render(){
    const matches=tools.filter(t=>{
      if(state.category!=='Alle'&&(t.category||'Weitere')!==state.category)return false;
      return normalize([t.name,t.description,t.category,...(Array.isArray(t.tags)?t.tags:[])].join(' ')).includes(normalize(state.query));
    });
    $('toolsGrid').replaceChildren(...matches.map(t=>card(t,tools.indexOf(t))));
    $('emptyResult').hidden=matches.length>0;
    $('resultCount').textContent=`${matches.length} von ${countText(tools.length)}`;
    if(!tools.length){$('emptyResult').querySelector('h3').textContent='Noch keine Tools eingetragen.';$('emptyResult').querySelector('p').textContent='Trage die Tools in tools.js ein.'}
  }
  $('search').addEventListener('input',e=>{state.query=e.target.value;render()});
  document.addEventListener('keydown',e=>{
    if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('search').focus()}
    if(e.key==='Escape'&&document.activeElement===$('search')){$('search').value='';state.query='';render();$('search').blur()}
  });
  filters();render();
})();
