import os,json,urllib.request,urllib.error,smtplib,ssl
from email.message import EmailMessage
def request(url, data=None, token=None, method=None):
    headers={'Content-Type':'application/json'}
    if token: headers['Authorization']='Bearer '+token
    req=urllib.request.Request(url,data=json.dumps(data).encode() if data is not None else None,headers=headers,method=method)
    with urllib.request.urlopen(req,timeout=30) as res: return json.load(res)
def main():
    auth=request('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDhnHMtH4J5sN2WlEVjaAzh8h25xBGipIE',{'email':'notifications@andfc.example','password':os.environ['FIREBASE_NOTIFICATION_PASSWORD'],'returnSecureToken':True})
    if auth['localId']!='V9rJYy568IR9i6KFjDN5sR5rI9r1': raise RuntimeError('Unexpected account')
    token=auth['idToken']
    base='https://firestore.googleapis.com/v1/projects/and-fc-club-app/databases/(default)/documents/'
    page=''
    while True:
        from urllib.parse import urlencode
        result=request(base+'hubAccessRequests?'+urlencode({'pageSize':50,'pageToken':page}),token=token)
        for item in result.get('documents',[]):
            uid=item['name'].split('/')[-1]
            created=item['fields']['createdAt']['timestampValue']
            import hashlib
            key=hashlib.sha256((uid+created).encode()).hexdigest()
            try:
                request(base+'hubNotificationSent/'+key,token=token)
                continue
            except urllib.error.HTTPError as e:
                if e.code!=404: raise
            msg=EmailMessage()
            addr='antrimnewtownabbeydisabilityfc@gmail.com'
            msg['From']=addr;msg['To']=addr;msg['Subject']='New AND FC membership request'
            msg.set_content('A member has requested access to the AND FC Club Hub. Sign in to review pending requests: https://antrimnewtownabbeydisabilityfc-collab.github.io/andfc-website/club-hub.html')
            with smtplib.SMTP_SSL('smtp.gmail.com',465,context=ssl.create_default_context(),timeout=30) as smtp:
                smtp.login(addr,os.environ['GMAIL_APP_PASSWORD'])
                smtp.send_message(msg)
            request(base+'hubNotificationSent?documentId='+key,{'fields':{'sent':{'booleanValue':True}}},token=token)
        page=result.get('nextPageToken')
        if not page: break
if __name__=='__main__':
    try: main()
    except Exception as e:
        print('Notification check failed:',type(e).__name__,getattr(e,'code',''))
        raise SystemExit(1)
