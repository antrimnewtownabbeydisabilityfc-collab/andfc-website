import {HUB_ENABLED,firebaseConfig} from './hub-config.js';
import {makePost,cleanText} from './hub-model.mjs';
const $=id=>document.getElementById(id);
const notice=text=>{$('notice').textContent=text;};
const hide=(id,value)=>{$(id).hidden=value;};
const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(label,action)=>{const b=element('button',label);b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await action();}catch(e){notice(e.message||'Unable to complete this action. Please try again.');}finally{b.disabled=false;}});return b;};
if(HUB_ENABLED) start().catch(()=>notice('The Hub is temporarily unavailable. Please contact a coach.'));
async function start(){
  const [{initializeApp},{getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut,sendPasswordResetEmail,setPersistence,inMemoryPersistence},F]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')]);
  const {getFirestore,doc,getDoc,setDoc,collection,query,where,getDocs,limit,serverTimestamp,updateDoc,writeBatch}=F;
  const app=initializeApp(firebaseConfig,'club-hub'),auth=getAuth(app),db=getFirestore(app);
  // Shared devices: no persistent sign-in or offline Firestore cache.
  await setPersistence(auth,inMemoryPersistence);
  let user=null,member=null,staff=null,audience='adult',category='banter',generation=0;
  const epoch=()=>generation;
  const valid=n=>n===generation&&user;
  const allowed=()=>!!user&&user.emailVerified&&(staff?.active===true||member?.active===true);
  const names={banter:'Banter',topics:'Topics',polls:'Polls',ideas:'Ideas'};
  const helpers={banter:'Share kind jokes and positive club moments. Everyone should be in on the joke.',topics:'Talk football, hobbies and club life.',polls:'Ask the club a question with two choices.',ideas:'Suggest fundraising events, trips and improvements.'};
  function clearPrivate(){for(const id of ['feed','mine','queue','reports','published'])$(id).replaceChildren();$('compose').reset();member=null;staff=null;hide('workspace',true);hide('moderation',true);hide('member-management',true);}
  const list=async(name,...filters)=>{const r=await getDocs(query(collection(db,name),...filters,limit(50)));return r.docs.map(d=>({id:d.id,...d.data()}));};
  async function checkAccess(){
    const accessGeneration=epoch(),accessUid=user?.uid;
    if(!user?.emailVerified)throw Error('Verify your email, then sign out and sign in again.');
    const [s,m,settings]=await Promise.all([getDoc(doc(db,'hubStaff',user.uid)),getDoc(doc(db,'hubMembers',user.uid)),getDoc(doc(db,'hubSettings','access'))]);
    if(accessGeneration!==epoch()||user?.uid!==accessUid)throw Error('Your session changed. Please try again.');
    if(!settings.exists()||settings.data().enabled!==true||settings.data().schemaVersion!==1)throw Error('Club Hub access has not been activated. Please contact a coach.');
    staff=s.exists()&&s.data().active===true&&['admin','moderator'].includes(s.data().role)?s.data():null;member=m.exists()?m.data():null;
    if(!allowed())throw Error('Your Club Hub access needs club approval. Please speak to a coach.');
    if(!staff)audience=member.audience;
    if(!['adult','junior'].includes(audience))throw Error('Your room needs to be assigned by a coach.');
    $('room').value=audience;hide('room-control',!staff);hide('moderation',!staff);hide('member-management',staff?.role!=='admin');
    hide('workspace',false);$('identity').textContent=(staff?'Coach / moderator':member.alias)+' · signed in';
    $('room-heading').textContent=audience==='adult'?'Adult members’ room':'Junior families’ room';
  }
  async function load(){
    if(!allowed())return;const n=epoch();notice('Loading Club Hub…');
    try{
      await checkAccess();if(!valid(n))return;
      const [approved,mine]=await Promise.all([list('hubPosts',where('audience','==',audience),where('status','==','approved'),where('kind','==',category)),list('hubPosts',where('audience','==',audience),where('authorUid','==',user.uid))]);
      if(!valid(n))return;
      const selected=approved.filter(p=>p.kind===category);$('feed').replaceChildren();
      for(const post of selected.filter(p=>!p.parentId).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)))$('feed').append(render(post,selected,n));
      if(!$('feed').children.length)$('feed').textContent='No approved posts here yet. Be the first to send one for coach approval.';
      $('mine').replaceChildren();for(const post of mine.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)))$('mine').append(render(post,[],n,true));
      if(!mine.length)$('mine').textContent='You have not submitted anything in this room.';
      if(staff)await loadModeration(n);
      if(valid(n))notice('You are in a private club room. New posts and replies need coach approval. Showing up to 50 posts per view; coaches should archive older posts.');
    }catch(e){if(valid(n)){clearPrivate();notice('Unable to load the private Hub. Your access may have changed, or the service may be unavailable. Sign out and back in, or speak to a coach.');}}
  }
  async function moderate(post,status,locked=post.locked){await updateDoc(doc(db,'hubPosts',post.id),{status,locked,moderatedBy:user.uid,moderatedAt:serverTimestamp()});await load();}
  function render(post,all,n,own=false,moderator=false){
    const card=element('article',null,'card hub-post');card.append(element('h3',post.title),element('p',post.alias+' · '+names[post.kind]+' · '+post.status,'meta'),element('p',post.body,'body'));
    if(own){
      if(post.status!=='withdrawn')card.append(button('Withdraw',async()=>{await updateDoc(doc(db,'hubPosts',post.id),{status:'withdrawn'});await load();}));
      return card;
    }
    if(moderator){card.append(button('Approve',()=>moderate(post,'approved')),button('Reject / hide',()=>moderate(post,'rejected')),button(post.locked?'Unlock discussion':'Lock discussion',()=>moderate(post,post.status,!post.locked)));return card;}
    if(post.kind==='polls'&&!post.parentId){
      const voteBox=element('div');card.append(voteBox);
      getDoc(doc(db,'hubPosts',post.id,'votes',user.uid)).then(v=>{if(!valid(n))return;if(v.exists())voteBox.append(element('p','Your vote: '+post.options[v.data().choice]+'. Results are available to coaches.'));else if(!post.locked)post.options.forEach((choice,i)=>voteBox.append(button('Vote: '+choice,async()=>{await setDoc(doc(db,'hubPosts',post.id,'votes',user.uid),{uid:user.uid,choice:i,createdAt:serverTimestamp()});await load();})));}).catch(()=>{if(valid(n))voteBox.textContent='Voting is unavailable.';});
      if(staff)card.append(button('View poll totals',async()=>{const votes=await listVotes(post.id);if(!valid(n))return;voteBox.replaceChildren(element('p',post.options.map((x,i)=>x+': '+votes.filter(v=>v.choice===i).length).join(' · ')));}));
    }
    if(!post.parentId){
      const replies=element('div',null,'replies');for(const reply of all.filter(x=>x.parentId===post.id))replies.append(render(reply,[],n));card.append(replies);
      if(!post.locked){const form=element('form'),label=element('label','Reply (coach approval required)'),input=element('textarea');input.maxLength=1200;input.required=true;input.rows=2;label.append(input);const submit=element('button','Send reply');submit.type='submit';form.append(label,submit);form.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;try{await setDoc(doc(collection(db,'hubPosts')),makePost({title:'Reply: '+post.title.slice(0,90),body:input.value,kind:post.kind,parentId:post.id,audience},staff?{alias:'AND FC Coach'}:member,user.uid,serverTimestamp()));input.value='';notice('Reply sent for coach approval.');}catch(e){notice(e.message||'Reply could not be sent.');}finally{submit.disabled=false;}});card.append(form);}else card.append(element('p','This discussion is locked.'));
    }
    const reportForm=element('details'),summary=element('summary','Report this post'),label=element('label','Reason'),reason=element('select');for(const [v,t]of [['bullying','Bullying or hurtful banter'],['privacy','Personal information'],['discrimination','Discrimination'],['safeguarding','Safeguarding concern'],['other','Other concern']]){const option=element('option',t);option.value=v;reason.append(option);}label.append(reason);reportForm.append(summary,label,element('p','This hides the post pending review. Speak privately to Ryan or another coach about urgent concerns.'),button('Send report and hide post',async()=>{
      const batch=writeBatch(db);batch.set(doc(db,'hubReports',post.id+'_'+user.uid),{postId:post.id,reporterUid:user.uid,audience,reason:reason.value,status:'open',createdAt:serverTimestamp(),resolvedBy:'',resolvedAt:serverTimestamp()});batch.update(doc(db,'hubPosts',post.id),{status:'flagged'});await batch.commit();await load();notice('Report sent. The post is hidden pending coach review. For urgent concerns, speak to Ryan or a coach directly.');}));card.append(reportForm);
    return card;
  }
  async function listVotes(id){const snapshot=await getDocs(collection(db,'hubPosts',id,'votes'));return snapshot.docs.map(x=>x.data());}
  async function loadModeration(n){
    const [pending,flagged,reports,published]=await Promise.all([list('hubPosts',where('audience','==',audience),where('status','==','pending')),list('hubPosts',where('audience','==',audience),where('status','==','flagged')),list('hubReports',where('audience','==',audience),where('status','==','open')),list('hubPosts',where('audience','==',audience),where('status','==','approved'))]);
    if(!valid(n))return;
    $('queue').replaceChildren();for(const p of [...flagged,...pending])$('queue').append(render(p,[],n,false,true));if(!$('queue').children.length)$('queue').textContent='No posts awaiting review.';
    $('published').replaceChildren();for(const p of published)$('published').append(render(p,[],n,false,true));
    $('reports').replaceChildren();for(const report of reports){const item=element('article',null,'card');item.append(element('p','Post '+report.postId+' · '+report.reason),button('Mark report resolved',async()=>{await updateDoc(doc(db,'hubReports',report.id),{status:'resolved',resolvedBy:user.uid,resolvedAt:serverTimestamp()});await load();}));$('reports').append(item);}if(!reports.length)$('reports').textContent='No open reports. Resolving a report does not automatically republish its post.';
  }
  $('login').addEventListener('submit',async e=>{e.preventDefault();try{await signInWithEmailAndPassword(auth,$('email').value.trim(),$('password').value);$('password').value='';}catch{notice('Sign-in failed. Check your email and password.');}});
  $('reset-password').addEventListener('click',async()=>{if(!$('email').value||!$('email').checkValidity()){notice('Enter your email address first.');return;}try{await sendPasswordResetEmail(auth,$('email').value.trim());notice('If an account exists, password reset instructions will be sent.');}catch{notice('Could not request a password reset. Please try again later.');}});
  $('logout').addEventListener('click',async()=>{generation++;clearPrivate();await signOut(auth);});
  $('refresh').addEventListener('click',load);$('refresh-mod').addEventListener('click',load);
  $('room').addEventListener('change',()=>{generation++;audience=$('room').value;load();});
  $('categories').addEventListener('click',e=>{const next=e.target.dataset.category;if(!names[next])return;generation++;category=next;for(const b of $('categories').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.category===category));$('feed-heading').textContent=names[category];$('category-help').textContent=helpers[category];hide('poll-options',category!=='polls');$('option-a').required=category==='polls';$('option-b').required=category==='polls';load();});
  $('compose').addEventListener('submit',async e=>{e.preventDefault();const submit=e.target.querySelector('button[type=submit]');submit.disabled=true;try{await checkAccess();const post=makePost({title:$('post-title').value,body:$('post-body').value,kind:category,options:[$('option-a').value,$('option-b').value],audience},staff?{alias:'AND FC Coach'}:member,user.uid,serverTimestamp());await setDoc(doc(collection(db,'hubPosts')),post);e.target.reset();await load();notice('Sent for coach approval. You can check it under My submissions.');}catch(e){notice(e.message||'Your post could not be sent.');}finally{submit.disabled=false;}});
  $('member-form').addEventListener('submit',async e=>{e.preventDefault();try{const uid=$('member-uid').value.trim();if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid))throw Error('Enter the Firebase account UID.');await setDoc(doc(db,'hubMembers',uid),{alias:cleanText($('member-alias').value,40),audience:$('member-room').value,active:$('member-active').value==='true',updatedBy:user.uid,updatedAt:serverTimestamp()});notice('Hub membership updated.');}catch(e){notice(e.message||'Membership could not be updated.');}});
  $('category-help').textContent=helpers.banter;
  hide('auth-section',false);notice('Sign in to access your approved club room.');
  onAuthStateChanged(auth,async next=>{generation++;clearPrivate();user=next;hide('auth-section',!!user);hide('account',!user);if(!user){notice('Sign in to access your approved club room.');return;}$('identity').textContent='Checking your club access…';try{await checkAccess();await load();}catch(e){notice(e.message);$('identity').textContent='Signed in · access not yet approved';}});
  // Avoid retaining member content in a shared device's background tab.
  document.addEventListener('visibilitychange',()=>{if(document.hidden){generation++;clearPrivate();}else if(user){checkAccess().then(load).catch(()=>notice('Please sign out and sign in again to check your access.'));}});
}
