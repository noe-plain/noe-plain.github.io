const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(require.resolve('../static/carousel-folder-order.js'), 'utf8'), context);
const keys = c => Array.from(context.carouselLayerBlocks(c), b => b.key);
const fixture = () => ({
  objects: [
    {id:'back',type:'image',x:42},
    {id:'a1',type:'path',folderId:'a',x:10},
    {id:'a2',type:'text',folderId:'a',x:20},
    {id:'b1',type:'image',folderId:'b',x:30},
    {id:'front',type:'gradient',x:40},
    {id:'logo',type:'logo',x:50},
  ],
  folders: [{id:'a',colour:'#537ae8'}, {id:'b',colour:'#9170da'}, {id:'empty',before:'folder:a'}],
});
test('folder reorder moves the entire paint block, preserving geometry and internal order', () => {
  const c=fixture(), result=context.carouselReorderFolder(c,'a','folder:b');
  assert.deepEqual(Array.from(result.objects,o=>o.id),['back','b1','a1','a2','front','logo']);
  assert(result.objects.every(o=>c.objects.includes(o)));
  assert.equal(result.folders.find(f=>f.id==='a').colour,'#537ae8');
  assert.deepEqual(c.objects.map(o=>o.id),['back','a1','a2','b1','front','logo'],'pure model operation must not mutate input');
  const top=context.carouselReorderFolder(c,'a','layer:logo');
  assert.equal(top.objects.at(-1).type,'logo');
});
test('empty folder positions survive serialization and receiving their first member', () => {
  const c=fixture(), result=context.carouselReorderFolder(c,'empty','folder:b');
  assert.deepEqual(Array.from(result.objects,o=>o.id),c.objects.map(o=>o.id));
  Object.assign(c,JSON.parse(JSON.stringify(result)));
  assert.deepEqual(keys(c),['layer:logo','layer:front','folder:empty','folder:b','folder:a','layer:back']);
  const folder=c.folders.find(f=>f.id==='empty');
  c.objects.splice(c.objects.length-1,0,{id:'new',type:'text',folderId:'empty'});
  const placed=context.carouselReorderFolder(c,'empty',folder.before);
  if(placed)Object.assign(c,placed);
  assert.deepEqual(keys(c),['layer:logo','layer:front','folder:empty','folder:b','folder:a','layer:back']);
});
test('locked contents, no-op drops and stale empty-folder anchors are safe', () => {
  const c=fixture();c.objects.find(o=>o.id==='a1').locked=true;
  assert.equal(context.carouselReorderFolder(c,'a','layer:front'),null);
  assert.equal(context.carouselReorderFolder(c,'b','folder:b'),null);
  c.folders.find(f=>f.id==='empty').before='folder:missing';
  assert.equal(keys(c).at(-1),'folder:empty');
  c.folders.push({id:'other',before:'folder:empty'});
  c.folders.find(f=>f.id==='empty').before='folder:other';
  assert.equal(new Set(keys(c)).size,keys(c).length);
});
