const ERROR_CODE_PATTERN=/^[A-Z0-9_:-]{1,80}$/;

function requestPath(req){
  const host=String(req.headers?.host??'localhost').trim()||'localhost';
  let url;
  try{url=new URL(req.url??'/',`http://${host}`);}catch{return '/invalid-request-url';}
  const rewritten=url.searchParams.get('__path');
  return rewritten===null?url.pathname:`/${rewritten.replace(/^\/+/, '')}`;
}

function isPublicSaaSPath(path){
  return path==='/public-saas'||path?.startsWith('/public-saas/')||path?.startsWith('/api/public-saas/');
}

function boundedRequestId(req){
  const raw=String(req.headers?.['x-vercel-id']??req.headers?.['x-request-id']??'').trim();
  if(!raw)return null;
  return raw.slice(0,160).replace(/[^A-Za-z0-9_.:\/-]/g,'_');
}

function errorCodeFromBody(body){
  if(body===undefined||body===null)return 'HTTP_ERROR';
  const text=Buffer.isBuffer(body)?body.toString('utf8'):String(body);
  if(!text||text.length>16*1024)return 'HTTP_ERROR';
  try{
    const payload=JSON.parse(text);
    const candidate=String(payload?.code??'');
    return ERROR_CODE_PATTERN.test(candidate)?candidate:'HTTP_ERROR';
  }catch{
    return 'HTTP_ERROR';
  }
}

function safeErrorCode(error){
  const candidate=String(error?.code??'UNHANDLED_SERVER_ERROR');
  return ERROR_CODE_PATTERN.test(candidate)?candidate:'UNHANDLED_SERVER_ERROR';
}

function emit(logger,record){
  const line=JSON.stringify(record);
  if(record.status>=500)logger?.error?.(line);
  else logger?.warn?.(line);
}

export function wrapPublicSaaSMonitoringBoundary(handler,{logger=console}={}){
  if(typeof handler!=='function')throw new TypeError('Public SaaS handler is required.');

  return async function monitoredPublicSaaSHandler(req,res){
    const path=requestPath(req);
    if(!isPublicSaaSPath(path))return handler(req,res);

    const method=String(req.method??'GET').toUpperCase();
    const requestId=boundedRequestId(req);
    let logged=false;
    const originalEnd=typeof res.end==='function'?res.end.bind(res):null;

    if(originalEnd){
      res.end=(body,...args)=>{
        const status=Number(res.statusCode??200);
        if(!logged&&status>=400){
          logged=true;
          emit(logger,{
            event:'public_saas_request_error',
            method,
            path,
            status,
            code:errorCodeFromBody(body),
            request_id:requestId,
          });
        }
        return originalEnd(body,...args);
      };
    }

    try{
      return await handler(req,res);
    }catch(error){
      if(!logged){
        logged=true;
        emit(logger,{
          event:'public_saas_unhandled_error',
          method,
          path,
          status:500,
          code:safeErrorCode(error),
          request_id:requestId,
        });
      }
      throw error;
    }
  };
}
