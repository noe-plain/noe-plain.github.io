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
function headingDate(text){
 const months=['JAN','FEB','MÄR','APR','MAI','JUN','JUL','AUG','SEP','OKT','NOV','DEZ'];
 const m=String(text).trim().toUpperCase().match(/^(?:(?:MO|DI|MI|DO|D0|FR|SA|SO)\.?\s+)?(\d{1,2})\.\s*(JAN(?:UAR)?|FEB(?:RUAR)?|MÄR(?:Z)?|MAERZ|APR(?:IL)?|MAI|JUN(?:I)?|JUL(?:I)?|AUG(?:UST)?|SEP(?:TEMBER)?|OKT(?:OBER)?|NOV(?:EMBER)?|DEZ(?:EMBER)?|\d{1,2})\.?\s*(\d{4}|\d{2})$/);
 if(!m)return '';const month=/^\d+$/.test(m[2])?+m[2]:months.indexOf(m[2].replace('MAERZ','MÄR').slice(0,3))+1,year=+m[3]<100?2000+(+m[3]):+m[3];if(year<2000||year>2099)return '';const value=m[1].padStart(2,'0')+'.'+String(month).padStart(2,'0')+'.'+String(year).slice(-2);try{dateName(value);return value}catch{return ''}
}
function imageCovers(b,im){const t=b.image,a=-t.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [[0,0],[b.w,0],[b.w,b.h],[0,b.h]].every(([x,y])=>{const dx=x-t.x,dy=y-t.y;return Math.abs(dx*c-dy*s)<=im.width*t.scale/2+.01&&Math.abs(dx*s+dy*c)<=im.height*t.scale/2+.01})}
const api={headingDate,imageCovers,ratio,dateName,clean,filenameDate,weekday,names}; if(typeof module!=='undefined')module.exports=api;else root.MKW=api;
})(globalThis);
