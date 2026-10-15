import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const root=process.argv[2],index=JSON.parse(readFileSync(root+'/index.json'));
for(const row of index.products){
 const component=row.id.split(':')[1];
 const r=spawnSync(process.execPath,['scripts/production/export-table-authoring-candidate.mjs',root,component],{stdio:'inherit'});
 if(r.status!==0)process.exit(r.status??1);
}
