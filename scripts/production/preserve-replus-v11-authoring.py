"""Use Artifact-authored cell data, retain unrelated native workbook members."""
import copy,json,zipfile,xml.etree.ElementTree as ET,hashlib
from pathlib import Path
R=Path('changes/replus-runtime-v5');OUT=Path('artifacts/replus-flow-v11/authoring');BEFORE=Path('/private/tmp/replus-flow-v10-20261014')/R/'candidates'
M='http://schemas.openxmlformats.org/spreadsheetml/2006/main';REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
ET.register_namespace('',M);ET.register_namespace('r',REL)
def tag(n):return '{'+M+'}'+n
def paths(z):
 book=ET.fromstring(z.read('xl/workbook.xml'));rs=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'));links={r.get('Id'):r.get('Target') for r in rs};p={}
 for s in book.find(tag('sheets')):
  t=links[s.get('{'+REL+'}id')];p[s.get('name')]=t.lstrip('/') if t.startswith('/') else 'xl/'+t
 return p
def authored_data(z,path):
 xml=ET.fromstring(z.read(path));strings=ET.fromstring(z.read('xl/sharedStrings.xml')) if 'xl/sharedStrings.xml' in z.namelist() else []
 for c in xml.iter(tag('c')):
  if c.get('t')=='s':
   text=''.join(n.text or '' for n in strings[int(c.find(tag('v')).text)].iter(tag('t')))
   for n in list(c):c.remove(n)
   c.set('t','inlineStr');ET.SubElement(ET.SubElement(c,tag('is')),tag('t')).text=text
 return xml.find(tag('sheetData'))
reports=[]
for entry in json.loads((R/'index.json').read_text())['products']:
 name=entry['id'].split(':')[1]
 with zipfile.ZipFile(BEFORE/(name+'.xlsx')) as z,zipfile.ZipFile(OUT/(name+'.artifact.xlsx')) as a:
  oldpaths=paths(z);ap=paths(a);payload={}
  for sheet in ['01_入力フロー','14_UI選択契約','90_Evidence']:
   original=ET.fromstring(z.read(oldpaths[sheet]));styles={c.get('r'):c.get('s') for c in original.iter(tag('c'))};data=authored_data(a,ap[sheet])
   for c in data.iter(tag('c')):
    c.attrib.pop('s',None)
    if styles.get(c.get('r')):c.set('s',styles[c.get('r')])
   previous=original.find(tag('sheetData'));position=list(original).index(previous);original.remove(previous);original.insert(position,data)
   payload[oldpaths[sheet]]=ET.tostring(original,encoding='utf-8',xml_declaration=True)
  # .NET OpenXML packaging rejects prefixed package-root metadata emitted in V9.
  # Normalize only those two root prefixes; semantics, relationships and IDs stay identical.
  for path in ['[Content_Types].xml','xl/_rels/workbook.xml.rels']:
   payload[path]=z.read(path).replace(b'ns0:',b'').replace(b'xmlns:ns0=',b'xmlns=')
  dest=R/'candidates'/(name+'.xlsx')
  with zipfile.ZipFile(dest,'w') as out:
   for info in z.infolist():out.writestr(copy.copy(info),payload.get(info.filename,z.read(info.filename)))
  with zipfile.ZipFile(dest) as verified:
   preserved=[k for k in z.namelist() if k not in payload]
   assert all(z.read(k)==verified.read(k) for k in preserved);assert verified.testzip() is None
   reports.append({'component':name,'changed_members':list(payload),'untargeted_members_identical':True,'styles_identical':z.read('xl/styles.xml')==verified.read('xl/styles.xml'),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
(OUT/'preservation.json').write_text(json.dumps(reports,indent=2)+'\n');print('NATIVE_AUTHORING_PRESERVATION_PASS',len(reports))
