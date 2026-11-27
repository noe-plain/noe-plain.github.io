const test = require('node:test'), assert = require('node:assert/strict');
const m = require('../static/campaign-title-model.js'), edit = require('../static/text-edit-model.js');
const empty = () => ({text:'',font:'Replica LL Regular',size:70,color:'#ffffff'});
test('FD fields create one native text with paragraph roles, exact new sizes and font cuts',()=>{
 const o=empty();for(const [key,value] of [['title','Musik'],['date','Heute'],['subtitle','Winterthur']]) Object.assign(o,m.update(o,key,value));
 assert.equal(o.text,'Heute\nMusik\nWinterthur');assert.deepEqual(o.textStyles.map(s=>s.size),[70,120,55]);assert.deepEqual(o.textStyles.map(s=>s.fdRole),['date','title','subtitle']);assert.deepEqual(o.characterStyles.map(s=>s.font),['Replica LL Regular','Replica LL','Replica LL Regular']);assert.deepEqual(m.read(o),{date:'Heute',title:'Musik',subtitle:'Winterthur'});
});
test('card text edits preserve canvas formatting, soft breaks, roles, and unrelated paragraphs',()=>{
 const o=empty();Object.assign(o,m.update(o,'title','Musik\nErleben'));Object.assign(o,m.update(o,'date','Heute'));o.textStyles[1].size=133;
 Object.assign(o,m.update(o,'title','Musik\nGemeinsam erleben'));assert.equal(o.textStyles[1].size,133);assert(o.text.includes('\u2028'));assert.equal(m.read(o).title,'Musik\nGemeinsam erleben');
 const at=o.text.indexOf('Musik');Object.assign(o,edit.replace(o,at,at+5,{text:'Klang'}));assert.equal(m.read(o).title,'Klang\nGemeinsam erleben');
 Object.assign(o,m.update(o,'date',''));assert.equal(m.read(o).title,'Klang\nGemeinsam erleben');assert.equal(o.textStyles[0].size,133);assert.throws(()=>m.update(o,'title','a'.repeat(100001)));
});
test('legacy combined frames retain all their original type sizes and cuts',()=>{
 const o={...empty(),text:'Heute\nMusik\nHier',textStyles:[{size:52},{size:104},{size:52}],characterStyles:[{start:6,end:11,font:'Harriet'}]};
 Object.assign(o,m.update(o,'title','Konzert'));assert.deepEqual(o.textStyles.map(s=>s.size),[52,104,52]);assert(o.characterStyles.some(s=>s.font==='Harriet'));assert.equal(m.read(o).date,'Heute');assert.equal(m.read(o).subtitle,'Hier');
});
