"""Narrow OpenXML patch; preserve every untargeted ZIP member verbatim."""
import argparse,json,zipfile,xml.etree.ElementTree as ET,copy
from pathlib import Path
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
ET.register_namespace('',NS['m'])
def tag(s):return '{'+NS['m']+'}'+s
def col(n):
 s=''
 while n:n,r=divmod(n-1,26);s=chr(65+r)+s
 return s
def patch(root,name):
 root=Path(root);original=root/'baseline'/(name+'.xlsx');plan=json.loads((root/'review'/(name+'-authoring-changes.json')).read_text())
 patches={}
 with zipfile.ZipFile(original) as z:
  book=ET.fromstring(z.read('xl/workbook.xml'));rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
  targets={r.attrib['Id']:r.attrib['Target'].lstrip('/') for r in rels};paths={}
  for sheet in book.find(tag('sheets')):
   p=targets[sheet.attrib['{'+NS['r']+'}id']];paths[sheet.attrib['name']]=p if p.startswith('xl/') else 'xl/'+p
  for sheet in {p['sheet'] for p in plan}:
   path=paths[sheet];xml=ET.fromstring(z.read(path));data=xml.find(tag('sheetData'))
   for p in [p for p in plan if p['sheet']==sheet]:
    rn=p['row'];address=col(p['column'])+str(rn);row=next((r for r in data if r.attrib['r']==str(rn)),None)
    if row is None:
     previous=data[-1];row=ET.Element(tag('row'),{**previous.attrib,'r':str(rn)})
     data.append(row)
    cell=next((c for c in row if c.attrib['r']==address),None)
    if cell is None:
     prior=data[-2] if len(data)>1 else None
     template=next((c for c in prior if c.attrib['r'].startswith(col(p['column'])) and ''.join(ch for ch in c.attrib['r'] if ch.isalpha())==col(p['column'])),None) if prior is not None else None
     cell=ET.Element(tag('c'),{'r':address,**({'s':template.attrib['s']} if template is not None and 's' in template.attrib else {})});row.append(cell)
    for child in list(cell):cell.remove(child)
    cell.attrib.pop('t',None);value=p['after']
    if value is None:pass
    elif isinstance(value,bool):cell.set('t','b');ET.SubElement(cell,tag('v')).text='1' if value else '0'
    elif isinstance(value,(int,float)):ET.SubElement(cell,tag('v')).text=str(value)
    else:
     cell.set('t','inlineStr');node=ET.SubElement(ET.SubElement(cell,tag('is')),tag('t'));node.text=value
     if value!=value.strip():node.set('{http://www.w3.org/XML/1998/namespace}space','preserve')
   dim=xml.find(tag('dimension'))
   if dim is not None:
    original_ref=dim.get('ref','A1');last=original_ref.split(':')[-1];last_col=''.join(c for c in last if c.isalpha());maxrow=max(int(r.attrib['r']) for r in data);dim.set('ref',original_ref.split(':')[0]+':'+last_col+str(maxrow))
   patches[path]=ET.tostring(xml,encoding='utf-8',xml_declaration=True)
  out=root/'candidates'/(name+'.xlsx')
  with zipfile.ZipFile(out,'w') as dest:
   for info in z.infolist():dest.writestr(info,patches.get(info.filename,z.read(info.filename)))
 with zipfile.ZipFile(original) as z,zipfile.ZipFile(out) as a:
  for n in z.namelist():
   if n not in patches:assert z.read(n)==a.read(n),'UNTARGETED_MEMBER_CHANGED:'+n
 return {'component':name,'patched_cells':len(plan),'changed_sheet_xml':sorted(patches),'styles_xml_identical':True,'untargeted_members_identical':True}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--component',required=True);a=p.parse_args();r=patch(a.root,a.component);Path(a.root,'review',a.component+'-openxml-preservation.json').write_text(json.dumps(r,indent=2));print(json.dumps(r))
