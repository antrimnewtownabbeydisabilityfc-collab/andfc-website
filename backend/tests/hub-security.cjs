const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,updateDoc,collection,addDoc,getDocs,query,where,limit,serverTimestamp}=require('firebase/firestore');
const fs=require('fs');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'andfc-hub-rules-test',firestore:{rules:fs.readFileSync('backend/combined-firestore.rules','utf8'),host:'127.0.0.1',port:8080}});
 const uid='member1', other='member2', admin='admin1';
 const user=(id,verified=true)=>env.authenticatedContext(id,{email_verified:verified,email:id+'@example.test'}).firestore();
 try{
  await env.withSecurityRulesDisabled(async c=>{
   const db=c.firestore();
   await setDoc(doc(db,'hubSettings/access'),{enabled:true,schemaVersion:1});
   await setDoc(doc(db,'admin',admin),{role:'admin',active:true});
   await setDoc(doc(db,'hubStaff',admin),{role:'admin',active:true});
   await setDoc(doc(db,'hubMembers',uid),{active:true,audience:'adult',alias:'Member One'});
   await setDoc(doc(db,'hubMembers',other),{active:true,audience:'junior',alias:'Guardian Two'});
   await setDoc(doc(db,'hubPosts','adultPost'),{audience:'adult',status:'approved',authorUid:uid,kind:'topics',parentId:'',locked:false,title:'Hello',body:'Welcome'});
   await setDoc(doc(db,'hubPosts','juniorPost'),{audience:'junior',status:'approved',authorUid:other,kind:'topics',parentId:'',locked:false,title:'Hello',body:'Welcome'});
   await setDoc(doc(db,'hubPosts','pendingPost'),{audience:'adult',status:'pending',authorUid:uid,kind:'topics',parentId:'',locked:false,title:'Waiting',body:'Waiting'});
  });
  const adult=user(uid),junior=user(other),coach=user(admin),outsider=user('outsider'),unverified=user(uid,false);
  await assertSucceeds(getDoc(doc(adult,'hubPosts/adultPost')));
  await assertFails(getDoc(doc(adult,'hubPosts/juniorPost')));
  await assertFails(getDoc(doc(junior,'hubPosts/adultPost')));
  await assertSucceeds(getDoc(doc(junior,'hubPosts/juniorPost')));
  await assertFails(getDoc(doc(outsider,'hubPosts/adultPost')));
  await assertFails(getDoc(doc(unverified,'hubPosts/adultPost')));
  await assertFails(getDoc(doc(junior,'hubPosts/pendingPost')));
  await assertSucceeds(getDoc(doc(adult,'hubPosts/pendingPost')));
  await assertSucceeds(getDoc(doc(coach,'hubPosts/juniorPost')));
  await assertFails(updateDoc(doc(adult,'hubPosts/adultPost'),{status:'approved',body:'edited'}));
  await assertFails(setDoc(doc(adult,'hubStaff',uid),{role:'admin',active:true}));
  await assertFails(updateDoc(doc(adult,'hubMembers',uid),{audience:'junior'}));
  await assertFails(getDoc(doc(adult,'admin',admin)));
  await assertFails(getDoc(doc(outsider,'members',uid)));
  await assertSucceeds(getDoc(doc(coach,'admin',admin)));
  await assertFails(getDoc(doc(outsider,'hubSettings/access')));
  await assertSucceeds(getDoc(doc(adult,'hubSettings/access')));
  console.log('PASS: adult/junior isolation, staff access, unverified and outsider rejection, pending privacy, no self-promotion, existing admin protection');
 }finally{await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1});
