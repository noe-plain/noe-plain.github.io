const test=require('node:test');
const assert=require('node:assert/strict');
const family=require('../static/family.js');
test('eight distinct in-gamut colours have consistent perceptual lightness',()=>{
 assert.equal(new Set(family.palette.map(c=>c.hex)).size,8);
 for(const {hex} of family.palette){
  assert.match(hex,/^#[0-9a-f]{6}$/);
  const [r,g,b]=hex.slice(1).match(/../g).map(h=>parseInt(h,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  assert(Math.abs(.2104542553*l+.793617785*m-.0040720468*s-.72)<.002);
 }
});
test('visible graphemes never repeat adjacent colours and preserve PSD UTF-16 lengths',()=>{
 const text='Familien 👨‍👩‍👧‍👦  Ä\nKONZERTE 2027';
 for(let offset=0;offset<8;offset++){
  const runs=family.runs(text,offset),visible=runs.filter(r=>r.visible);
  assert.equal(runs.map(r=>r.text).join(''),text);
  assert.equal(runs.reduce((n,r)=>n+r.length,0),text.length);
  assert.equal(runs.filter(r=>r.text==='👨‍👩‍👧‍👦').length,1);
  for(let i=1;i<visible.length;i++)assert.notEqual(visible[i-1].color,visible[i].color);
  assert.equal(family.runs('Weiter',offset+family.count(text))[0].color,family.palette[(offset+visible.length)%8].hex);
 }
});
