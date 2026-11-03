import {createHash} from 'node:crypto';
import {formalComposedRuntimeEntries,readFormalComposedModule} from '../catalog/runtime-master/formal-composed-runtime-registry.mjs';

const dataImage=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const extension=mime=>mime==='jpeg'?'jpg':mime;
const cache=new Map();

function imagesFor(entry){
  if(cache.has(entry.sha256))return cache.get(entry.sha256);
  // A cold image request verifies the registered module independently of /resolve.
  const {document}=readFormalComposedModule(entry),images=new Map();
  const visit=value=>{
    if(!value||typeof value!=='object')return;
    const match=typeof value.src==='string'&&dataImage.exec(value.src);
    if(match){
      const bytes=Buffer.from(match[2],'base64');
      if(bytes.toString('base64')!==match[2])throw new Error('CHOICE_IMAGE_ENCODING_INVALID');
      const sha256=digest(bytes),ext=extension(match[1]);
      images.set(sha256+'.'+ext,{bytes,mime:'image/'+match[1],sha256});
    }
    for(const child of Object.values(value))if(child&&typeof child==='object')visit(child);
  };
  visit(document.presentation?.choice_visuals);
  visit(document.presentation?.choice_visual_variants);
  cache.set(entry.sha256,images);
  return images;
}

export function runtimeChoiceImage(productId,name){
  if(!/^[a-f0-9]{64}\.(png|jpg|webp)$/.test(name))return null;
  const entry=formalComposedRuntimeEntries.find(row=>row.id===productId);
  return entry?imagesFor(entry).get(name)??null:null;
}

export function projectRuntimeChoiceImages(result){
  const entry=formalComposedRuntimeEntries.find(row=>row.id===result.productId);
  if(!entry)return result;
  return {...result,fields:result.fields.map(field=>({...field,values:field.values.map(choice=>{
    const visual=choice.visual,match=visual&&dataImage.exec(visual.src);
    if(!match)return choice;
    const bytes=Buffer.from(match[2],'base64'),sha256=digest(bytes),name=sha256+'.'+extension(match[1]);
    if(!imagesFor(entry).has(name))throw new Error('CHOICE_IMAGE_NOT_REGISTERED');
    return {...choice,visual:{...visual,src:'/api/runtime-master/choice-image/'+name+'?productId='+encodeURIComponent(entry.id)}};
  })}))};
}
