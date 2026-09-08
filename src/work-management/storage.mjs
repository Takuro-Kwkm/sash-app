import { WORK_SCHEMA_VERSION, WorkManagementError, cloneValue } from './domain.mjs';

export const WORK_STORAGE_KEY='sash.work-management.v1';

export function emptyWorkDatabase(){
  return {schema_version:WORK_SCHEMA_VERSION,revision:0,projects:[],estimates:[],openings:[]};
}

function validateDatabase(value){
  if(!value||value.schema_version!==WORK_SCHEMA_VERSION||
    !Array.isArray(value.projects)||!Array.isArray(value.estimates)||!Array.isArray(value.openings)){
    throw new WorkManagementError('STORAGE_SCHEMA_INVALID','保存データの形式が現在のアプリと一致しません。');
  }
  return value;
}

export class BrowserStorageDocumentStore {
  constructor(storage,{key=WORK_STORAGE_KEY}={}){
    if(!storage)throw new WorkManagementError('STORAGE_UNAVAILABLE','永続化Storageを利用できません。');
    this.storage=storage;this.key=key;
  }
  read(){
    const raw=this.storage.getItem(this.key);
    if(!raw)return emptyWorkDatabase();
    try{return validateDatabase(JSON.parse(raw));}
    catch(error){
      if(error?.code)throw error;
      throw new WorkManagementError('STORAGE_CORRUPT','保存済み案件データを読み込めません。',{cause:error});
    }
  }
  write(document){
    const next=validateDatabase(document);
    try{this.storage.setItem(this.key,JSON.stringify(next));}
    catch(error){throw new WorkManagementError('STORAGE_WRITE_FAILED','保存できませんでした。入力内容を保持したまま再試行してください。',{cause:error});}
    return cloneValue(next);
  }
  mutate(mutator){
    const current=this.read();
    const draft=cloneValue(current);
    const result=mutator(draft);
    draft.revision=current.revision+1;
    this.write(draft);
    return {document:cloneValue(draft),result:cloneValue(result)};
  }
}

export class MemoryStorage {
  constructor(){this.values=new Map();this.failWrites=false;}
  getItem(key){return this.values.has(key)?this.values.get(key):null;}
  setItem(key,value){if(this.failWrites)throw new Error('simulated quota failure');this.values.set(key,String(value));}
  removeItem(key){this.values.delete(key);}
}
