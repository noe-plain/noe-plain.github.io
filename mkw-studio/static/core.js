(function(root){
const gcd=(a,b)=>b?gcd(b,a%b):a;
const ratio=(w,h)=>{const d=gcd(w,h);return `${w/d}x${h/d}`};
function dateName(value){
 const m=/^(\d{2})\.(\d{2})\.(\d{2})$/.exec(value);if(!m)throw Error('Datum bitte als TT.MM.JJ eingeben.');
 const [,d,mo,y]=m, dt=new Date(Date.UTC(2000+Number(y),Number(mo)-1,Number(d)));
 if(dt.getUTCDate()!=+d||dt.getUTCMonth()!=+mo-1)throw Error('Dieses Kalenderdatum gibt es nicht.');
 return y+mo+d;
}
const clean=s=>s.normalize('NFC').trim().replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/\s+/g,'_').replace(/[. ]+$/g,'').slice(0,80)||'Ohne-Titel';
function filenameDate(name){const m=/(?:^|\D)(\d{2})(\d{2})(\d{2})(?:\D|$)/.exec(String(name));if(!m)return '';const [,y,mo,d]=m,value=`${d}.${mo}.${y}`;try{dateName(value);return value}catch{return ''}}
function weekday(value){if(!value)return '';const m=/^(\d{2})\.(\d{2})\.(\d{2})$/.exec(value);if(!m)return '';const [,d,mo,y]=m,dt=new Date(Date.UTC(2000+Number(y),Number(mo)-1,Number(d)));return ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'][dt.getUTCDay()]}
function names(p,boards){if(!Number.isInteger(+p.start)||+p.start<0)throw Error('Startnummer muss eine nichtnegative ganze Zahl sein.');return boards.map((b,i)=>`${dateName(p.date)}_${clean(p.code)}_${clean(p.title)}_${ratio(b.w,b.h)}_${+p.start+i}.jpg`)}
const api={ratio,dateName,clean,filenameDate,weekday,names}; if(typeof module!=='undefined')module.exports=api;else root.MKW=api;
})(globalThis);
