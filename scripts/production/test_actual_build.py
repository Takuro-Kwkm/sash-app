import os, sys, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
class ActualBuild(unittest.TestCase):
    def test_actual_shared_workflow_candidate_qa_save_resume(self):
        shared = os.environ['SHARED_HARNESS_ROOT']
        sys.path.insert(0, shared)
        from product_master.execution_fixture import exercise
        result = exercise(shared, ROOT)
        self.assertEqual(result['state'], 'COMPLETED')
if __name__ == '__main__': unittest.main(verbosity=2)
