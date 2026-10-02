import {resolveRuntimeAppProduct} from '../../src/catalog/runtime-master/runtime-app-bridge.mjs';
export const RECHENT_ID='SER-LIXIL-RECHENT-D3-NF';
export async function completeRechent(seed={}){
 let result=await resolveRuntimeAppProduct(RECHENT_ID,{size_w:800,size_h:2100,...seed});
 for(let step=0;step<60;step+=1){
  const field=result.fields.find(row=>row.required&&!row.readOnly&&(result.selection[row.key]===undefined||result.selection[row.key]===''));
  if(!field)return result;
  if(!field.values.length)throw new Error('No Formal candidates for '+field.key+' '+JSON.stringify(seed));
  const selected=field.values.find(value=>!value.disabled);
  result=await resolveRuntimeAppProduct(RECHENT_ID,{...result.selection,[field.key]:field.dataType==='MULTI_ENUM'?[selected.value]:selected.value});
 }
 throw new Error('Completion did not converge');
}
export const RECHENT_BUSINESS_CASES=[
 {name:'high-single-manual',thermal_spec:'HIGH_INSULATION',opening_type:'SINGLE',design:'17H',size_w:800},
 {name:'high-parent-familock-battery',thermal_spec:'HIGH_INSULATION',opening_type:'PARENT_CHILD',design:'17H',size_w:1100,lock_type:'FAMILOCK',electric_lock_power:'BATTERY'},
 {name:'high-double-manual',thermal_spec:'HIGH_INSULATION',opening_type:'DOUBLE',design:'12N',size_w:1600},
 {name:'insulated-single-manual',thermal_spec:'INSULATION_K2',opening_type:'SINGLE',design:'G12',size_w:800},
 {name:'insulated-parent-familock-ac',thermal_spec:'INSULATION_K4',opening_type:'PARENT_CHILD',design:'G12',size_w:1100,lock_type:'FAMILOCK',electric_lock_power:'AC100V',electric_lock_plan:'BASIC'},
 {name:'insulated-double-manual-check-g12',thermal_spec:'INSULATION_K2',opening_type:'DOUBLE',design:'G12',transom:'NONE',size_w:1500,size_h:2440},
 {name:'insulated-double-manual-check-g15',thermal_spec:'INSULATION_K4',opening_type:'DOUBLE',design:'G15',transom:'NONE',size_w:1500,size_h:2600},
 {name:'insulated-single-sidelight-flat',thermal_spec:'INSULATION_K2',opening_type:'SINGLE_SIDELIGHT',design:'G12',size_w:1100,threshold_flat_material:'PRESENT'},
 {name:'insulated-double-sidelight',thermal_spec:'INSULATION_K4',opening_type:'DOUBLE_SIDELIGHT',design:'G12',size_w:1400,threshold_flat_material:'NONE'},
 {name:'aluminum-single-familock',thermal_spec:'ALUMINUM',opening_type:'SINGLE',design:'C12N',size_w:800,lock_type:'FAMILOCK',electric_lock_power:'BATTERY'},
 {name:'aluminum-parent',thermal_spec:'ALUMINUM',opening_type:'PARENT_CHILD',design:'C12N',size_w:1100},
 {name:'aluminum-double',thermal_spec:'ALUMINUM',opening_type:'DOUBLE',design:'C12N',size_w:1600},
 {name:'aluminum-single-sidelight',thermal_spec:'ALUMINUM',opening_type:'SINGLE_SIDELIGHT',design:'C12N',size_w:1100},
 {name:'aluminum-double-sidelight',thermal_spec:'ALUMINUM',opening_type:'DOUBLE_SIDELIGHT',design:'C12N',size_w:1500},
 {name:'k2-familock-keypad-battery',thermal_spec:'INSULATION_K2',opening_type:'SINGLE',design:'G12',size_w:800,handle_type:'A',lock_type:'FAMILOCK',electric_lock_power:'BATTERY',electric_lock_reader:'KEYPAD_OUTDOOR_READER'},
 {name:'k4-familock-keypad-ac',thermal_spec:'INSULATION_K4',opening_type:'PARENT_CHILD',design:'G12',size_w:1100,handle_type:'A',lock_type:'FAMILOCK',electric_lock_power:'AC100V',electric_lock_plan:'BASIC',electric_lock_reader:'KEYPAD_OUTDOOR_READER'},
 {name:'k2-s14-required-frame',thermal_spec:'INSULATION_K2',opening_type:'SINGLE',design:'S14',body_color:'BB',frame_color:'AA',size_w:800},
 {name:'k4-g78-required-frame',thermal_spec:'INSULATION_K4',opening_type:'SINGLE',design:'G78',body_color:'CB',frame_color:'AK',size_w:800},
 {name:'k2-m78-recommended-frame',thermal_spec:'INSULATION_K2',opening_type:'SINGLE',design:'M78',body_color:'BB',frame_color:'HC',size_w:800},
 ...['150','125','100','75','50_LONG','50_SHORT','25_LONG','25_SHORT'].map(exterior_trim=>({name:'k2-trim-'+exterior_trim,thermal_spec:'INSULATION_K2',opening_type:'SINGLE',design:'G12',body_color:'CB',size_w:800,exterior_trim})),
];
