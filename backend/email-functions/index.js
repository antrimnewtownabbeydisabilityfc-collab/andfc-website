const {onDocumentCreated,onDocumentUpdated}=require('firebase-functions/v2/firestore');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {getAuth}=require('firebase-admin/auth');
initializeApp();
const db=getFirestore(),club='antrimnewtownabbeydisabilityfc@gmail.com';
const link='https://antrimnewtownabbeydisabilityfc-collab.github.io/andfc-website/club-hub.html';
async function queue(event,to,subject,body){if(!to)return;const id=require('node:crypto').createHash('sha256').update(event.id+'|'+to+'|'+subject).digest('hex');try{await db.collection('mail').doc(id).create({to:[to],message:{subject,text:body+'\n\nOpen AND FC: '+link},createdAt:FieldValue.serverTimestamp()});}catch(e){if(e.code!==6&&e.code!=='already-exists')throw e;}}
const alert=(path,subject)=>onDocumentCreated({document:path,retry:true},e=>queue(e,club,subject,'A new item requires your attention. Sign in to the club dashboard to review it.'));
exports.membershipRequest=alert('members/{uid}','AND FC: new membership request');
exports.hubRequest=alert('hubAccessRequests/{uid}','AND FC: new Members Area request');
exports.paymentRequest=alert('hubPaymentNotices/{id}','AND FC: payment awaiting verification');
exports.moderationRequest=alert('hubPosts/{id}','AND FC: post awaiting moderation');
exports.reportRequest=alert('hubReports/{id}','AND FC: new moderation report');
async function verifiedEmail(uid){try{const u=await getAuth().getUser(uid);return u.emailVerified&&!u.disabled?u.email:null;}catch(e){if(e.code==='auth/user-not-found')return null;throw e;}}
exports.paymentConfirmed=onDocumentUpdated({document:'hubPaymentNotices/{id}',retry:true},async e=>{const a=e.data.before.data(),b=e.data.after.data();if(a.status==='pending'&&b.status==='confirmed')await queue(e,await verifiedEmail(b.owner),'AND FC: payment confirmed','Your payment has been confirmed. Sign in to download your receipt.');});
exports.membershipDecision=onDocumentUpdated({document:'members/{uid}',retry:true},async e=>{const a=e.data.before.data(),b=e.data.after.data();if(a.status!==b.status&&['approved','rejected'].includes(b.status))await queue(e,await verifiedEmail(e.params.uid),'AND FC: membership update','Your membership status has changed. Sign in to view it.');});
