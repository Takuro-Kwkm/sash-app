import test from 'node:test';
import assert from 'node:assert/strict';
import {assertHiddenNativeControl} from './browser/runtime-control-assertions.mjs';
const hidden={display:'inline-block',visibility:'visible',opacity:'0',pointerEvents:'none',ariaHidden:'true',tabIndex:-1};
test('transparent native synchronization control is not a user select',()=>assert.doesNotThrow(()=>assertHiddenNativeControl(hidden)));
test('layout-hidden native synchronization control is also accepted',()=>{
 assert.doesNotThrow(()=>assertHiddenNativeControl({...hidden,display:'none',opacity:'1',pointerEvents:'auto'}));
 assert.doesNotThrow(()=>assertHiddenNativeControl({...hidden,visibility:'hidden',opacity:'1',pointerEvents:'auto'}));
});
test('visually presented or pointer-active synchronization controls are rejected',()=>{
 assert.throws(()=>assertHiddenNativeControl({...hidden,opacity:'1'}));
 assert.throws(()=>assertHiddenNativeControl({...hidden,pointerEvents:'auto'}));
});
test('accessibility and tab exposure cannot be masked by opacity',()=>{
 assert.throws(()=>assertHiddenNativeControl({...hidden,ariaHidden:'false'}));
 assert.throws(()=>assertHiddenNativeControl({...hidden,tabIndex:0}));
});
