import { PublicSaaSError } from './domain.mjs';
import { createSessionPrincipal } from './authorization.mjs';

const trim=(value)=>String(value??'').trim();

function normalizeBaseUrl(value){
  const raw=trim(value).replace(/\/+$/,'');
  if(!raw)return null;
  let parsed;
  try{parsed=new URL(raw);}catch{throw new PublicSaaSError('AUTH_PROVIDER_CONFIG_INVALID','SUPABASE_URL is not a valid URL.');}
  const local=parsed.hostname==='localhost'||parsed.hostname==='127.0.0.1';
  if(parsed.protocol!=='https:'&&!local)throw new PublicSaaSError('AUTH_PROVIDER_CONFIG_INVALID','SUPABASE_URL must use HTTPS outside local development.');
  return raw;
}

function normalizeRedirectUrl(value){
  const raw=trim(value);
  if(!raw)return null;
  let parsed;
  try{parsed=new URL(raw);}catch{throw new PublicSaaSError('AUTH_REDIRECT_INVALID','Authentication redirect URL is invalid.');}
  const local=parsed.hostname==='localhost'||parsed.hostname==='127.0.0.1';
  if(parsed.protocol!=='https:'&&!local)throw new PublicSaaSError('AUTH_REDIRECT_INVALID','Authentication redirect URL must use HTTPS outside local development.');
  return parsed.toString();
}

function withRedirect(path,redirectTo){
  const redirect=normalizeRedirectUrl(redirectTo);
  return redirect?`${path}?redirect_to=${encodeURIComponent(redirect)}`:path;
}

export function readSupabasePublicConfig(env=process.env){
  const url=normalizeBaseUrl(env.SUPABASE_URL??env.NEXT_PUBLIC_SUPABASE_URL??null);
  const publishableKey=trim(env.SUPABASE_PUBLISHABLE_KEY??env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??env.SUPABASE_ANON_KEY??'')||null;
  return Object.freeze({provider:'SUPABASE',url,publishableKey,configured:Boolean(url&&publishableKey)});
}

function decodeJwtPayload(token){
  const parts=String(token??'').split('.');
  if(parts.length!==3)throw new PublicSaaSError('AUTH_TOKEN_INVALID','Access token is not a JWT.');
  try{
    const normalized=parts[1].replace(/-/g,'+').replace(/_/g,'/');
    const padded=normalized.padEnd(Math.ceil(normalized.length/4)*4,'=');
    return JSON.parse(Buffer.from(padded,'base64').toString('utf8'));
  }catch{throw new PublicSaaSError('AUTH_TOKEN_INVALID','Access token payload is invalid.');}
}

function safeProviderMessage(body,status){
  const candidate=body?.error_description??body?.msg??body?.message??body?.error;
  return typeof candidate==='string'&&candidate.length<=240?candidate:`Authentication provider request failed (${status}).`;
}

export class SupabaseAuthAdapter {
  constructor({url,publishableKey,fetchImpl=globalThis.fetch}={}){
    this.url=normalizeBaseUrl(url);
    this.publishableKey=trim(publishableKey)||null;
    this.fetch=fetchImpl;
  }

  get configured(){return Boolean(this.url&&this.publishableKey&&this.fetch);}

  #assertConfigured(){
    if(!this.configured)throw new PublicSaaSError('AUTH_PROVIDER_NOT_CONFIGURED','Supabase Auth is not configured.');
  }

  async #request(path,{method='GET',accessToken=null,body=null}={}){
    this.#assertConfigured();
    const response=await this.fetch(`${this.url}${path}`,{
      method,
      headers:{
        apikey:this.publishableKey,
        ...(accessToken?{Authorization:`Bearer ${accessToken}`}:{ }),
        ...(body?{'content-type':'application/json'}:{ }),
      },
      ...(body?{body:JSON.stringify(body)}:{ }),
    });
    const text=await response.text();
    let payload=null;
    if(text){try{payload=JSON.parse(text);}catch{payload={message:'Authentication provider returned a non-JSON response.'};}}
    if(!response.ok)throw new PublicSaaSError('AUTH_PROVIDER_REQUEST_FAILED',safeProviderMessage(payload,response.status),{status:response.status});
    return payload;
  }

  signUpWithPassword({email,password,metadata={},redirectTo=null}={}){
    if(!trim(email)||!password)throw new PublicSaaSError('AUTH_CREDENTIALS_REQUIRED','Email and password are required.');
    return this.#request(withRedirect('/auth/v1/signup',redirectTo),{
      method:'POST',
      body:{email:trim(email).toLowerCase(),password,data:metadata},
    });
  }

  signInWithPassword({email,password}={}){
    if(!trim(email)||!password)throw new PublicSaaSError('AUTH_CREDENTIALS_REQUIRED','Email and password are required.');
    return this.#request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:trim(email).toLowerCase(),password}});
  }

  refreshSession(refreshToken){
    if(!refreshToken)throw new PublicSaaSError('AUTH_REFRESH_TOKEN_REQUIRED','Refresh token is required.');
    return this.#request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:refreshToken}});
  }

  async verifyAccessToken(accessToken){
    if(!accessToken)throw new PublicSaaSError('AUTH_REQUIRED','Access token is required.');
    const user=await this.#request('/auth/v1/user',{accessToken});
    const claims=decodeJwtPayload(accessToken);
    if(!claims.exp||!user?.id)throw new PublicSaaSError('AUTH_TOKEN_INVALID','Verified token is missing required claims.');
    return createSessionPrincipal({
      user_id:user.id,
      session_id:claims.session_id??`supabase:${user.id}:${claims.iat??claims.exp}`,
      expires_at:new Date(Number(claims.exp)*1000).toISOString(),
      email_verified_at:user.email_confirmed_at??user.confirmed_at??null,
      auth_provider:'SUPABASE',
    });
  }

  signOut(accessToken){
    if(!accessToken)throw new PublicSaaSError('AUTH_REQUIRED','Access token is required.');
    return this.#request('/auth/v1/logout',{method:'POST',accessToken});
  }

  requestPasswordReset(email,{redirectTo=null}={}){
    if(!trim(email))throw new PublicSaaSError('AUTH_EMAIL_REQUIRED','Email is required.');
    return this.#request(withRedirect('/auth/v1/recover',redirectTo),{
      method:'POST',
      body:{email:trim(email).toLowerCase()},
    });
  }

  updatePassword(accessToken,password){
    if(!accessToken)throw new PublicSaaSError('AUTH_REQUIRED','Access token is required.');
    if(typeof password!=='string'||password.length<8)throw new PublicSaaSError('AUTH_PASSWORD_INVALID','Password must be at least 8 characters.');
    return this.#request('/auth/v1/user',{method:'PUT',accessToken,body:{password}});
  }
}

export function createSupabaseAuthAdapterFromEnv(env=process.env,options={}){
  const config=readSupabasePublicConfig(env);
  return new SupabaseAuthAdapter({...config,...options});
}
