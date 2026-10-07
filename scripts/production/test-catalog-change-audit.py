"""Audit boundaries: drift/incomplete review must never yield a verified audit."""
import importlib.util
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('catalog_audit',Path(__file__).with_name('catalog-change-audit.py'))
adapter=importlib.util.module_from_spec(spec);spec.loader.exec_module(adapter)

class AuditBoundaries(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
        adapter.setup(HARNESS)
    def ref(self,name,value):
        p=self.root/name;p.write_text(json.dumps(value));return {'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
    def review(self):
        c={'product_id':'test-product','scope_id':'catalogue-only','source_before':{'sha256':'old'},'source_after':{'sha256':'new'}}
        value={'status':'COMPLETE_REVIEWED','review_ref':'actual-review','product_id':c['product_id'],'scope_id':c['scope_id'],
               'before_sha256':'old','after_sha256':'new','sections':{s:'REVIEWED' for s in adapter.SECTIONS},
               'compared_pdf_pages':[1,2],'reviewed_nonprice_pdf_pages':[2],'reviewed_visual_pdf_pages':[2],'unresolved_in_scope':[]}
        c['review']=self.ref('review.json',value)
        c['visual_comparison']=self.ref('visual.json',{'before_sha256':'old','after_sha256':'new','pages':[
            {'pdf_page':1,'nonprice_visual_changed':False},{'pdf_page':2,'nonprice_visual_changed':True}]})
        comparison={'before_page_count':2,'after_page_count':2,'pages':[{},{}],'nonprice_text_changed_pages':[2]}
        return c,value,comparison
    def test_byte_drift_blocks(self):
        ref=self.ref('source.json',{'price':None});Path(ref['path']).write_text('changed')
        with self.assertRaises(adapter.Blocked):adapter.verified(ref)
    def test_complete_review_is_bound_to_exact_sources(self):
        c,value,comparison=self.review();self.assertEqual(adapter.admitted_review(c,comparison)['scope_id'],'catalogue-only')
        c['source_after']['sha256']='different'
        with self.assertRaises(adapter.Blocked):adapter.admitted_review(c,comparison)
    def test_unreviewed_page_is_not_a_no_change_result(self):
        c,value,comparison=self.review();comparison['nonprice_text_changed_pages']=[1,2]
        with self.assertRaises(adapter.Blocked):adapter.admitted_review(c,comparison)
    def test_visual_only_change_requires_review(self):
        c,value,comparison=self.review();value['reviewed_visual_pdf_pages']=[];c['review']=self.ref('review.json',value)
        with self.assertRaises(adapter.Blocked):adapter.admitted_review(c,comparison)
    def test_unresolved_catalogue_scope_cannot_be_complete(self):
        c,value,comparison=self.review();value['unresolved_in_scope']=['unreadable note'];c['review']=self.ref('review.json',value)
        with self.assertRaises(adapter.Blocked):adapter.admitted_review(c,comparison)

if __name__=='__main__':
    HARNESS=sys.argv.pop(1);adapter.setup(HARNESS);unittest.main()
