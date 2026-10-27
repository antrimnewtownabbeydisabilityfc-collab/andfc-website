import test from 'node:test';
import assert from 'node:assert/strict';
import {makePost,cleanText} from '../hub-model.mjs';
const input={title:'Club trip',body:'What activities would you enjoy?',kind:'ideas',audience:'adult'};
test('submissions cannot select approval or impersonate an author',()=>{
 const p=makePost({...input,status:'approved',authorUid:'someone-else'},{alias:'Club Member'},'member1','server-time');
 assert.equal(p.status,'pending');assert.equal(p.authorUid,'member1');assert.equal(p.alias,'Club Member');assert.equal(p.moderatedBy,'');
});
test('all categories supported and cross-room input rejected',()=>{
 for(const kind of ['banter','topics','ideas'])assert.equal(makePost({...input,kind},{alias:'Member'},'u','t').kind,kind);
 assert.throws(()=>makePost({...input,audience:'public'},{alias:'Member'},'u','t'));
});
test('polls require two different choices',()=>{
 assert.throws(()=>makePost({...input,kind:'polls',options:['Yes','yes']},{alias:'M'},'u','t'));
 assert.throws(()=>makePost({...input,kind:'polls',options:['Yes']},{alias:'M'},'u','t'));
 assert.deepEqual(makePost({...input,kind:'polls',options:['Walk','Quiz']},{alias:'M'},'u','t').options,['Walk','Quiz']);
});
test('replies have no poll choices and stay pending',()=>{const p=makePost({...input,kind:'polls',parentId:'parent'},{alias:'M'},'u','t');assert.deepEqual(p.options,[]);assert.equal(p.status,'pending');});
test('contact information and oversized/empty text are rejected',()=>{
 for(const text of ['https://example.com','www.example.com','hello@example.com','07700 900123','', 'x'.repeat(1201)])assert.throws(()=>cleanText(text,1200));
 assert.equal(cleanText('  Good match!  ',100),'Good match!');
});
