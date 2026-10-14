"""Apply Artifact-authored views while retaining all unrelated native ZIP bytes."""
import json,zipfile,copy,xml.etree.ElementTree as ET,hashlib
from pathlib import Path
R=Path('changes/replus-runtime-v5');OUT=Path('artifacts/replus-global-flow-v9/authoring');BEFORE=Path('/private/tmp/replus-20261014-v5/replus-glass-flow-v8/changes/replus-runtime-v5/candidates')
M='http://schemas.openxmlformats.org/spreadsheetml/2006/main';REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';PKG='http://schemas.openxmlformats.org/package/2006/relationships';CT='http://schemas.openxmlformats.org/package/2006/content-types'
def tag(n):return '{'+M+'}'+n
ET.register_namespace('',M);ET.register_namespace('r',REL)
def paths(z):
 book=ET.fromstring(z.read('xl/workbook.xml'));rs=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'));links={r.get('Id'):r.get('Target') for r in rs};p={}
 for s in book.find(tag('sheets')):
  t=links[s.get('{'+REL+'}id')];p[s.get('name')]=t.lstrip('/') if t.startswith('/') else 'xl/'+t
 return book,rs,p

def inline(z,path):
 xml=ET.fromstring(z.read(path));strings=ET.fromstring(z.read('xl/sharedStrings.xml')) if 'xl/sharedStrings.xml' in z.namelist() else []
 for c in xml.iter(tag('c')):
  if c.get('t')=='s':
   idx=int(c.find(tag('v')).text);text=''.join(n.text or '' for n in strings[idx].iter(tag('t')))
   for n in list(c):c.remove(n)
   c.set('t','inlineStr');ET.SubElement(ET.SubElement(c,tag('is')),tag('t')).text=text
 return xml
reports=[]
for entry in json.loads((R/'index.json').read_text())['products']:
 name=entry['id'].split(':')[1]
 with zipfile.ZipFile(BEFORE/(name+'.xlsx')) as z,zipfile.ZipFile(OUT/(name+'.artifact.xlsx')) as authored:
  book,rels,oldpaths=paths(z);_,_,ap=paths(authored)
  original=ET.fromstring(z.read(oldpaths['01_入力フロー']));flow=inline(authored,ap['01_入力フロー']);policy=inline(authored,ap['14_UI選択契約']);oldcells={c.get('r'):c for c in original.iter(tag('c'))}
  for c in flow.iter(tag('c')):
   prior=oldcells.get(c.get('r'));style=prior.get('s') if prior is not None else None
   c.attrib.pop('s',None)
   if style:c.set('s',style)
  # Keep native sheet layout/merges/validation; replace the authored cell data only.
  original.remove(original.find(tag('sheetData')));original.insert(next((i for i,n in enumerate(original) if n.tag==tag('mergeCells')),len(original)),flow.find(tag('sheetData')))
  # SpreadsheetML sheetData must precede mergeCells and later metadata.
  data=original.find(tag('sheetData'));original.remove(data);insert=next((i for i,n in enumerate(original) if n.tag not in [tag(x) for x in ['sheetPr','dimension','sheetViews','sheetFormatPr','cols']]),len(original));original.insert(insert,data)
  dim=original.find(tag('dimension'))
  if dim is not None:dim.set('ref','A1:I24')
  for c in policy.iter(tag('c')):
   col=''.join(ch for ch in c.get('r') if ch.isalpha());row=int(''.join(ch for ch in c.get('r') if ch.isdigit()));template=oldcells.get(col+('3' if row==2 else '4'))
   c.attrib.pop('s',None)
   if template is not None and template.get('s'):c.set('s',template.get('s'))
  sheetid=max(int(s.get('sheetId')) for s in book.find(tag('sheets')))+1;rid='rIdReplusUiV9';newpath='xl/worksheets/replus-ui-v9.xml'
  ET.SubElement(book.find(tag('sheets')),tag('sheet'),{'name':'14_UI選択契約','sheetId':str(sheetid),'{'+REL+'}id':rid})
  ET.SubElement(rels,'{'+PKG+'}Relationship',{'Id':rid,'Type':REL+'/worksheet','Target':'worksheets/replus-ui-v9.xml'})
  types=ET.fromstring(z.read('[Content_Types].xml'));ET.SubElement(types,'{'+CT+'}Override',{'PartName':'/'+newpath,'ContentType':'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'})
  changes={oldpaths['01_入力フロー']:original,'xl/workbook.xml':book,'xl/_rels/workbook.xml.rels':rels,'[Content_Types].xml':types,newpath:policy}
  payload={k:ET.tostring(v,encoding='utf-8',xml_declaration=True) for k,v in changes.items()}
  dest=R/'candidates'/(name+'.xlsx')
  with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED) as out:
   for info in z.infolist():out.writestr(copy.copy(info),payload.get(info.filename,z.read(info.filename)))
   out.writestr(newpath,payload[newpath])
  with zipfile.ZipFile(dest) as verified:
   preserved=[k for k in z.namelist() if k not in payload]
   assert all(z.read(k)==verified.read(k) for k in preserved);assert z.read('xl/styles.xml')==verified.read('xl/styles.xml');assert verified.testzip() is None
   expected=json.loads((R/'candidates'/(name+'.json')).read_text())['tables']
   for sheet in ['01_入力フロー','14_UI選択契約']:
    cells={c.get('r'):c for c in ET.fromstring(verified.read(oldpaths[sheet] if sheet in oldpaths else newpath)).iter(tag('c'))}
    for i,row in enumerate(expected[sheet]['values']):
     for j,value in enumerate(row):
      if value is None:continue
      addr=chr(65+j)+str(i+1);cell=cells[addr];actual=''.join(t.text or '' for t in cell.iter(tag('t'))) if cell.get('t')=='inlineStr' else (cell.find(tag('v')).text if cell.find(tag('v')) is not None else '')
      assert str(value)==actual,(name,sheet,addr,value,actual)
   reports.append({'component':name,'untargeted_members_identical':True,'styles_identical':True,'authored_tables_match_json':True,'preserved_members':len(preserved),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
(OUT/'preservation.json').write_text(json.dumps(reports,indent=2));print('NATIVE_AUTHORING_PRESERVATION_PASS',len(reports))
