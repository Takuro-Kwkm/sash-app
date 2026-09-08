import{THERMOSL_MODULE as baseModule}from'./thermosl-sales-glass-r3.mjs';

const DETAIL_PRESENTATION={
  LOWE_STANDARD:{displayLabel:'クリア',displayOrder:1},
  LOWE_GREEN:{displayLabel:'グリーン',displayOrder:2},
  LOWE_CLEAR_HISOLAR:{displayLabel:'クリア（高日射取得）',displayOrder:3},
  LOWE_GREEN_HS:{displayLabel:'グリーン（高遮熱）',displayOrder:4},
  PAIR_STANDARD:{displayLabel:'標準',displayOrder:1}
};

const allowedValues=baseModule.allowedValues.map((row)=>{
  if(row.specificationKey!=='glass_detail')return row;
  const presentation=DETAIL_PRESENTATION[row.value];
  return presentation?{...row,...presentation}:row;
});

export const THERMOSL_MODULE={
  ...baseModule,
  allowedValues,
  stats:{...baseModule.stats,salesGlassPresentation:'R4_COMMON_FLOW'}
};
