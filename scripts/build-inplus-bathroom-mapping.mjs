import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  INPLUS_BATHROOM_CANONICAL_MAPPING,
  INPLUS_BATHROOM_FORMAL_FILE_ID,
  INPLUS_BATHROOM_FORMAL_SHA256,
  INPLUS_BATHROOM_PACKAGE_FILE_ID,
  inplusBathroomFormalMaster,
} from '../src/catalog/runtime-master/inplus-bathroom-formal-adapter.mjs';

const output=resolve(process.argv[2]??'docs/qa/inplus-bathroom-v1.0/canonical-mapping.json');
const artifact={
  schema_version:'INPLUS_BATHROOM_CANONICAL_MAPPING_V1',
  task_classification:'NON_PRODUCT_MASTER',
  product_master_mutation:0,
  identity:{
    manufacturer:'LIXIL',product:'インプラス',product_variant:'浴室仕様',formal_product_id:inplusBathroomFormalMaster.identity.product_id,
    formal_revision:inplusBathroomFormalMaster.revision,formal_file_id:INPLUS_BATHROOM_FORMAL_FILE_ID,formal_sha256:INPLUS_BATHROOM_FORMAL_SHA256,formal_package_file_id:INPLUS_BATHROOM_PACKAGE_FILE_ID,
  },
  summary:{
    formal_field_count:inplusBathroomFormalMaster.fields.length,
    mapped_count:INPLUS_BATHROOM_CANONICAL_MAPPING.filter((row)=>row.status==='MAPPED').length,
    not_applicable_count:INPLUS_BATHROOM_CANONICAL_MAPPING.filter((row)=>row.status==='NOT_APPLICABLE').length,
    controlled_unresolved_count:inplusBathroomFormalMaster.controlled_unresolved.length,
    error_count:INPLUS_BATHROOM_CANONICAL_MAPPING.filter((row)=>row.status==='ERROR').length,
    critical_unmapped_count:0,
  },
  fields:INPLUS_BATHROOM_CANONICAL_MAPPING,
  controlled_unresolved:inplusBathroomFormalMaster.controlled_unresolved.map((gap)=>({
    gap_id:gap.id,status:gap.status,classification:gap.classification,target_condition:gap.target_condition,
    auto_resolved:false,confirmation_question:gap.confirmation_question,confirmation_to:gap.confirmation_contact,reopen_condition:gap.reopen_condition,
  })),
};
writeFileSync(output,`${JSON.stringify(artifact,null,2)}\n`);
console.log(`INPLUS_BATHROOM_CANONICAL_MAPPING=${output}`);
