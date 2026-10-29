#!/usr/bin/env python3
"""Thin host/Shared observation composition; never dispatches or publishes."""
import argparse
import hashlib
import json
import os
import platform
import re
import subprocess
import sys
import zipfile
from pathlib import Path

NATIVE = Path(__file__).resolve().parents[2]


def capture(path):
    p = Path(path).resolve()
    return {'path': str(p), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
            'location': 'host-bound original CI capture', 'observed_at': 'host-bound'}


def prepare_inputs(shared, package_root, cache_root, authorization_sha256):
    from harness.staging_admission import check, reference, owned, TransportContext
    package = Path(package_root).resolve()
    auth_ref, manifest_ref = capture(owned(package, 'authorization.json')), capture(owned(package, 'manifest.json'))
    check(auth_ref['sha256'] == authorization_sha256, 'TRANSPORT_AUTHORITY', 'Independent authorization digest required')
    auth, manifest = reference(auth_ref), reference(manifest_ref)
    bundle = owned(package, 'bundle.zip')
    check(sha(bundle) == auth.get('bundle_sha256') and bundle.stat().st_size == auth.get('bundle_size')
          and manifest_ref['sha256'] == auth.get('manifest_sha256'),
          'TRANSPORT_ARCHIVE', 'Exact authorized archive required')
    cache = Path(cache_root).absolute()
    check(not cache.exists() and not any(p.is_symlink() for p in cache.parents),
          'TRANSPORT_CACHE', 'Fresh owned cache required')
    objects = manifest.get('objects', [])
    expected = {}
    for item in objects:
        name, digest, size = item.get('object_path'), item.get('sha256'), item.get('size')
        check(isinstance(digest, str) and re.fullmatch('[0-9a-f]{64}', digest)
              and name == 'objects/sha256/' + digest and type(size) is int and size >= 0
              and (name not in expected or expected[name] == (digest, size)),
              'TRANSPORT_ENTRY', 'Only named original content objects')
        expected[name] = (digest, size)
    check(bool(expected), 'TRANSPORT_EMPTY', 'Original manifest required')
    with zipfile.ZipFile(bundle) as archive:
        entries = archive.infolist()
        check(len(entries) == len(expected) and {e.filename for e in entries} == set(expected),
              'TRANSPORT_INVENTORY', 'Archive cannot contain extra or duplicate files')
        contents = {}
        for entry in entries:
            digest, size = expected[entry.filename]
            check(not entry.flag_bits & 1 and entry.file_size == size
                  and (entry.external_attr >> 16) & 0o170000 in (0, 0o100000),
                  'TRANSPORT_ENTRY', 'Only bounded regular originals')
            raw = archive.read(entry)
            check(hashlib.sha256(raw).hexdigest() == digest, 'TRANSPORT_BYTES', 'Original archive bytes differ')
            contents[entry.filename] = raw
    cache.mkdir(parents=True)
    for name, raw in contents.items():
        destination = cache/name; destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open('xb') as output: output.write(raw)
    TransportContext(manifest_ref, cache, auth_ref, authorization_sha256)
    return {'state': 'ORIGINAL_BYTES_PREPARED_NOT_ADOPTED', 'objects': len(expected),
            'manifest_sha256': manifest_ref['sha256'], 'qa_authority': False}


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def observation(shared, manifest_path, authorization_path, authorization_sha256, cache_root,
                base_sha, env=None, runtime=None):
    from harness.staging_admission import TransportContext, git, check, POLICY, PROFILE, CONFIG
    from harness.core import fingerprint
    env = os.environ if env is None else env
    context = TransportContext.from_envelope({'manifest': capture(manifest_path),
        'authorization': capture(authorization_path), 'authorization_sha256': authorization_sha256,
        'cache_root': str(Path(cache_root).resolve())}, shared, NATIVE)
    policy = json.loads((NATIVE/POLICY).read_text())
    check(env.get('GITHUB_EVENT_NAME') == 'pull_request' and env.get('EXPECTED_EVENT_ACTION') == 'ready_for_review'
          and env.get('GITHUB_JOB') == policy['job'] and env.get('GITHUB_RUN_ATTEMPT') == '1'
          and re.fullmatch('[0-9a-f]{40}', base_sha or ''), 'CI_OBSERVATION', 'Exact native activity and source required')
    run_id = int(env.get('GITHUB_RUN_ID', '0'))
    check(run_id > 0, 'CI_OBSERVATION', 'Real run identity required')
    profiles = {}
    for name in policy['job_input_policy']['profile_paths']:
        p = NATIVE/name
        profiles[name] = {'sha256': sha(p), 'json_fingerprint': fingerprint(json.loads(p.read_text()))}
    environment = {k: env.get(k, '') for k in ('RUNNER_OS','RUNNER_ARCH','ImageOS','ImageVersion')}
    environment['runtimes'] = {'python3': runtime or 'Python ' + platform.python_version()}
    staging = {'shared_head': context.document['shared_head'], 'native_head': context.document['native_head'],
        'source_index_sha256': context.document['source_index_sha256'],
        'transport_manifest_sha256': context.manifest_sha256,
        'bundle_sha256': context.authorization['bundle_sha256'], 'policy_sha256': sha(NATIVE/POLICY),
        'profile_sha256': sha(NATIVE/PROFILE)}
    return {'schema':'CI_JOB_INPUT_OBSERVATION_V1','repository':'Takuro-Kwkm/sash-app',
        'head_sha':staging['native_head'],'base_sha':base_sha,'checkout_sha':staging['native_head'],
        'checkout_parents':[],'run_id':run_id,'run_attempt':1,'workflow_path':policy['workflow'],
        'workflow_sha':env.get('GITHUB_WORKFLOW_SHA',''),'workflow_sha256':sha(NATIVE/policy['workflow']),
        'job_key':policy['job'],'event':'pull_request','event_action':'ready_for_review',
        'observation_stage':'after-runtime-setup','environment':environment,
        'environment_sha256':fingerprint(environment),'profile_inputs':profiles,
        'qa_authority':False,'profile_usage_proven':False,'staging':staging}


def result_record(inputs, tests):
    keys = ('repository','head_sha','base_sha','run_id','run_attempt','workflow_path','job_key',
            'event','event_action','qa_authority','profile_usage_proven','staging')
    valid = (isinstance(tests, dict) and set(tests) == {'run','failures','errors','skipped'}
             and all(type(v) is int and v >= 0 for v in tests.values()))
    counts = tests if valid else {'run':0,'failures':0,'errors':0,'skipped':0}
    status = 'INCOMPLETE' if not valid or not counts['run'] else 'SUCCESS' if not any(
        counts[k] for k in ('failures','errors','skipped')) else 'FAILED'
    return {'schema':'STAGING_NATIVE_SCOPE_RESULT_V1', **{k:inputs[k] for k in keys},
            'status':status,'tests':counts}


# Private input intake is host composition; Shared validators still own admission.
MAX_PACKAGE_BYTES = 64 * 1024 * 1024
MAX_CONTROL_BYTES = 4 * 1024 * 1024
PACKAGE_FILES = {'manifest.json', 'authorization.json', 'bundle.zip', 'source-context.json'}
CENTRAL_REPOSITORY_ID = 1403696088
DOWNLOAD_HOSTS = {'api.github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'}


def regular_bytes(path, maximum=MAX_PACKAGE_BYTES):
    from harness.staging_admission import check
    p = Path(path).absolute()
    check(p.is_file() and not any(x.is_symlink() for x in (p, *p.parents))
          and 0 <= p.stat().st_size <= maximum, 'PACKAGE_FILE', 'Bounded regular input required')
    return p.read_bytes()


def bounded_inner(files):
    from harness.staging_admission import check
    doc = json.loads(files['manifest.json'])
    entries = doc.get('objects')
    check(isinstance(entries, list) and 0 < len(entries) <= 2004,
          'PACKAGE_LIMIT', 'Bounded original inventory required')
    physical = {}
    for item in entries:
        name, size = item.get('object_path'), item.get('size')
        check(isinstance(name, str) and re.fullmatch('objects/sha256/[0-9a-f]{64}', name)
              and type(size) is int and 0 <= size <= MAX_PACKAGE_BYTES // 2
              and (name not in physical or physical[name] == size),
              'PACKAGE_LIMIT', 'Bounded original sizes required')
        physical[name] = size
    check(sum(physical.values()) <= MAX_PACKAGE_BYTES // 2,
          'PACKAGE_LIMIT', 'Decompressed original byte limit exceeded')
    import io
    with zipfile.ZipFile(io.BytesIO(files['bundle.zip'])) as archive:
        items = archive.infolist()
        check(len(items) == len(physical) and {x.filename for x in items} == set(physical)
              and all(x.file_size == physical[x.filename] for x in items),
              'PACKAGE_LIMIT', 'Inner inventory/size mismatch')


def pack_inputs(shared, request_path, request_sha256, destination):
    import io
    import tempfile
    from harness.staging_admission import check, TransportContext, git
    raw = regular_bytes(request_path, MAX_CONTROL_BYTES)
    check(hashlib.sha256(raw).hexdigest() == request_sha256, 'PACK_AUTHORITY', 'Fixed host request required')
    request = json.loads(raw)
    check(set(request) == {'schema', 'shared_head', 'native_head', 'source_index_sha256',
                           'objects', 'source_context'} and request['schema'] == 'STAGING_INPUT_PACK_REQUEST_V1',
          'PACK_REQUEST', 'Explicit local pack request required')
    for name, checkout in [('shared_head', shared), ('native_head', NATIVE)]:
        check(request[name] == git(checkout, 'rev-parse', 'HEAD').decode().strip(),
              'PACK_HEAD', 'Pack request belongs to another source pair')
    check(re.fullmatch('[0-9a-f]{64}', request['source_index_sha256'] or '')
          and isinstance(request['objects'], list) and 0 < len(request['objects']) <= 2000,
          'PACK_SCOPE', 'Bounded source index and objects required')
    context_ref = request['source_context']
    context_raw = regular_bytes(context_ref['path'], MAX_CONTROL_BYTES)
    check(hashlib.sha256(context_raw).hexdigest() == context_ref['sha256'], 'PACK_CONTEXT', 'Source context changed')
    context = json.loads(context_raw)
    check(set(context) == {'schema', 'shared_head', 'native_head', 'shared', 'native'}
          and context['schema'] == 'STAGING_CI_SOURCE_CONTEXT_V1'
          and all(context[k] == request[k] for k in ('shared_head', 'native_head')),
          'PACK_CONTEXT', 'Exact C/N context required')
    items = list(request['objects'])
    for owner in ('shared', 'native'):
        for key in ('policy', 'proposal'):
            ref = context[owner][key]
            value = regular_bytes(ref['path'], MAX_CONTROL_BYTES)
            check(hashlib.sha256(value).hexdigest() == ref['sha256'], 'PACK_CONTEXT', 'Control bytes changed')
            items.append({'original_ref': ref['path'], 'path': ref['path'],
                          'sha256': ref['sha256'], 'size': len(value)})
    objects, physical, identities = [], {}, set()
    for item in items:
        check(set(item) == {'original_ref', 'path', 'sha256', 'size'}
              and isinstance(item['original_ref'], str) and Path(item['original_ref']).is_absolute()
              and item['original_ref'] not in identities and type(item['size']) is int,
              'PACK_OBJECT', 'Unique explicit original reference required')
        value = regular_bytes(item['path'])
        check(len(value) == item['size'] and hashlib.sha256(value).hexdigest() == item['sha256'],
              'PACK_BYTES', 'Captured bytes differ')
        identities.add(item['original_ref']); name = 'objects/sha256/' + item['sha256']
        physical[name] = value
        check(sum(map(len, physical.values())) <= MAX_PACKAGE_BYTES // 2,
              'PACK_LIMIT', 'Original byte limit exceeded')
        objects.append({k: item[k] for k in ('original_ref', 'sha256', 'size')} | {'object_path': name})
    bundle = io.BytesIO()
    with zipfile.ZipFile(bundle, 'w', compression=zipfile.ZIP_STORED) as archive:
        for name, value in sorted(physical.items()): archive.writestr(name, value)
    manifest = {'schema': 'STAGING_ORIGINAL_TRANSPORT_V1', **{k: request[k] for k in
                 ('shared_head', 'native_head', 'source_index_sha256')}, 'objects': objects}
    encode = lambda value: (json.dumps(value, sort_keys=True) + '\n').encode()
    manifest_raw = encode(manifest); bundle_raw = bundle.getvalue()
    authorization = {'schema': 'STAGING_INPUT_AUTHORIZATION_V1',
        **{k: request[k] for k in ('shared_head', 'native_head', 'source_index_sha256')},
        'manifest_sha256': hashlib.sha256(manifest_raw).hexdigest(),
        'bundle_sha256': hashlib.sha256(bundle_raw).hexdigest(), 'bundle_size': len(bundle_raw)}
    authorization_raw = encode(authorization); auth_hash = hashlib.sha256(authorization_raw).hexdigest()
    files = {'manifest.json': manifest_raw, 'authorization.json': authorization_raw,
             'bundle.zip': bundle_raw, 'source-context.json': context_raw}
    bounded_inner(files)
    with tempfile.TemporaryDirectory(dir=str(Path(tempfile.gettempdir()).resolve())) as temporary:
        package = Path(temporary) / 'package'; package.mkdir()
        for name, value in files.items(): (package / name).write_bytes(value)
        cache = Path(temporary) / 'cache'
        prepare_inputs(shared, package, cache, auth_hash)
        TransportContext.from_envelope({'manifest': capture(package/'manifest.json'),
            'authorization': capture(package/'authorization.json'), 'authorization_sha256': auth_hash,
            'cache_root': str(cache)}, shared, NATIVE)
    outer = io.BytesIO()
    with zipfile.ZipFile(outer, 'w', compression=zipfile.ZIP_STORED) as archive:
        for name, value in sorted(files.items()): archive.writestr(name, value)
    content = outer.getvalue()
    check(len(content) <= MAX_PACKAGE_BYTES, 'PACK_LIMIT', 'Package too large')
    p = Path(destination).absolute()
    check(not p.exists() and not any(x.is_symlink() for x in p.parents), 'PACK_DESTINATION', 'Fresh output required')
    with p.open('xb') as output: output.write(content)
    return {'state': 'LOCAL_PACKAGE_NOT_UPLOADED_NOT_ADOPTED', 'package_sha256': sha(p),
            'package_size': len(content), 'authorization_sha256': auth_hash,
            'source_context_sha256': hashlib.sha256(context_raw).hexdigest(),
            'manifest_sha256': authorization['manifest_sha256'], 'objects': len(physical),
            'qa_authority': False}


def release_request(url, token=None, binary=False):
    import urllib.request
    import urllib.error
    from urllib.parse import urlsplit
    from harness.staging_admission import check
    parsed = urlsplit(url)
    check(parsed.scheme == 'https' and parsed.hostname in DOWNLOAD_HOSTS
          and parsed.port in (None, 443) and parsed.username is None
          and parsed.password is None and not parsed.fragment,
          'ASSET_URL', 'Only trusted HTTPS download hosts')
    headers = {'Accept': 'application/octet-stream' if binary else 'application/vnd.github+json',
               'X-GitHub-Api-Version': '2022-11-28'}
    if token:
        check(parsed.hostname == 'api.github.com' and isinstance(token, str)
              and '\n' not in token and '\r' not in token, 'ASSET_TOKEN', 'API-only credential')
        headers['Authorization'] = 'Bearer ' + token
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs): return None
    opener = urllib.request.build_opener(NoRedirect())
    try: return opener.open(urllib.request.Request(url, headers=headers), timeout=30)
    except urllib.error.HTTPError as error:
        if error.code == 302: return error
        raise


def release_bytes(url, token, limit, binary=False):
    from urllib.parse import urlsplit
    from harness.staging_admission import check
    import time
    deadline = time.monotonic() + 120
    for hop in range(4):
        check(time.monotonic() < deadline, 'ASSET_TIMEOUT', 'Download deadline exceeded')
        with release_request(url, token, binary=binary) as response:
            status = response.getcode()
            if status == 302:
                location = response.headers.get('Location', '')
                check(binary and bool(location), 'ASSET_REDIRECT', 'Unexpected redirect')
                # Validate BEFORE issuing the next request; never forward a token off the API host.
                target = urlsplit(location)
                check(target.scheme == 'https' and target.hostname in DOWNLOAD_HOSTS
                      and target.port in (None,443) and target.username is None and target.password is None
                      and not target.fragment, 'ASSET_REDIRECT', 'Untrusted redirect')
                token = token if target.hostname == 'api.github.com' else None
                url = location; continue
            check(status == 200, 'ASSET_HTTP', 'Successful bounded response required')
            if binary:
                check(response.headers.get('Content-Type','').split(';')[0].strip()
                      in ('application/octet-stream','application/zip','application/x-zip-compressed'),
                      'ASSET_TYPE', 'Binary package required')
            length = response.headers.get('Content-Length')
            check(length is None or length.isdigit() and int(length) <= limit,
                  'ASSET_SIZE', 'Response exceeds bound')
            chunks, received = [], 0
            read = getattr(response, 'read1', response.read)
            while True:
                check(time.monotonic() < deadline, 'ASSET_TIMEOUT', 'Download deadline exceeded')
                chunk = read(min(65536, limit - received + 1))
                if not chunk:break
                received += len(chunk)
                check(received <= limit, 'ASSET_SIZE', 'Response exceeds bound')
                chunks.append(chunk)
            return b''.join(chunks)
    check(False, 'ASSET_REDIRECT', 'Redirect limit exceeded')


def fetch_inputs(shared, release_id, asset_id, package_sha256, package_size,
                 package_root, authorization_sha256, source_context_sha256, token):
    import io
    import tempfile
    from harness.staging_admission import check, TransportContext
    check(type(release_id) is int and release_id > 0 and type(asset_id) is int and asset_id > 0
          and type(package_size) is int and 0 < package_size <= MAX_PACKAGE_BYTES
          and all(re.fullmatch('[0-9a-f]{64}', x or '') for x in
                  (package_sha256, authorization_sha256, source_context_sha256))
          and isinstance(token, str) and bool(token), 'ASSET_INPUT', 'Independent fixed package identity required')
    api = 'https://api.github.com/repos/Takuro-Kwkm/product-ui-contracts'
    repo = json.loads(release_bytes(api, token, MAX_CONTROL_BYTES))
    check(repo.get('id') == CENTRAL_REPOSITORY_ID and repo.get('private') is True
          and repo.get('full_name') == 'Takuro-Kwkm/product-ui-contracts',
          'ASSET_REPOSITORY', 'Exact private repository required')
    release = json.loads(release_bytes(api + '/releases/' + str(release_id), token, MAX_CONTROL_BYTES))
    expected_url = api + '/releases/assets/' + str(asset_id)
    matching = [a for a in release.get('assets', []) if a.get('id') == asset_id]
    check(release.get('id') == release_id and release.get('draft') is False
          and release.get('prerelease') is True and len(matching) == 1,
          'ASSET_RELEASE', 'Fixed private prerelease asset required')
    asset = json.loads(release_bytes(expected_url, token, MAX_CONTROL_BYTES))
    check(asset.get('id') == asset_id and asset.get('url') == expected_url
          and asset.get('state') == 'uploaded' and asset.get('size') == package_size
          and asset.get('digest') == 'sha256:' + package_sha256
          and all(matching[0].get(k) == asset.get(k) for k in ('id','url','size','digest','state')),
          'ASSET_METADATA', 'Asset metadata changed')
    # Binary request explicitly opts into octet-stream while retaining the API token.
    content = release_bytes(expected_url, token, package_size, binary=True)
    check(len(content) == package_size and hashlib.sha256(content).hexdigest() == package_sha256,
          'ASSET_BYTES', 'Package bytes changed')
    destination = Path(package_root).absolute()
    check(not destination.exists() and not any(p.is_symlink() for p in destination.parents),
          'PACKAGE_DESTINATION', 'Fresh package directory required')
    with zipfile.ZipFile(io.BytesIO(content)) as archive:
        entries = archive.infolist()
        check(len(entries) == len(PACKAGE_FILES) and {e.filename for e in entries} == PACKAGE_FILES,
              'PACKAGE_INVENTORY', 'Only exact package members')
        files = {}
        for entry in entries:
            check(not entry.flag_bits & 1 and (entry.external_attr >> 16) & 0o170000 in (0,0o100000)
                  and 0 <= entry.file_size <= (MAX_PACKAGE_BYTES if entry.filename == 'bundle.zip' else MAX_CONTROL_BYTES),
                  'PACKAGE_MEMBER', 'Bounded regular member required')
            files[entry.filename] = archive.read(entry)
    check(hashlib.sha256(files['authorization.json']).hexdigest() == authorization_sha256
          and hashlib.sha256(files['source-context.json']).hexdigest() == source_context_sha256,
          'PACKAGE_AUTHORITY', 'Independent control hashes required')
    # Validate the full inner archive and exact C/N before publishing the receiver directory.
    bounded_inner(files)
    with tempfile.TemporaryDirectory(dir=str(Path(tempfile.gettempdir()).resolve())) as temporary:
        package = Path(temporary) / 'package'; package.mkdir()
        for name, value in files.items(): (package/name).write_bytes(value)
        cache = Path(temporary) / 'cache'
        prepare_inputs(shared, package, cache, authorization_sha256)
        TransportContext.from_envelope({'manifest':capture(package/'manifest.json'),
            'authorization':capture(package/'authorization.json'), 'authorization_sha256':authorization_sha256,
            'cache_root':str(cache)}, shared, NATIVE)
        context = json.loads(files['source-context.json'])
        manifest = json.loads(files['manifest.json'])
        check(release.get('target_commitish') == manifest['shared_head']
              and release.get('tag_name') == 'staging-input-p1-' + manifest['shared_head'] + '-' + manifest['native_head'],
              'ASSET_RELEASE', 'Release is bound to another C/N')
        check(context.get('schema') == 'STAGING_CI_SOURCE_CONTEXT_V1'
              and all(context.get(k) == manifest[k] for k in ('shared_head','native_head')),
              'PACKAGE_CONTEXT', 'Source context C/N differs')
    destination.mkdir(parents=True)
    for name, value in files.items():
        with (destination/name).open('xb') as output: output.write(value)
    return {'state':'FIXED_PRIVATE_PACKAGE_RECEIVED_NOT_ADOPTED','release_id':release_id,
            'asset_id':asset_id,'package_sha256':package_sha256,'package_size':package_size,'qa_authority':False}


def main(argv=None):
    parser=argparse.ArgumentParser()
    parser.add_argument('command',choices=('prepare-inputs','inputs','result','source-check','pack-inputs','fetch-inputs'))
    parser.add_argument('--central',required=True)
    parser.add_argument('--package-root');parser.add_argument('--cache-root')
    parser.add_argument('--authorization-sha256');parser.add_argument('--base')
    parser.add_argument('--inputs');parser.add_argument('--tests');parser.add_argument('--out')
    parser.add_argument('--source-context');parser.add_argument('--source-context-sha256')
    parser.add_argument('--request');parser.add_argument('--request-sha256')
    parser.add_argument('--release-id',type=int);parser.add_argument('--asset-id',type=int)
    parser.add_argument('--package-sha256');parser.add_argument('--package-size',type=int)
    args=parser.parse_args(argv)
    shared=Path(args.central).resolve();sys.path.insert(0,str(shared))
    from harness.core import Blocked
    try:
        if args.command=='pack-inputs':
            record=pack_inputs(shared,args.request,args.request_sha256,args.out)
        elif args.command=='fetch-inputs':
            record=fetch_inputs(shared,args.release_id,args.asset_id,args.package_sha256,args.package_size,
                args.package_root,args.authorization_sha256,args.source_context_sha256,
                os.environ.get('STAGING_INPUT_READ_TOKEN',''))
        elif args.command=='prepare-inputs':
            record=prepare_inputs(shared,args.package_root,args.cache_root,args.authorization_sha256)
        elif args.command=='inputs':
            package=Path(args.package_root)
            record=observation(shared,package/'manifest.json',package/'authorization.json',
                               args.authorization_sha256,args.cache_root,args.base)
        elif args.command=='result':
            tests=json.loads(Path(args.tests).read_text()) if args.tests and Path(args.tests).is_file() else None
            record=result_record(json.loads(Path(args.inputs).read_text()),tests)
        else:
            from harness.staging_admission import review_ci_candidate_scope
            transport = None
            if args.package_root:
                from harness.staging_admission import TransportContext
                package=Path(args.package_root)
                transport=TransportContext.from_envelope({'manifest':capture(package/'manifest.json'),
                    'authorization':capture(package/'authorization.json'),
                    'authorization_sha256':args.authorization_sha256,'cache_root':args.cache_root},shared,NATIVE)
            record=review_ci_candidate_scope(shared,NATIVE,capture(args.source_context),args.source_context_sha256,transport)
        raw=json.dumps(record,sort_keys=True)+'\n'
        if args.out and args.command != 'pack-inputs':
            destination=Path(args.out);destination.parent.mkdir(parents=True,exist_ok=True);destination.write_text(raw)
        else: print(raw,end='')
        return 0
    except (Blocked,OSError,ValueError,TypeError,KeyError,zipfile.BadZipFile):
        # Do not print original bytes or secret-bearing input in diagnostics.
        print(json.dumps({'state':'FAIL_CLOSED','code':'STAGING_CI_EVIDENCE_INPUT','qa_authority':False}))
        return 2


if __name__=='__main__':sys.exit(main())
