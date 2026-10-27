const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,updateDoc,collection,addDoc,getDocs,query,where,limit,serverTimestamp,writeBatch}=require('firebase/firestore');
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
  await assertFails(getDoc(doc(junior,'hubPosts/juniorPost')));
  await assertFails(getDoc(doc(outsider,'hubPosts/adultPost')));
  await assertFails(getDoc(doc(unverified,'hubPosts/adultPost')));
  await assertFails(getDoc(doc(junior,'hubPosts/pendingPost')));
  await assertSucceeds(getDoc(doc(adult,'hubPosts/pendingPost')));
  await assertFails(getDoc(doc(coach,'hubPosts/juniorPost')));
  await assertFails(updateDoc(doc(adult,'hubPosts/adultPost'),{status:'approved',body:'edited'}));
  await assertFails(setDoc(doc(adult,'hubStaff',uid),{role:'admin',active:true}));
  await assertFails(updateDoc(doc(adult,'hubMembers',uid),{audience:'junior'}));
  await assertFails(getDoc(doc(adult,'admin',admin)));
  await assertFails(getDoc(doc(outsider,'members',uid)));
  await assertSucceeds(getDoc(doc(coach,'admin',admin)));
  await assertSucceeds(getDoc(doc(outsider,'hubSettings/access')));
  await assertSucceeds(getDoc(doc(adult,'hubSettings/access')));
  await assertFails(setDoc(doc(adult,'hubPosts','newJunior'),{audience:'junior'}));
  // Actual feed queries must work, not just individual document reads.
  await assertSucceeds(getDocs(query(collection(adult,'hubPosts'),where('audience','==','adult'),where('status','==','approved'),where('kind','==','topics'),limit(50))));
  await assertSucceeds(getDocs(query(collection(adult,'hubPosts'),where('audience','==','adult'),where('authorUid','==',uid),limit(50))));
  await assertFails(getDocs(query(collection(outsider,'hubPosts'),where('audience','==','adult'),where('status','==','approved'),limit(50))));
  await assertFails(getDocs(query(collection(junior,'hubPosts'),where('audience','==','adult'),where('status','==','approved'),limit(50))));
  // Member cannot approve posts; staff can approve pending submissions.
  await assertFails(updateDoc(doc(adult,'hubPosts/pendingPost'),{status:'approved'}));
  await assertSucceeds(updateDoc(doc(coach,'hubPosts/pendingPost'),{status:'approved',locked:false,moderatedBy:admin,moderatedAt:serverTimestamp()}));
  // Poll voting is private, one vote per approved account.
  await env.withSecurityRulesDisabled(async c=>{
   await setDoc(doc(c.firestore(),'hubPosts/pollPost'),{audience:'adult',status:'approved',authorUid:uid,kind:'polls',parentId:'',locked:false,title:'Vote',body:'Choose',options:['A','B']});
  });
  await assertSucceeds(setDoc(doc(adult,'hubPosts/pollPost/votes',uid),{uid,choice:0,createdAt:serverTimestamp()}));
  await assertFails(setDoc(doc(adult,'hubPosts/pollPost/votes',uid),{uid,choice:1,createdAt:serverTimestamp()}));
  await assertFails(getDocs(collection(adult,'hubPosts/pollPost/votes')));
  await assertSucceeds(getDocs(collection(coach,'hubPosts/pollPost/votes')));
  // Reporting must hide a post in the same atomic batch.
  await assertFails(updateDoc(doc(adult,'hubPosts/adultPost'),{status:'flagged'}));
  const batch=writeBatch(adult);
  batch.set(doc(adult,'hubReports/adultPost_'+uid),{postId:'adultPost',reporterUid:uid,audience:'adult',reason:'bullying',status:'open',createdAt:serverTimestamp(),resolvedBy:'',resolvedAt:serverTimestamp()});
  batch.update(doc(adult,'hubPosts/adultPost'),{status:'flagged'});
  await assertSucceeds(batch.commit());
  await assertFails(getDoc(doc(adult,'hubReports/adultPost_'+uid)));
  await assertSucceeds(getDoc(doc(coach,'hubReports/adultPost_'+uid)));
  await assertSucceeds(updateDoc(doc(coach,'hubReports/adultPost_'+uid),{status:'resolved',resolvedBy:admin,resolvedAt:serverTimestamp()}));
  console.log('PASS: adult-only room enforcement, membership controls, moderation boundaries and existing admin protection');
 }finally{await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1});
