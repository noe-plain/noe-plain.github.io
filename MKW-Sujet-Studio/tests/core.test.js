const {test}=require('node:test');const assert=require('node:assert/strict');const c=require('../static/core.js');
test('JJMMTT only',()=>{assert.equal(c.dateName('15.11.26'),'261115');assert.equal(c.dateName('01.12.26'),'261201');assert.equal(c.dateName('29.02.24'),'240229')});
test('valid calendar dates',()=>{for(const s of ['29.02.25','31.04.26','00.01.26','01.13.26','1.1.26','31.02.26'])assert.throws(()=>c.dateName(s))});
test('actual aspect ratio',()=>{assert.equal(c.ratio(1080,1920),'9x16');assert.equal(c.ratio(1080,1350),'4x5');assert.equal(c.ratio(531,719),'531x719')});
test('visible numbering and cleaned names',()=>{assert.deepEqual(c.names({date:'15.11.26',code:'E2',title:'Dichterlos',start:3},[{w:1080,h:1920},{w:1080,h:1080}]),['261115_E2_Dichterlos_9x16_3.jpg','261115_E2_Dichterlos_1x1_4.jpg']);assert.equal(c.clean('A/B: C?'),'A-B-_C-');assert.throws(()=>c.names({start:1.5},[]))});
