"""
Unit Tests for FALCON-404 Early Stopping Module
Milestone: Phase 7.2A.3 — Training Pipeline Development
Author: Lead Developer & System Architect: Harshad Mane
"""

import unittest
from ml.src.early_stopping import EarlyStopping


class TestEarlyStopping(unittest.TestCase):
    def test_invalid_parameters(self):
        with self.assertRaises(ValueError):
            EarlyStopping(patience=0)
        with self.assertRaises(ValueError):
            EarlyStopping(mode="invalid")

    def test_min_mode_improves(self):
        es = EarlyStopping(patience=3, min_delta=0.01, mode="min")
        self.assertFalse(es.step(1.0, epoch=1))
        self.assertTrue(es.is_best)
        self.assertEqual(es.best_epoch, 1)

        self.assertFalse(es.step(0.8, epoch=2))
        self.assertTrue(es.is_best)
        self.assertEqual(es.best_epoch, 2)
        self.assertEqual(es.counter, 0)

    def test_min_mode_triggers(self):
        es = EarlyStopping(patience=2, min_delta=0.01, mode="min")
        # Epoch 1: best = 0.5
        self.assertFalse(es.step(0.5, epoch=1))
        self.assertTrue(es.is_best)

        # Epoch 2: worse (0.6), counter=1
        self.assertFalse(es.step(0.6, epoch=2))
        self.assertFalse(es.is_best)
        self.assertEqual(es.counter, 1)

        # Epoch 3: worse (0.65), counter=2 >= patience -> triggers
        triggered = es.step(0.65, epoch=3)
        self.assertTrue(triggered)
        self.assertTrue(es.early_stop)
        self.assertEqual(es.best_epoch, 1)
        self.assertEqual(es.best_score, 0.5)

    def test_max_mode_triggers(self):
        es = EarlyStopping(patience=2, min_delta=0.01, mode="max")
        # Epoch 1: best = 0.8
        self.assertFalse(es.step(0.8, epoch=1))
        self.assertTrue(es.is_best)

        # Epoch 2: improves to 0.85
        self.assertFalse(es.step(0.85, epoch=2))
        self.assertTrue(es.is_best)
        self.assertEqual(es.best_epoch, 2)

        # Epoch 3: plateau (0.855 < 0.85 + 0.01), counter=1
        self.assertFalse(es.step(0.855, epoch=3))
        self.assertFalse(es.is_best)
        self.assertEqual(es.counter, 1)

        # Epoch 4: plateau (0.84), counter=2 >= patience -> triggers
        triggered = es.step(0.84, epoch=4)
        self.assertTrue(triggered)
        self.assertEqual(es.best_epoch, 2)

    def test_reset(self):
        es = EarlyStopping(patience=2, min_delta=0.01, mode="min")
        es.step(0.5, epoch=1)
        es.step(0.6, epoch=2)
        es.step(0.7, epoch=3)
        self.assertTrue(es.early_stop)

        es.reset()
        self.assertEqual(es.counter, 0)
        self.assertIsNone(es.best_score)
        self.assertEqual(es.best_epoch, 0)
        self.assertFalse(es.early_stop)
        self.assertFalse(es.is_best)


if __name__ == "__main__":
    unittest.main()
