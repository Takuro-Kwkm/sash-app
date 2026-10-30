import assert from 'node:assert/strict';

// Playwright considers opacity:0 elements visible. The synchronized native
// select must be absent from visual presentation, pointer input and tab order.
export function assertHiddenNativeControl(control){
  const layoutHidden=control.display==='none'||['hidden','collapse'].includes(control.visibility);
  const transparentAndInert=Number(control.opacity)===0&&control.pointerEvents==='none';
  assert.ok(layoutHidden||transparentAndInert,'Native sync control is visually presented or interactive');
  assert.equal(control.ariaHidden,'true','Native sync control must be hidden from accessibility');
  assert.equal(control.tabIndex,-1,'Native sync control must be excluded from tab navigation');
}
