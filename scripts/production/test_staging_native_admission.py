"""Native process/CI binding checks only; no network or live application QA."""
import json
import os
import runpy
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from staging_test_transport import flags as transport_flags, original_bytes, envelope as test_envelope

ROOT=Path(__file__).resolve().parents[2]
SHARED=Path(os.environ.get('STAGING_SHARED_CHECKOUT',ROOT.parent/'central'))
MODULE=runpy.run_path(str(ROOT/'scripts/production/validate-staging-native-admission.py'))
EVIDENCE=runpy.run_path(str(ROOT/'scripts/production/staging-ci-evidence.py'))


class NativeBoundaryTests(unittest.TestCase):
    def test_ci_without_exact_permission_refused(self):
        policy=json.loads((ROOT/'contracts/production/staging-native-ci-policy.v1.json').read_text())
        self.assertFalse(MODULE['ci_guard'](policy,ROOT,SHARED))

    def test_ci_wrong_head_attempt_and_event_refused(self):
        head=subprocess.check_output(['git','-C',str(ROOT),'rev-parse','HEAD'],text=True).strip()
        shared=subprocess.check_output(['git','-C',str(SHARED),'rev-parse','HEAD'],text=True).strip()
        p={'enabled':True,'max_runs':1,'approved_head':head,'approved_shared_head':shared}
        env={'EXPECTED_NATIVE_HEAD':head,'APPROVED_NATIVE_HEAD':head,'APPROVED_SHARED_HEAD':shared,
             'GITHUB_EVENT_NAME':'pull_request',
             'EXPECTED_EVENT_ACTION':'ready_for_review','GITHUB_RUN_ATTEMPT':'1','GITHUB_JOB':'staging-native-admission'}
        with patch.dict(os.environ,env,clear=True):self.assertTrue(MODULE['ci_guard'](p,ROOT,SHARED))
        for key,value in [('EXPECTED_NATIVE_HEAD','0'*40),('GITHUB_RUN_ATTEMPT','2'),('EXPECTED_EVENT_ACTION','synchronize')]:
            with patch.dict(os.environ,{**env,key:value},clear=True):self.assertFalse(MODULE['ci_guard'](p,ROOT,SHARED))

    def test_wrapper_composes_existing_router_for_inspection(self):
        with tempfile.TemporaryDirectory(dir=str(Path(tempfile.gettempdir()).resolve())) as d:
            mapping=Path(d)/'map.json';mapping.write_text(json.dumps({'Takuro-Kwkm/sash-app':str(ROOT)}))
            r=subprocess.run([os.sys.executable,'-B',str(ROOT/'scripts/production/staging-recovery-connection.py'),
                              '--central',str(SHARED),'--repositories',str(mapping),'--inspect',*transport_flags()],capture_output=True,text=True)
            self.assertEqual(r.returncode,0,r.stdout+r.stderr)
            result=json.loads(r.stdout);self.assertEqual(result['state'],'STAGING_CONNECTION_CANDIDATE_INSPECTED')
            self.assertEqual(result['adoption'],'NOT_GRANTED')

    def test_wrapper_other_checkout_refused(self):
        with tempfile.TemporaryDirectory(dir=str(Path(tempfile.gettempdir()).resolve())) as d:
            mapping=Path(d)/'map.json';mapping.write_text(json.dumps({'Takuro-Kwkm/sash-app':d}))
            r=subprocess.run([os.sys.executable,'-B',str(ROOT/'scripts/production/staging-recovery-connection.py'),
                              '--central',str(SHARED),'--repositories',str(mapping),'--inspect',*transport_flags()],capture_output=True,text=True)
            self.assertEqual(r.returncode,2)
            self.assertEqual(json.loads(r.stdout)['state'],'FAIL_CLOSED')

    def test_local_package_and_inspection_preserve_original_refs(self):
        import hashlib,io,zipfile
        from harness.core import Blocked
        with tempfile.TemporaryDirectory(dir=str(Path(tempfile.gettempdir()).resolve())) as d:
            temp=Path(d);package=temp/'package';package.mkdir();cache=temp/'cache'
            cfg=json.loads((ROOT/'contracts/production/staging-native-admission.v1.json').read_text())
            objects=[];archive=io.BytesIO()
            with zipfile.ZipFile(archive,'w') as z:
                for asset in cfg['assets'].values():
                    ref=asset['ref'];raw=original_bytes(ref,SHARED,ROOT);digest=hashlib.sha256(raw).hexdigest()
                    name='objects/sha256/'+digest;z.writestr(name,raw)
                    objects.append({'original_ref':ref['path'],'sha256':digest,'size':len(raw),'object_path':name})
            head=lambda p:subprocess.check_output(['git','-C',str(p),'rev-parse','HEAD'],text=True).strip()
            manifest={'schema':'STAGING_ORIGINAL_TRANSPORT_V1','shared_head':head(SHARED),'native_head':head(ROOT),
                      'source_index_sha256':'a'*64,'objects':objects}
            m=package/'manifest.json';m.write_text(json.dumps(manifest));bundle=package/'bundle.zip';bundle.write_bytes(archive.getvalue())
            h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
            auth={'schema':'STAGING_INPUT_AUTHORIZATION_V1','manifest_sha256':h(m),'shared_head':head(SHARED),
                  'native_head':head(ROOT),'source_index_sha256':'a'*64,'bundle_sha256':h(bundle),
                  'bundle_size':bundle.stat().st_size}
            a=package/'authorization.json';a.write_text(json.dumps(auth));digest=h(a)
            self.assertEqual(EVIDENCE['prepare_inputs'](SHARED,package,cache,digest)['objects'],5)
            mapping=temp/'map.json';mapping.write_text(json.dumps({'Takuro-Kwkm/sash-app':str(ROOT)}))
            r=subprocess.run([os.sys.executable,'-B',str(ROOT/'scripts/production/staging-recovery-connection.py'),
                '--central',str(SHARED),'--repositories',str(mapping),'--inspect','--transport-manifest',str(m),
                '--transport-authorization',str(a),'--authorization-sha256',digest,'--cache-root',str(cache)],
                capture_output=True,text=True)
            self.assertEqual(r.returncode,0,r.stdout+r.stderr)
            self.assertEqual(json.loads(r.stdout)['adoption'],'NOT_GRANTED')
            env={'GITHUB_EVENT_NAME':'pull_request','EXPECTED_EVENT_ACTION':'ready_for_review',
                 'GITHUB_JOB':'staging-native-admission','GITHUB_RUN_ATTEMPT':'1','GITHUB_RUN_ID':'42',
                 'GITHUB_WORKFLOW_SHA':'b'*40,'RUNNER_OS':'Linux','RUNNER_ARCH':'X64',
                 'ImageOS':'ubuntu24','ImageVersion':'synthetic'}
            record=EVIDENCE['observation'](SHARED,m,a,digest,cache,'c'*40,env,'Python 3.11.9')
            self.assertFalse(record['qa_authority'])
            self.assertNotIn('original_ref',json.dumps(record))
            counts={'run':2,'failures':0,'errors':0,'skipped':0}
            self.assertEqual(EVIDENCE['result_record'](record,counts)['status'],'SUCCESS')
            self.assertEqual(EVIDENCE['result_record'](record,None)['status'],'INCOMPLETE')
            counts['failures']=1
            self.assertEqual(EVIDENCE['result_record'](record,counts)['status'],'FAILED')
            bundle.write_bytes(b'changed archive')
            with self.assertRaises(Blocked):EVIDENCE['prepare_inputs'](SHARED,package,temp/'cache2',digest)

    def test_scoped_ci_definition_outputs_only_bounded_receipts(self):
        policy=json.loads((ROOT/'contracts/production/staging-native-ci-policy.v1.json').read_text())
        workflow=(ROOT/'.github/workflows/staging-native-admission.yml').read_text()
        self.assertTrue(policy['enabled']);self.assertEqual(policy['max_runs'],1)
        profile=json.loads((ROOT/'contracts/production/release-profiles/staging-non-product.v1.json').read_text())
        self.assertEqual(profile['status'],'PENDING_ADOPTION')
        expected_shared=subprocess.check_output(['git','-C',str(SHARED),'rev-parse','HEAD'],text=True).strip()
        transport=test_envelope()
        if transport and 'successor' in transport:
            from harness.sash_local_admission import verify_source, CENTRAL
            expected_shared=verify_source(SHARED, ROOT, transport['successor'])['record']['input_predecessor'][CENTRAL]
        self.assertEqual(profile['shared_contract']['ref'],expected_shared)
        self.assertIn('fetch-inputs',workflow);self.assertNotIn('actions/download-artifact',workflow)
        self.assertIn('path: native',workflow);self.assertIn('path: shared',workflow)
        self.assertIn('secrets.STAGING_CENTRAL_READ_TOKEN',workflow)
        for name in policy['required_steps']:self.assertIn('name: '+name,workflow)
        self.assertIn('staging-observation/job-inputs.json',workflow)
        self.assertIn('staging-result/staging-result.json',workflow)
        self.assertNotIn('path: ${{ runner.temp }}/staging-input-package',
                         workflow.split('- name: Upload input observation',1)[-1])

class ReleasePackageTests(unittest.TestCase):
    def setUp(self):
        import hashlib,io,zipfile,copy
        self.hashlib,self.io,self.zipfile,self.copy=hashlib,io,zipfile,copy
        self.temp=tempfile.TemporaryDirectory(dir=str(Path(tempfile.gettempdir()).resolve()));self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.shared=SHARED
        head=lambda p:subprocess.check_output(['git','-C',str(p),'rev-parse','HEAD'],text=True).strip()
        self.heads={'shared_head':head(SHARED),'native_head':head(ROOT)}
        self.context={'schema':'STAGING_CI_SOURCE_CONTEXT_V1',**self.heads,'shared':{},'native':{}}
        for owner in ('shared','native'):
            for kind in ('policy','proposal'):
                p=self.root/(owner+'-'+kind+'.json');p.write_text(json.dumps({'fixture':p.name}))
                self.context[owner][kind]=EVIDENCE['capture'](p)
        c=self.root/'source-context.json';c.write_text(json.dumps(self.context))
        original=self.root/'original.txt';original.write_bytes(b'ORIGINAL SECRET-BEARING DOCUMENT')
        self.original=original
        self.request={'schema':'STAGING_INPUT_PACK_REQUEST_V1',**self.heads,'source_index_sha256':'a'*64,
            'source_context':EVIDENCE['capture'](c),'objects':[{'original_ref':str(original),'path':str(original),
                'sha256':self.h(original),'size':original.stat().st_size}]}
        self.request_path=self.root/'request.json';self.archive=self.root/'package.zip'
        self.refresh_request()
        self.record=EVIDENCE['pack_inputs'](SHARED,self.request_path,self.h(self.request_path),self.archive)
        self.content=self.archive.read_bytes()
        self.asset={'id':9,'url':'https://api.github.com/repos/Takuro-Kwkm/product-ui-contracts/releases/assets/9',
            'state':'uploaded','size':len(self.content),'digest':'sha256:'+self.h(self.archive)}
        self.repo={'id':1403696088,'private':True,'full_name':'Takuro-Kwkm/product-ui-contracts'}
        self.release={'id':7,'draft':False,'prerelease':True,'target_commitish':self.heads['shared_head'],
            'tag_name':'staging-input-p1-'+self.heads['shared_head']+'-'+self.heads['native_head'],
            'assets':[self.asset.copy()]}
        self.calls=[];self.redirect=False

    def h(self,p):return self.hashlib.sha256(Path(p).read_bytes()).hexdigest()
    def refresh_request(self):self.request_path.write_text(json.dumps(self.request))

    def response(self,url,token=None,binary=False):
        from urllib.parse import urlsplit
        self.calls.append((url,token,binary))
        if binary:
            if self.redirect and urlsplit(url).hostname=='api.github.com':
                return self.Reply(b'',302,{'Location':'https://release-assets.githubusercontent.com/fixed/package.zip'})
            return self.Reply(self.content,200,{'Content-Type':'application/zip','Content-Length':str(len(self.content))})
        value=self.repo if url.endswith('product-ui-contracts') else self.release if url.endswith('/releases/7') else self.asset
        return self.Reply(json.dumps(value).encode(),200,{'Content-Type':'application/json'})

    class Reply:
        def __init__(self,raw,status,headers):
            import io
            self.stream=io.BytesIO(raw);self.status=status;self.headers=headers
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def getcode(self):return self.status
        def read(self,n):return self.stream.read(n)

    def fetch(self,destination=None):
        return EVIDENCE['fetch_inputs'](SHARED,7,9,self.h(self.archive),len(self.content),
            destination or self.root/'received',self.record['authorization_sha256'],
            self.record['source_context_sha256'],'FAKE_TOKEN')

    def test_pack_preserves_originals_and_returns_no_adoption_or_upload(self):
        self.assertEqual(self.record['state'],'LOCAL_PACKAGE_NOT_UPLOADED_NOT_ADOPTED')
        self.assertEqual(self.record['objects'],5)
        self.assertEqual(self.original.read_bytes(),b'ORIGINAL SECRET-BEARING DOCUMENT')
        with self.zipfile.ZipFile(self.archive) as z:self.assertEqual(set(z.namelist()),EVIDENCE['PACKAGE_FILES'])
        self.assertNotIn('DOCUMENT',json.dumps(self.record))
        self.assertNotIn('HUMAN',json.dumps(self.record))

    def test_fetch_200_validates_full_package_and_shared_inner_contract(self):
        with patch.dict(EVIDENCE['release_bytes'].__globals__,{'release_request':self.response}):
            result=self.fetch()
        self.assertFalse(result['qa_authority'])
        self.assertEqual(set(p.name for p in (self.root/'received').iterdir()),EVIDENCE['PACKAGE_FILES'])
        self.assertTrue(any(binary for _,_,binary in self.calls))

    def test_redirect_does_not_forward_token_to_asset_host(self):
        self.redirect=True
        with patch.dict(EVIDENCE['release_bytes'].__globals__,{'release_request':self.response}):self.fetch()
        remote=[(url,token) for url,token,_ in self.calls if 'release-assets.githubusercontent.com' in url]
        self.assertEqual(len(remote),1);self.assertIsNone(remote[0][1])

    def test_untrusted_redirect_refused_before_next_request(self):
        from harness.core import Blocked
        calls=[]
        def bad(url,token=None,binary=False):
            calls.append(url);return self.Reply(b'',302,{'Location':'https://attacker.invalid/package'})
        with patch.dict(EVIDENCE['release_bytes'].__globals__,{'release_request':bad}):
            with self.assertRaises(Blocked):EVIDENCE['release_bytes'](self.asset['url'],'FAKE_TOKEN',10,binary=True)
        self.assertEqual(len(calls),1)

    def test_actual_request_uses_octet_stream_and_disables_redirects(self):
        captured=[]
        class Opener:
            def open(inner,req,timeout):
                captured.append((dict(req.header_items()),timeout));return self.Reply(b'zip',200,{})
        with patch('urllib.request.build_opener',return_value=Opener()):
            EVIDENCE['release_request'](self.asset['url'],'FAKE_TOKEN',binary=True)
        self.assertEqual(captured[0][0]['Accept'],'application/octet-stream')
        self.assertEqual(captured[0][0]['Authorization'],'Bearer FAKE_TOKEN')
        self.assertEqual(captured[0][1],30)

    def test_wrong_repository_release_and_asset_metadata_refused(self):
        from harness.core import Blocked
        for group,key,value in [('repo','private',False),('repo','id',1),('release','prerelease',False),
             ('release','id',8),('asset','digest','sha256:'+'0'*64),('asset','size',1),('asset','state','starter')]:
            with self.subTest(group=group,key=key):
                doc=getattr(self,group);old=doc[key];doc[key]=value
                with patch.dict(EVIDENCE['release_bytes'].__globals__,{'release_request':self.response}):
                    with self.assertRaises(Blocked):self.fetch(self.root/(group+'-'+key))
                doc[key]=old

    def test_failed_http_status_and_html_are_refused(self):
        from harness.core import Blocked
        for status,headers in [(401,{}),(403,{}),(404,{}),(200,{'Content-Type':'text/html'})]:
            with self.subTest(status=status,headers=headers):
                def bad(*args,**kwargs):return self.Reply(b'<html>login</html>',status,headers)
                with patch.dict(EVIDENCE['release_bytes'].__globals__,{'release_request':bad}):
                    with self.assertRaises(Blocked):EVIDENCE['release_bytes'](self.asset['url'],'FAKE_TOKEN',100,binary=True)

    def test_redirect_loop_and_overlong_body_refused(self):
        from harness.core import Blocked
        for redirect in [True,False]:
            def bad(*args,**kwargs):
                return self.Reply(b'x'*11,302 if redirect else 200,
                    {'Location':self.asset['url']} if redirect else {'Content-Type':'application/zip'})
            with patch.dict(EVIDENCE['release_bytes'].__globals__,{'release_request':bad}):
                with self.assertRaises(Blocked):EVIDENCE['release_bytes'](self.asset['url'],'FAKE_TOKEN',10,binary=True)

    def test_pack_wrong_hash_duplicate_ref_and_symlink_refused(self):
        from harness.core import Blocked
        cases=[]
        wrong=self.copy.deepcopy(self.request);wrong['objects'][0]['sha256']='0'*64;cases.append(wrong)
        duplicate=self.copy.deepcopy(self.request);duplicate['objects']*=2;cases.append(duplicate)
        link=self.root/'link.txt';link.symlink_to(self.original)
        linked=self.copy.deepcopy(self.request);linked['objects'][0]['path']=str(link);cases.append(linked)
        for n,request in enumerate(cases):
            self.request_path.write_text(json.dumps(request))
            with self.assertRaises(Blocked):EVIDENCE['pack_inputs'](SHARED,self.request_path,self.h(self.request_path),self.root/('bad-'+str(n)))
        with self.assertRaises(Blocked):EVIDENCE['pack_inputs'](SHARED,self.request_path,'0'*64,self.root/'wrong-request')

    def rewrite_outer(self,edit):
        with self.zipfile.ZipFile(self.io.BytesIO(self.content)) as archive:files={n:archive.read(n) for n in archive.namelist()}
        files=edit(files);stream=self.io.BytesIO()
        with self.zipfile.ZipFile(stream,'w') as archive:
            for name,raw in files.items():archive.writestr(name,raw)
        self.content=stream.getvalue();self.archive.write_bytes(self.content)
        self.asset.update(size=len(self.content),digest='sha256:'+self.h(self.archive))
        self.release['assets']=[self.asset.copy()]

    def test_traversal_and_extra_outer_member_refused_without_output(self):
        from harness.core import Blocked
        self.rewrite_outer(lambda f:{**f,'../outside':b'bad'})
        with patch.dict(EVIDENCE['release_bytes'].__globals__,{'release_request':self.response}):
            with self.assertRaises(Blocked):self.fetch()
        self.assertFalse((self.root/'received').exists())

    def test_wrong_control_hash_and_original_inner_hash_refused(self):
        from harness.core import Blocked
        self.rewrite_outer(lambda f:{**f,'authorization.json':b'{}'})
        with patch.dict(EVIDENCE['release_bytes'].__globals__,{'release_request':self.response}):
            with self.assertRaises(Blocked):self.fetch()
        self.assertFalse((self.root/'received').exists())

    def test_inner_expansion_limit_is_checked_before_decompression(self):
        from harness.core import Blocked
        manifest={'objects':[{'object_path':'objects/sha256/'+'a'*64,'size':EVIDENCE['MAX_PACKAGE_BYTES']}]}
        with self.assertRaises(Blocked):EVIDENCE['bounded_inner']({'manifest.json':json.dumps(manifest).encode(),'bundle.zip':b'not read'})

    def test_release_for_other_source_pair_is_refused(self):
        from harness.core import Blocked
        self.release['target_commitish']='0'*40
        with patch.dict(EVIDENCE['release_bytes'].__globals__,{'release_request':self.response}):
            with self.assertRaises(Blocked):self.fetch()
        self.assertFalse((self.root/'received').exists())

    def test_fresh_destination_and_token_are_required(self):
        from harness.core import Blocked
        with patch.dict(EVIDENCE['release_bytes'].__globals__,{'release_request':self.response}):
            existing=self.root/'existing';existing.mkdir()
            with self.assertRaises(Blocked):self.fetch(existing)
        with self.assertRaises(Blocked):EVIDENCE['fetch_inputs'](SHARED,7,9,self.h(self.archive),len(self.content),
            self.root/'no-token',self.record['authorization_sha256'],self.record['source_context_sha256'],'')

    def test_corrupted_inner_original_refused_after_matching_outer_controls(self):
        from harness.core import Blocked
        def edit(files):
            stream=self.io.BytesIO()
            with self.zipfile.ZipFile(self.io.BytesIO(files['bundle.zip'])) as archive:
                members={n:archive.read(n) for n in archive.namelist()}
            first=next(iter(members));members[first]=b'x'*len(members[first])
            with self.zipfile.ZipFile(stream,'w') as archive:
                for name,raw in members.items():archive.writestr(name,raw)
            files['bundle.zip']=stream.getvalue()
            auth=json.loads(files['authorization.json']);auth['bundle_sha256']=self.hashlib.sha256(files['bundle.zip']).hexdigest();auth['bundle_size']=len(files['bundle.zip'])
            files['authorization.json']=json.dumps(auth).encode()
            self.record['authorization_sha256']=self.hashlib.sha256(files['authorization.json']).hexdigest()
            return files
        self.rewrite_outer(edit)
        with patch.dict(EVIDENCE['release_bytes'].__globals__,{'release_request':self.response}):
            with self.assertRaises(Blocked):self.fetch()
        self.assertFalse((self.root/'received').exists())

    def test_outer_symlink_and_duplicate_members_refused(self):
        from harness.core import Blocked
        import warnings
        original=self.content
        for symlink in (True,False):
            self.content=original
            with self.zipfile.ZipFile(self.io.BytesIO(self.content)) as archive:
                files={n:archive.read(n) for n in archive.namelist()}
            stream=self.io.BytesIO()
            with warnings.catch_warnings():
                warnings.simplefilter('ignore',UserWarning)
                with self.zipfile.ZipFile(stream,'w') as archive:
                    for name,raw in files.items():
                        entry=self.zipfile.ZipInfo(name)
                        if symlink and name=='manifest.json':entry.external_attr=0o120777<<16
                        archive.writestr(entry,raw)
                    if not symlink:archive.writestr('manifest.json',files['manifest.json'])
            self.content=stream.getvalue();self.archive.write_bytes(self.content)
            self.asset.update(size=len(self.content),digest='sha256:'+self.h(self.archive));self.release['assets']=[self.asset.copy()]
            with patch.dict(EVIDENCE['release_bytes'].__globals__,{'release_request':self.response}):
                with self.assertRaises(Blocked):self.fetch(self.root/str(symlink))

    def test_local_pack_cli_creates_only_fresh_archive(self):
        destination=self.root/'cli-package.zip'
        result=subprocess.run([os.sys.executable,'-B',str(ROOT/'scripts/production/staging-ci-evidence.py'),
            'pack-inputs','--central',str(SHARED),'--request',str(self.request_path),
            '--request-sha256',self.h(self.request_path),'--out',str(destination)],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertEqual(json.loads(result.stdout)['state'],'LOCAL_PACKAGE_NOT_UPLOADED_NOT_ADOPTED')
        with self.zipfile.ZipFile(destination) as archive:self.assertEqual(set(archive.namelist()),EVIDENCE['PACKAGE_FILES'])


class NewBaselineNativeBoundary(unittest.TestCase):
    def test_new_profile_uses_existing_three_validator_steps(self):
        profile=json.loads((ROOT/'contracts/production/staging-baseline-review-work.v1.json').read_text())
        self.assertEqual([s['id'] for s in profile['steps']],['INPUTS_REVIEW','BASELINE_SCOPE_REVIEW','REVIEW_PACKET'])
        self.assertTrue(all(s['kind']=='validator' for s in profile['steps']))
        self.assertFalse(profile['provider_write_allowed'])
        self.assertFalse(profile['application_release_allowed'])
    def test_old_upstream_not_replaced_and_new_candidate_not_adopted(self):
        cfg=json.loads((ROOT/'contracts/production/staging-native-admission.v1.json').read_text())
        self.assertIsNone(cfg['upstream'])
        self.assertIsNone(cfg['upstream_work_id'])
        self.assertIsNone(cfg['new_baseline_review']['adoption'])
        self.assertEqual(cfg['new_baseline_review']['historical_restoration'],'HOLD')


class PortableBaselineCIContract(unittest.TestCase):
    def test_native_template_and_index_have_no_host_absolute_path(self):
        for name in ('staging-baseline-review-work.v1.json','staging-subject-index.v1.json'):
            raw=(ROOT/'contracts/production'/name).read_text()
            self.assertNotIn('/private/tmp/',raw)
            self.assertIn('"owner": "native"',raw)
    def test_result_without_baseline_receipt_is_incomplete(self):
        self.assertEqual(EVIDENCE['with_baseline_result']({'status':'SUCCESS'},None)['status'],'INCOMPLETE')
    def test_new_required_step_and_module_policy_not_optional(self):
        policy=json.loads((ROOT/'contracts/production/staging-native-ci-policy.v1.json').read_text())
        self.assertIn('Verify Staging baseline review',policy['required_steps'])
        self.assertIn('test_staging_baseline_work',policy['baseline_test_modules'])
        self.assertIn('baseline-ci',(ROOT/'.github/workflows/staging-native-admission.yml').read_text())
