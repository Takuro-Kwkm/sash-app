import {createServer} from 'node:http';
import {createCandidateRuntimePreview} from '../src/server/candidate-runtime-preview.mjs';
if((process.env.HOST??'127.0.0.1')!=='127.0.0.1')throw new Error('CANDIDATE_LOCALHOST_ONLY');
const server=createServer(createCandidateRuntimePreview());
server.listen(Number(process.env.PORT??4193),'127.0.0.1',()=>console.log('Candidate preview listening on localhost'));
