export const categories = ['banter','topics','polls','ideas'];
export function cleanText(value,max) {
  const s=String(value??'').trim();
  if(!s || s.length>max) throw Error(`Enter between 1 and ${max} characters.`);
  if(/https?:|www\.|@|\b\d[\d\s()+-]{7,}\d\b/i.test(s)) throw Error('Please remove links, email addresses and phone numbers.');
  return s;
}
export function makePost({title,body,kind,options=[],parentId='',audience},member,uid,timestamp) {
  if(!categories.includes(kind)||!['adult','junior'].includes(audience))throw Error('Choose a valid room and category.');
  const choices=kind==='polls'&&!parentId?options.map(x=>cleanText(x,60)):[];
  if(kind==='polls'&&!parentId&&(choices.length!==2||choices[0].toLowerCase()===choices[1].toLowerCase()))throw Error('Enter two different poll choices.');
  return {title:cleanText(title,100),body:cleanText(body,1200),kind,options:choices,parentId,audience,authorUid:uid,alias:member.alias,createdAt:timestamp,status:'pending',locked:false,moderatedBy:'',moderatedAt:timestamp};
}
