import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapPublicSaaSSecurityBoundary } from '../src/public-saas/security-boundary.mjs';

function strictResponse(){
  return {
    statusCode:null,
    headers:{},
    body:'',
    headersSent:false,
    setHeader(name,value){
      if(this.headersSent)throw new Error('ERR_HTTP_HEADERS_SENT');
      this.headers[String(name).toLowerCase()]=value;
    },
    writeHead(status){
      this.statusCode=status;
      this.headersSent=true;
    },
    end(value=''){this.body+=String(value);},
  };
}

test('CSRF rejection sets content-type before writeHead and never writes headers after send',async()=>{
  let delegated=false;
  const handler=wrapPublicSaaSSecurityBoundary(async()=>{delegated=true;});
  const req={
    url:'/api/public-saas/auth/sign-up',
    method:'POST',
    headers:{host:'app.example.test'},
  };
  const res=strictResponse();

  await handler(req,res);

  assert.equal(delegated,false);
  assert.equal(res.statusCode,403);
  assert.equal(res.headers['content-type'],'application/json; charset=utf-8');
  assert.equal(res.headers['x-content-type-options'],'nosniff');
  assert.deepEqual(JSON.parse(res.body),{
    error:'Origin header is required for state-changing requests.',
    code:'CSRF_REJECTED',
  });
});
