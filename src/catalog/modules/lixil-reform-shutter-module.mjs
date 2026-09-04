import{PRODUCT_ID as P,SOURCE_ID,SOURCE_FILE,MASTER_VERSION,OPERATION as O,SHUTTER as S,VENTILATION as VF,INSTALLATION as I,DIMENSION_FAMILY as DF,POWER as PW,BOX as BX,AVAILABILITY as AV,PRODUCT_NODES,INSTALLATION_CONFIGS,DIMENSION_RANGES,COLORS,COLOR_BY_TYPE,EVIDENCE_IDS as EV}from'./lixil-reform-shutter-master.mjs';

const E=[EV.PRODUCT,EV.DIMENSION,EV.INSTALL,EV.OPTION];
const D=(key,label,order,selector={},dataType='ENUM',extra={})=>({id:`${P}:d:${key}`,productId:P,key,displayLabel:label,displayOrder:order,status:'ACTIVE',selector,dataType,...extra});
let seq=0;const V=(key,value,label,order,selector={},metadata={})=>({id:`${P}:v:${key}:${++seq}`,productId:P,specificationKey:key,value,displayLabel:label,displayOrder:order,status:'ACTIVE',selector,metadata,evidenceIds:E});
const Q=(key,selector={})=>({id:`${P}:q:${key}:${++seq}`,productId:P,specificationKey:key,required:true,selector,evidenceIds:E});
const A=(id,priority,when,targetField,formula,extra={})=>({id,productId:P,mode:'AUTO',priority,when,targetField,effect:{type:'derive_value',key:targetField,formula,...extra},evidenceIds:[EV.DIMENSION]});
const M=(id,when,message)=>({id,productId:P,mode:'MANUAL_CHECK',when,message,evidenceIds:[EV.INSTALL]});
const R=(id,priority,when,set)=>({id,priority,when,set});
const X=(id,priority,when,errorCode,message,scope='resolved')=>({id,priority,when,errorCode,message,severity:'ERROR',scope});
const B=(key)=>[{value:'NO',label:'いいえ'},{value:'YES',label:'はい'}].map((x,i)=>V(key,x.value,x.label,i+1));
const threeSide={$in:[I.THREE_SIDE,I.THREE_SIDE_BOX_DOWN]};
const oneCorner={$in:[I.CORNER,I.BOX_DOWN_CORNER]};
const balcony={$in:[I.BALCONY,I.BALCONY_BOX_DOWN]};
const wood={$in:['WOOD_CONVENTIONAL','WOOD_2X4']};

const specificationDefinitions=[
 D('opening_usage','既設開口用途',10),D('existing_sash_present','既設サッシ',15,{opening_usage:'FLOOR_LEVEL_OPENING'}),D('existing_window_type','既設窓種',20),D('building_structure','建物構造',30),D('exterior_wall_type','外壁',40),
 D('installation_config','納まり',50),D('corner_side','入隅側',51,{installation_config:oneCorner}),
 D('existing_sash_outer_width_ws','既設サッシ WS',60,{},'NUMBER'),D('existing_sash_outer_height_hs','既設サッシ HS',61,{},'NUMBER'),
 D('rc_opening_width_mm','RC開口 W',62,{any:[{installation_config:I.RC},{all:[{building_structure:'RC'},{installation_config:threeSide}]}]},'NUMBER'),D('rc_opening_height_mm','RC開口 H',63,{any:[{installation_config:I.RC},{all:[{building_structure:'RC'},{installation_config:threeSide}]}]},'NUMBER'),D('rc_surface_finish','RC取付面',64,{all:[{building_structure:'RC'},{installation_config:{$in:[I.RC,I.THREE_SIDE,I.THREE_SIDE_BOX_DOWN]}}]}),
 D('existing_sash_projection_mm','サッシ出寸法（網戸含む）',70,{},'NUMBER'),D('substrate_member','下地部材',71,{existing_sash_projection_mm:{$exists:true}}),
 D('available_top_space_c','上部取付スペース C',80,{installation_config:{$exists:true}},'NUMBER'),D('available_bottom_space_d','下部取付スペース D',81,{not:{installation_config:threeSide}},'NUMBER'),
 D('available_side_space_left','左取付スペース E',82,{installation_config:{$exists:true}},'NUMBER'),D('available_side_space_right','右取付スペース E',83,{installation_config:{$exists:true}},'NUMBER'),
 D('exterior_wall_thickness_mm','外壁厚さ',90,{building_structure:wood},'NUMBER'),D('post_width_mm','柱幅',91,{building_structure:wood},'NUMBER'),D('screw_engagement_mm','躯体ねじかかり',92,{building_structure:wood},'NUMBER'),D('screw_torque_nm','ねじ込みトルク（N・m）',93,{building_structure:wood},'NUMBER'),
 D('leak_trace_present','漏水跡',100),D('mounting_surface_same_plane','取付面が同一面',101),D('obstacle_present','取付障害物',102),D('obstacle_removable','障害物の撤去・移設可',103,{obstacle_present:'YES'}),D('installation_scaffold_available','施工足場',104),D('maintenance_access_available','将来メンテナンス',105),
 D('balcony_frp_difference_mm','FRP立上り差',110,{installation_config:balcony},'NUMBER'),D('sash_bottom_to_exterior_finish_bottom_mm','サッシ下端～外壁下端仕上げ',111,{installation_config:balcony},'NUMBER'),D('hs_lower_edge_to_floor_mm','HS下端～床面',112,{installation_config:balcony},'NUMBER'),
 D('floor_to_exterior_finish_bottom_mm','土間面～外壁下端仕上げ',113,{installation_config:threeSide},'NUMBER'),
 D('soffit_mounting','軒天納まり',120),D('soffit_inspection_access','軒天点検口',121,{soffit_mounting:'YES'}),
 D('operation_type','操作方式',130),D('shutter_type','シャッタータイプ',140,{operation_type:{$exists:true}}),D('ventilation_function_type','採風・換気機能',150,{shutter_type:{$exists:true}},'ENUM',{autoSelectSingle:true}),
 D('exterior_color','商品色',160,{shutter_type:{$exists:true}}),D('power_supply_type','電源仕様',170,{operation_type:O.ELECTRIC}),D('wiring_route','配線経路',171,{power_supply_type:PW.AC100}),
 D('primary_remote_type','主リモコン',180,{shutter_type:S.VENTILATION}),D('smart_control_app','スマート操作',181,{operation_type:O.ELECTRIC}),D('box_type','ボックス',190,{shutter_type:{$exists:true}}),
 D('security_building_component','防犯建物部品対応',200,{shutter_type:S.WIND}),D('typhoon_stopper','台風ストッパー',201,{shutter_type:{$in:[S.STANDARD,S.WIND]}}),D('manual_external_key','手動外鍵付',202,{operation_type:O.MANUAL,shutter_type:S.STANDARD}),
 D('regulatory_confirmation_required','法令・協定確認',210),
 ...['shutter_width_cw','shutter_height_ch','cw_rc_candidate','ch_rc_candidate','cw_sash_candidate','ch_sash_candidate'].map((k,i)=>D(k,k,9000+i,{},'NUMBER',{presentationHidden:true}))
];

const allowedValues=[];
allowedValues.push(
 V('opening_usage','WINDOW','窓開口',1),V('opening_usage','FLOOR_LEVEL_OPENING','土間開口（既設サッシあり）',2),V('opening_usage','ENTRANCE','玄関',3),V('opening_usage','SERVICE_ENTRANCE','勝手口',4),V('opening_usage','SHOP_ENTRANCE','店舗入口',5),V('opening_usage','GARAGE_ENTRANCE','ガレージ入口',6),V('opening_usage','EMERGENCY_ACCESS','非常進入口',7),
 V('existing_sash_present','YES','あり',1),V('existing_sash_present','NO','なし',2),
 V('existing_window_type','SLIDING_WINDOW','引違い窓',1),V('existing_window_type','OPENING_WINDOW','開き系窓',2,{}, {manualCheck:true}),V('existing_window_type','SPECIAL_WINDOW','特殊窓',3,{}, {manualCheck:true}),
 V('building_structure','WOOD_CONVENTIONAL','木造（在来）',1),V('building_structure','WOOD_2X4','木造（2×4）',2),V('building_structure','RC','RC造',3),V('building_structure','OTHER','その他',4),
 V('exterior_wall_type','FIBER_CEMENT_SIDING','窯業サイディング',1),V('exterior_wall_type','METAL_SIDING','金属サイディング',2),V('exterior_wall_type','MORTAR','モルタル',3),V('exterior_wall_type','RC','RC外壁',4),V('exterior_wall_type','OTHER','その他',5)
);
INSTALLATION_CONFIGS.forEach((x,i)=>allowedValues.push(V('installation_config',x.id,{STANDARD:'標準納まり',BOX_DOWN:'ボックス下げ納まり',ONE_SIDE_CORNER:'片入隅納まり',BOX_DOWN_ONE_SIDE_CORNER:'ボックス下げ片入隅納まり',RC:'RC納まり',THREE_SIDE_STANDARD:'三方枠標準納まり',THREE_SIDE_BOX_DOWN:'三方枠ボックス下げ納まり',BALCONY_STANDARD:'バルコニー標準納まり',BALCONY_BOX_DOWN:'バルコニーボックス下げ納まり'}[x.id],i+1)));
allowedValues.push(V('rc_surface_finish','EXPOSED_CONCRETE','RC打放し面',1),V('rc_surface_finish','TILE_BRICK','レンガ・タイル等仕上げ',2),V('rc_surface_finish','OTHER','その他仕上げ',3));
allowedValues.push(V('corner_side','LEFT','外観左が入隅',1),V('corner_side','RIGHT','外観右が入隅',2));
allowedValues.push(V('substrate_member','NONE','なし',1,{existing_sash_projection_mm:{$lte:32}}),V('substrate_member','SMALL','下地部材（小）',2,{existing_sash_projection_mm:{$lte:64}}),V('substrate_member','LARGE','下地部材（大）',3,{existing_sash_projection_mm:{$lte:99}}));
for(const key of['leak_trace_present','mounting_surface_same_plane','obstacle_present','obstacle_removable','installation_scaffold_available','maintenance_access_available','soffit_mounting','soffit_inspection_access','typhoon_stopper','manual_external_key','regulatory_confirmation_required'])allowedValues.push(...B(key));
allowedValues.push(V('security_building_component','NO','いいえ',1,{shutter_type:S.WIND}),V('security_building_component','YES','はい',2,{all:[{shutter_type:S.WIND},{ventilation_function_type:VF.NONE},{not:{installation_config:oneCorner}}]}));
allowedValues.push(V('operation_type',O.ELECTRIC,'電動',1),V('operation_type',O.MANUAL,'手動',2));
allowedValues.push(V('shutter_type',S.STANDARD,'標準タイプ',1),V('shutter_type',S.VENTILATION,'採風タイプ',2,{all:[{operation_type:O.ELECTRIC},{not:{installation_config:threeSide}}]}),V('shutter_type',S.WIND,'耐風タイプ',3));
allowedValues.push(V('ventilation_function_type',VF.NONE,'なし',1,{shutter_type:{$in:[S.STANDARD,S.WIND]}}),V('ventilation_function_type',VF.FLAP,'採風（フラップスラット）',2,{shutter_type:S.VENTILATION}),V('ventilation_function_type',VF.FIXED,'換気スラット',3,{shutter_type:S.WIND}));
for(const[type,codes]of Object.entries(COLOR_BY_TYPE))for(const[c,i]of codes.map((c,i)=>[c,i]))allowedValues.push(V('exterior_color',c,`${c} ${COLORS[c]}`,i+1,{shutter_type:type}));
allowedValues.push(V('power_supply_type',PW.AC100,'AC100V電源仕様',1),V('power_supply_type',PW.ADAPTER,'ACアダプタ仕様',2,{shutter_type:{$in:[S.STANDARD,S.WIND]}}),V('wiring_route','INDOOR','屋内配線',1),V('wiring_route','OUTDOOR','屋外配線',2));
allowedValues.push(V('primary_remote_type','SINGLE_FUNCTION','単機能リモコン',1),V('primary_remote_type','HIGH_FUNCTION','高機能リモコン',2),V('smart_control_app','NONE','使用しない',1),V('smart_control_app','MY_WINDOW','My Window',2),V('smart_control_app','LIFE_ASSIST2','Life Assist2',3));
allowedValues.push(V('box_type',BX.S,'S型',1,{soffit_mounting:{$notIn:['YES']}}),V('box_type',BX.D,'D型',2));

const requiredFieldRules=[
 ...['opening_usage','existing_window_type','building_structure','exterior_wall_type','installation_config','existing_sash_outer_width_ws','existing_sash_outer_height_hs','existing_sash_projection_mm','available_top_space_c','available_side_space_left','available_side_space_right','leak_trace_present','mounting_surface_same_plane','obstacle_present','installation_scaffold_available','maintenance_access_available','soffit_mounting','operation_type','shutter_type','ventilation_function_type','exterior_color','box_type','regulatory_confirmation_required'].map(k=>Q(k)),
 Q('available_bottom_space_d',{not:{installation_config:threeSide}}),Q('existing_sash_present',{opening_usage:'FLOOR_LEVEL_OPENING'}),Q('corner_side',{installation_config:oneCorner}),Q('rc_opening_width_mm',{any:[{installation_config:I.RC},{all:[{building_structure:'RC'},{installation_config:threeSide}]}]}),Q('rc_opening_height_mm',{any:[{installation_config:I.RC},{all:[{building_structure:'RC'},{installation_config:threeSide}]}]}),Q('rc_surface_finish',{all:[{building_structure:'RC'},{installation_config:{$in:[I.RC,I.THREE_SIDE,I.THREE_SIDE_BOX_DOWN]}}]}),
 Q('substrate_member',{existing_sash_projection_mm:{$exists:true}}),Q('exterior_wall_thickness_mm',{building_structure:wood}),Q('post_width_mm',{building_structure:wood}),Q('screw_engagement_mm',{building_structure:wood}),Q('screw_torque_nm',{building_structure:wood}),
 Q('obstacle_removable',{obstacle_present:'YES'}),Q('balcony_frp_difference_mm',{installation_config:balcony}),Q('sash_bottom_to_exterior_finish_bottom_mm',{installation_config:balcony}),Q('hs_lower_edge_to_floor_mm',{installation_config:balcony}),Q('floor_to_exterior_finish_bottom_mm',{installation_config:threeSide}),Q('soffit_inspection_access',{soffit_mounting:'YES'}),Q('power_supply_type',{operation_type:O.ELECTRIC}),Q('wiring_route',{power_supply_type:PW.AC100}),Q('primary_remote_type',{shutter_type:S.VENTILATION}),Q('smart_control_app',{operation_type:O.ELECTRIC}),Q('security_building_component',{shutter_type:S.WIND}),Q('typhoon_stopper',{shutter_type:{$in:[S.STANDARD,S.WIND]}}),Q('manual_external_key',{operation_type:O.MANUAL,shutter_type:S.STANDARD})
];

const dependencies=[];
const addLinear=(id,p,when,target,field,offset)=>dependencies.push(A(id,p,when,target,{op:'linear',field,offset}));
addLinear('RSH-CW-STD',10,{installation_config:{$in:[I.STANDARD,I.BOX_DOWN,I.BALCONY,I.BALCONY_BOX_DOWN]}},'shutter_width_cw','existing_sash_outer_width_ws',-4);
addLinear('RSH-CW-CORNER',11,{installation_config:oneCorner},'shutter_width_cw','existing_sash_outer_width_ws',-60);
addLinear('RSH-CH-STD',12,{installation_config:{$in:[I.STANDARD,I.CORNER,I.BALCONY]}},'shutter_height_ch','existing_sash_outer_height_hs',-50);
addLinear('RSH-CH-BOX',13,{installation_config:{$in:[I.BOX_DOWN,I.BOX_DOWN_CORNER,I.BALCONY_BOX_DOWN]}},'shutter_height_ch','existing_sash_outer_height_hs',-218);
addLinear('RSH-CW-3S',14,{all:[{installation_config:threeSide},{building_structure:{$ne:'RC'}}]},'shutter_width_cw','existing_sash_outer_width_ws',-4);
addLinear('RSH-CH-3S',15,{installation_config:I.THREE_SIDE,building_structure:{$ne:'RC'}},'shutter_height_ch','existing_sash_outer_height_hs',5);
addLinear('RSH-CH-3SB',16,{installation_config:I.THREE_SIDE_BOX_DOWN,building_structure:{$ne:'RC'}},'shutter_height_ch','existing_sash_outer_height_hs',-164);
addLinear('RSH-RC-W1',20,{installation_config:I.RC},'cw_rc_candidate','rc_opening_width_mm',22);addLinear('RSH-RC-H1',21,{installation_config:I.RC},'ch_rc_candidate','rc_opening_height_mm',-15);addLinear('RSH-RC-W2',22,{installation_config:I.RC},'cw_sash_candidate','existing_sash_outer_width_ws',0);addLinear('RSH-RC-H2',23,{installation_config:I.RC},'ch_sash_candidate','existing_sash_outer_height_hs',-50);
dependencies.push(A('RSH-RC-CW',24,{installation_config:I.RC,cw_rc_candidate:{$exists:true},cw_sash_candidate:{$exists:true}},'shutter_width_cw',{op:'max',fields:['cw_rc_candidate','cw_sash_candidate']}),A('RSH-RC-CH',25,{installation_config:I.RC,ch_rc_candidate:{$exists:true},ch_sash_candidate:{$exists:true}},'shutter_height_ch',{op:'max',fields:['ch_rc_candidate','ch_sash_candidate']}));
addLinear('RSH-3RC-W1',26,{installation_config:I.THREE_SIDE,building_structure:'RC'},'cw_rc_candidate','rc_opening_width_mm',22);addLinear('RSH-3RC-H1',27,{installation_config:I.THREE_SIDE,building_structure:'RC'},'ch_rc_candidate','rc_opening_height_mm',23);addLinear('RSH-3RC-W2',28,{installation_config:I.THREE_SIDE,building_structure:'RC'},'cw_sash_candidate','existing_sash_outer_width_ws',0);addLinear('RSH-3RC-H2',29,{installation_config:I.THREE_SIDE,building_structure:'RC'},'ch_sash_candidate','existing_sash_outer_height_hs',5);
dependencies.push(A('RSH-3RC-CW',30,{installation_config:I.THREE_SIDE,building_structure:'RC',cw_rc_candidate:{$exists:true},cw_sash_candidate:{$exists:true}},'shutter_width_cw',{op:'max',fields:['cw_rc_candidate','cw_sash_candidate']}),A('RSH-3RC-CH',31,{installation_config:I.THREE_SIDE,building_structure:'RC',ch_rc_candidate:{$exists:true},ch_sash_candidate:{$exists:true}},'shutter_height_ch',{op:'max',fields:['ch_rc_candidate','ch_sash_candidate']}));
dependencies.push(M('RSH-MAN-3RC-BD',{building_structure:'RC',installation_config:I.THREE_SIDE_BOX_DOWN},'三方枠RCのボックス下げ納まりは発注寸法をLIXILへ確認してください。'),M('RSH-MAN-SPECIAL',{existing_window_type:'SPECIAL_WINDOW'},'特殊窓は取付可否・発注寸法をLIXILへ確認してください。'),M('RSH-MAN-OPENING',{existing_window_type:'OPENING_WINDOW'},'開き系窓は取付可否・発注寸法をLIXILへ確認してください。'),M('RSH-MAN-WALL45',{exterior_wall_thickness_mm:45},'外壁厚45mmは公式資料に「未満／以下」の記載差があるためLIXILへ確認してください。'),M('RSH-MAN-REG',{regulatory_confirmation_required:'YES'},'隣地境界等の法令・協定について行政機関等へ確認してください。'),M('RSH-MAN-REPAIR',{leak_trace_present:'YES'},'漏水跡があるため補修・防水確認が必要です。'),M('RSH-MAN-OBST',{obstacle_present:'YES',obstacle_removable:'YES'},'障害物の撤去・移設工事が必要です。'),M('RSH-MAN-SCAFFOLD',{installation_scaffold_available:'NO'},'施工足場の確保が必要です。'));

const resolutionRules=[R('RSH-BASE',1,{}, {product_availability:AV.AVAILABLE,configuration_availability:AV.AVAILABLE,installation_availability:AV.AVAILABLE,final_availability:AV.AVAILABLE,unit_configuration:'SINGLE',order_strategy:'BOM'}),R('RSH-DIM-G',5,{installation_config:{$in:[I.STANDARD,I.BOX_DOWN,I.CORNER,I.BOX_DOWN_CORNER,I.RC,I.BALCONY,I.BALCONY_BOX_DOWN]}},{dimension_family:DF.GENERAL}),R('RSH-DIM-3',5,{installation_config:threeSide},{dimension_family:DF.THREE_SIDE})];
for(const n of PRODUCT_NODES)resolutionRules.push(R(`RSH-NODE-${n.id}`,10,{operation_type:n.operationType,shutter_type:n.shutterType},{product_node_id:n.id}));
resolutionRules.push(R('RSH-VENT-NA',20,{shutter_type:S.STANDARD},{ventilation_function_type:VF.NONE}),R('RSH-VENT-FLAP',20,{shutter_type:S.VENTILATION},{ventilation_function_type:VF.FLAP}),R('RSH-PWR-MAN',20,{operation_type:O.MANUAL},{power_supply_type:'NOT_APPLICABLE',primary_remote_type:'NOT_APPLICABLE',smart_control_app:'NOT_APPLICABLE'}));
for(const family of Object.keys(DIMENSION_RANGES))for(const[key,[w0,w1,h0,h1]]of Object.entries(DIMENSION_RANGES[family])){const[op,sh]=key.split(':');resolutionRules.push(R(`RSH-PRANGE-${family}-${op}-${sh}`,30,{dimension_family:family,operation_type:op,shutter_type:sh},{cw_min:w0,cw_max:w1,ch_min:h0,ch_max:h1}));}
resolutionRules.push(R('RSH-COND-SPECIAL',100,{existing_window_type:{$in:['SPECIAL_WINDOW','OPENING_WINDOW']}},{installation_availability:AV.CONDITIONAL,final_availability:AV.CONDITIONAL}),R('RSH-COND-W45',101,{exterior_wall_thickness_mm:45},{installation_availability:AV.CONDITIONAL,final_availability:AV.CONDITIONAL}),R('RSH-COND-REPAIR',102,{leak_trace_present:'YES'},{installation_availability:AV.CONDITIONAL,final_availability:AV.CONDITIONAL}),R('RSH-COND-OBST',103,{obstacle_present:'YES',obstacle_removable:'YES'},{installation_availability:AV.CONDITIONAL,final_availability:AV.CONDITIONAL}),R('RSH-COND-SCAF',104,{installation_scaffold_available:'NO'},{installation_availability:AV.CONDITIONAL,final_availability:AV.CONDITIONAL}),R('RSH-COND-REG',105,{regulatory_confirmation_required:'YES'},{installation_availability:AV.CONDITIONAL,final_availability:AV.CONDITIONAL}));

const validationRules=[
 X('RSH-V-OPEN',10,{opening_usage:{$notIn:['WINDOW','FLOOR_LEVEL_OPENING']}},'OPENING_USAGE_INVALID','リフォームシャッターは窓開口用です。','raw'),X('RSH-V-STRUCT',11,{building_structure:'OTHER'},'STRUCTURE_INVALID','対象躯体は木造またはRC造です。','raw'),X('RSH-V-WALL',12,{exterior_wall_type:'OTHER'},'WALL_INVALID','対象外壁は窯業・金属サイディング、モルタル、RCです。','raw'),
 X('RSH-V-FLOOR-CONFIG',13,{opening_usage:'FLOOR_LEVEL_OPENING',installation_config:{$notIn:[I.THREE_SIDE,I.THREE_SIDE_BOX_DOWN]}},'OPENING_USAGE_INVALID','土間開口は三方枠納まりのみ対象です。','raw'),X('RSH-V-FLOOR-SASH',14,{opening_usage:'FLOOR_LEVEL_OPENING',existing_sash_present:'NO'},'OPENING_USAGE_INVALID','土間納まりは既設サッシがある場合のみ対象です。','raw'),X('RSH-V-RC-CFG',15,{installation_config:I.RC,building_structure:{$ne:'RC'}},'RC_CONFIGURATION_INVALID','RC納まりはRC造専用です。'),X('RSH-V-RC-GENERAL',16,{building_structure:'RC',installation_config:{$in:[I.STANDARD,I.BOX_DOWN,I.CORNER,I.BOX_DOWN_CORNER,I.BALCONY,I.BALCONY_BOX_DOWN]}},'RC_CONFIGURATION_INVALID','RC造はRC納まりまたは三方枠RCとして確認してください。'),X('RSH-V-RC-SURFACE',17,{rc_surface_finish:{$notIn:['EXPOSED_CONCRETE']}},'RC_SURFACE_INVALID','RC納まりはレンガ・タイル等の仕上げ面ではなく打放し面への取付けが必要です。'),
 X('RSH-V-PROJ100',20,{existing_sash_projection_mm:{$gt:99}},'SASH_PROJECTION_INVALID','サッシ出寸法が対応範囲外です。'),X('RSH-V-PROJ-CORNER',21,{installation_config:{$in:[I.CORNER,I.BOX_DOWN_CORNER,I.BOX_DOWN]},existing_sash_projection_mm:{$gt:32}},'SASH_PROJECTION_INVALID','片入隅・ボックス下げ系はサッシ出寸法32mm以下が必要です。'),
 X('RSH-V-METAL-SUB',22,{exterior_wall_type:'METAL_SIDING',substrate_member:'NONE'},'SUBSTRATE_REQUIRED','金属サイディングは下地部材が必要です。'),X('RSH-V-OUT-SUB',23,{wiring_route:'OUTDOOR',substrate_member:'NONE'},'SUBSTRATE_REQUIRED','電動の屋外配線は下地部材が必要です。'),
 X('RSH-V-WALLGT',30,{exterior_wall_thickness_mm:{$gt:45}},'WALL_THICKNESS_INVALID','外壁厚さが取付範囲外です。'),X('RSH-V-POST',31,{post_width_mm:{$lt:90}},'POST_WIDTH_INVALID','柱幅90mm以上が必要です。'),X('RSH-V-SCREW',32,{screw_engagement_mm:{$lt:30}},'SCREW_ENGAGEMENT_INVALID','躯体ねじかかり30mm以上が必要です。'),X('RSH-V-TORQUE',33,{screw_torque_nm:{$lt:1}},'SCREW_TORQUE_INVALID','ねじ込みトルク1.0N・m以上が必要です。'),
 X('RSH-V-SURFACE',40,{mounting_surface_same_plane:'NO'},'MOUNTING_SURFACE_INVALID','取付面は同一面である必要があります。'),X('RSH-V-OBST',41,{obstacle_present:'YES',obstacle_removable:'NO'},'OBSTACLE_INVALID','撤去・移設できない障害物が取付範囲にあります。'),X('RSH-V-MAINT',42,{maintenance_access_available:'NO'},'MAINTENANCE_ACCESS_INVALID','将来メンテナンスできない場所には取付できません。'),
 X('RSH-V-FRP',50,{balcony_frp_difference_mm:{$gt:150}},'BALCONY_FRP_INVALID','FRP防水層立上り差は150mm以下が必要です。'),X('RSH-V-BALFIN',51,{sash_bottom_to_exterior_finish_bottom_mm:{$gt:160}},'BALCONY_FINISH_INVALID','サッシ下端～外壁下端仕上げは160mm以下が必要です。'),X('RSH-V-BALFLOOR',52,{hs_lower_edge_to_floor_mm:{$lt:100}},'BALCONY_FLOOR_SPACE_INVALID','HS下端～床面は100mm以上必要です。'),X('RSH-V-3S',53,{floor_to_exterior_finish_bottom_mm:{$gt:500}},'THREE_SIDE_HEIGHT_INVALID','三方枠は土間面～外壁下端仕上げ500mm以下が必要です。'),
 X('RSH-V-SOFFIT-S',60,{soffit_mounting:'YES',box_type:BX.S},'SOFFIT_BOX_INVALID','軒天納まりはD型ボックスが必要です。'),X('RSH-V-SOFFIT-I',61,{soffit_mounting:'YES',soffit_inspection_access:'NO'},'SOFFIT_INSPECTION_INVALID','軒天納まりは点検口が必要です。'),X('RSH-V-ADAPTER-OUT',62,{power_supply_type:PW.ADAPTER,wiring_route:'OUTDOOR'},'POWER_INSTALLATION_INVALID','ACアダプタ仕様は室内コンセント配線専用です。'),
 X('RSH-V-SEC-VENT',70,{security_building_component:'YES',ventilation_function_type:VF.FIXED},'SECURITY_OPTION_INVALID','換気機能付は防犯建物部品対応にできません。'),X('RSH-V-SEC-CORNER',71,{security_building_component:'YES',installation_config:oneCorner},'SECURITY_OPTION_INVALID','片入隅納まりは防犯建物部品対応にできません。')
];
for(const cfg of INSTALLATION_CONFIGS){validationRules.push(X(`RSH-V-C-${cfg.id}`,80,{installation_config:cfg.id,available_top_space_c:{$lt:cfg.top}},'INSTALL_SPACE_INVALID',`上部スペースCは${cfg.top}mm以上必要です。`));if(cfg.bottom!==null)validationRules.push(X(`RSH-V-D-${cfg.id}`,81,{installation_config:cfg.id,available_bottom_space_d:{$lt:cfg.bottom}},'INSTALL_SPACE_INVALID',`下部スペースDは${cfg.bottom}mm以上必要です。`));if(!cfg.cornerSensitive){validationRules.push(X(`RSH-V-EL-${cfg.id}`,82,{installation_config:cfg.id,available_side_space_left:{$lt:cfg.left}},'INSTALL_SPACE_INVALID',`左側スペースEは${cfg.left}mm以上必要です。`),X(`RSH-V-ER-${cfg.id}`,82,{installation_config:cfg.id,available_side_space_right:{$lt:cfg.right}},'INSTALL_SPACE_INVALID',`右側スペースEは${cfg.right}mm以上必要です。`));}}
validationRules.push(X('RSH-V-CORNER-L',83,{installation_config:oneCorner,corner_side:'LEFT',available_side_space_right:{$lt:60}},'INSTALL_SPACE_INVALID','非入隅側に60mm以上必要です。'),X('RSH-V-CORNER-R',83,{installation_config:oneCorner,corner_side:'RIGHT',available_side_space_left:{$lt:60}},'INSTALL_SPACE_INVALID','非入隅側に60mm以上必要です。'));
for(const family of Object.keys(DIMENSION_RANGES))for(const[key,[w0,w1,h0,h1]]of Object.entries(DIMENSION_RANGES[family])){const[op,sh]=key.split(':');const c={dimension_family:family,operation_type:op,shutter_type:sh};validationRules.push(X(`RSH-V-WMIN-${family}-${op}-${sh}`,90,{...c,shutter_width_cw:{$lt:w0}},'SIZE_OUT_OF_RANGE',`CWは${w0}mm以上必要です。`),X(`RSH-V-WMAX-${family}-${op}-${sh}`,90,{...c,shutter_width_cw:{$gt:w1}},'SIZE_OUT_OF_RANGE',`CWは${w1}mm以下です。`),X(`RSH-V-HMIN-${family}-${op}-${sh}`,90,{...c,shutter_height_ch:{$lt:h0}},'SIZE_OUT_OF_RANGE',`CHは${h0}mm以上必要です。`),X(`RSH-V-HMAX-${family}-${op}-${sh}`,90,{...c,shutter_height_ch:{$gt:h1}},'SIZE_OUT_OF_RANGE',`CHは${h1}mm以下です。`));}
for(const rule of validationRules){
 const isProduct=rule.errorCode==='SIZE_OUT_OF_RANGE';
 const isConfig=['SECURITY_OPTION_INVALID','POWER_INSTALLATION_INVALID'].includes(rule.errorCode);
 const set=isProduct?{product_availability:AV.NOT_AVAILABLE,final_availability:AV.NOT_AVAILABLE}:isConfig?{configuration_availability:AV.NOT_AVAILABLE,final_availability:AV.NOT_AVAILABLE}:{installation_availability:AV.NOT_AVAILABLE,final_availability:AV.NOT_AVAILABLE};
 resolutionRules.push(R(`RSH-AV-${rule.id}`,500,rule.when,set));
}

const orderRules=[
 {id:'RSH-O-FRAME',componentType:'reform_shutter_frame',when:{shutter_type:{$exists:true}},quantity:1,orderAttributes:{itemCategory:'REQUIRED_PART',officialPartName:'リフォームシャッター枠'}},
 {id:'RSH-O-BODY',componentType:'shutter_body',when:{shutter_type:{$exists:true}},quantity:1,orderAttributes:{itemCategory:'REQUIRED_PART',officialPartName:'シャッター本体'}},
 {id:'RSH-O-BOX',componentType:'shutter_box',when:{box_type:{$exists:true}},quantity:1,orderAttributes:{itemCategory:'REQUIRED_PART',officialPartName:'シャッターボックス'}},
 {id:'RSH-O-SUB',componentType:'substrate_member',when:{substrate_member:{$in:['SMALL','LARGE']}},quantity:1,orderAttributes:{itemCategory:'CONDITIONALLY_REQUIRED',officialPartName:'下地部材'}},
 {id:'RSH-O-RC',componentType:'rc_screw_set',when:{installation_config:I.RC},quantity:1,orderAttributes:{itemCategory:'CONDITIONALLY_REQUIRED',officialPartName:'RC造用ねじセット'}},
 {id:'RSH-O-REMOTE',componentType:'remote_control',when:{operation_type:O.ELECTRIC},quantity:1,orderAttributes:{itemCategory:'REQUIRED_PART',officialPartName:'リモコン'}},
 {id:'RSH-O-TYPHOON',componentType:'typhoon_stopper',when:{typhoon_stopper:'YES'},quantity:1,orderAttributes:{itemCategory:'USER_SELECTED_OPTION',officialPartName:'台風ストッパー'}},
 {id:'RSH-O-KEY',componentType:'manual_external_key',when:{manual_external_key:'YES'},quantity:1,orderAttributes:{itemCategory:'USER_SELECTED_OPTION',officialPartName:'手動外鍵付（特注）'}},
 {id:'RSH-O-HOME',componentType:'home_device',when:{smart_control_app:'LIFE_ASSIST2'},quantity:1,orderAttributes:{itemCategory:'USER_SELECTED_OPTION',officialPartName:'ホームデバイス',productCode:'Z-A001-XAAA'}}
];

const ruleSets=[
 {id:`${P}:rs:r`,productId:P,type:'RESOLUTION_RULES',status:'ACTIVE',payload:resolutionRules,evidenceIds:E},
 {id:`${P}:rs:v`,productId:P,type:'VALIDATION_RULES',status:'ACTIVE',payload:validationRules,evidenceIds:[EV.DIMENSION,EV.INSTALL,EV.OPTION]},
 {id:`${P}:rs:o`,productId:P,type:'ORDER_COMPONENT_RULES',status:'ACTIVE',payload:orderRules,evidenceIds:E},
 {id:`${P}:rs:runtime`,productId:P,type:'RUNTIME_SPEC',status:'ACTIVE',payload:{masterVersion:MASTER_VERSION,runtimeReady:true,formalStatus:'FORMAL_PASS',productNodes:PRODUCT_NODES,installationConfigs:INSTALLATION_CONFIGS,safeRoutedPending:['EXTERIOR_WALL_45MM','SPECIAL_WINDOW','WIND_PRESSURE_BOUNDARY']},evidenceIds:E}
];

const evidence=[
 {id:EV.PRODUCT,productId:P,sourceType:'OFFICIAL_PRODUCT_CATALOG',sourceId:SOURCE_ID,sourceFile:SOURCE_FILE,title:'LIXIL リフォームシャッター・雨戸 2026年5月価格掲載版',catalogCode:'TE2400',pageRange:'12-33',status:'VERIFIED_OFFICIAL'},
 {id:EV.DIMENSION,productId:P,sourceType:'OFFICIAL_PRODUCT_CATALOG',sourceId:SOURCE_ID,sourceFile:SOURCE_FILE,title:'寸法特注範囲・採寸換算',catalogCode:'TE2400',pageRange:'35-36,48-52',status:'VERIFIED_OFFICIAL'},
 {id:EV.INSTALL,productId:P,sourceType:'OFFICIAL_PRODUCT_CATALOG',sourceId:SOURCE_ID,sourceFile:SOURCE_FILE,title:'発注前事前チェック・現場調査',catalogCode:'TE2400',pageRange:'41-53',status:'VERIFIED_OFFICIAL'},
 {id:EV.OPTION,productId:P,sourceType:'OFFICIAL_PRODUCT_CATALOG',sourceId:SOURCE_ID,sourceFile:SOURCE_FILE,title:'リフォームシャッター専用オプション',catalogCode:'TE2400',pageRange:'108',status:'VERIFIED_OFFICIAL'}
];

export const LIXIL_REFORM_SHUTTER_MODULE={
 product:{id:P,manufacturer:'LIXIL',displayName:'リフォームシャッター',category:'シャッター',status:'ACTIVE',recoveryStatus:'MASTER_COMPLETE',runtimeReady:true,masterVersion:MASTER_VERSION,formalStatus:'FORMAL_PASS',effectiveFrom:'2026-05',source:{id:SOURCE_ID,title:SOURCE_FILE,version:'2026-05',catalogCode:'TE2400'}},
 specificationDefinitions,allowedValues,standardSizeRecords:[],requiredFieldRules,ruleSets,dependencies,evidence
};
