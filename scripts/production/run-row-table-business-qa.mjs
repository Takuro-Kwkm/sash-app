import fs from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
const options=JSON.parse(fs.readFileSync(process.argv[2]));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const r=spawnSync(process.execPath,['test/browser/row-table-business-browser-qa.mjs'],{stdio:'inherit',env:{...process.env,QA_PLAYWRIGHT_MODULE:options.playwright_module,QA_BASE_URL:options.url,QA_OUTPUT_DIR:options.output,QA_RUNTIME_QA_CONTRACT:options.qa_contract,QA_EXPECTED_COMMIT:head}});
process.exitCode=r.status??2;
