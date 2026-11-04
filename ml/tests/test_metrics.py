"""
Unit Tests for FALCON-404 Metrics Module
Milestone: Phase 7.2A.3 — Training Pipeline Development
Author: Lead Developer & System Architect: Harshad Mane
"""

import unittest
import numpy as np
import torch
from ml.src.metrics import (
    compute_confusion_matrix,
    compute_binary_metrics,
    compute_classification_metrics,
    format_metrics_summary,
)


class TestMetrics(unittest.TestCase):
    def test_perfect_classification(self):
        y_true = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]
        y_pred = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]
        metrics = compute_binary_metrics(y_true, y_pred)

        self.assertEqual(metrics["total_samples"], 10)
        self.assertEqual(metrics["accuracy"], 1.0)
        self.assertEqual(metrics["balanced_accuracy"], 1.0)
        self.assertEqual(metrics["precision"], 1.0)
        self.assertEqual(metrics["recall"], 1.0)
        self.assertEqual(metrics["f1_score"], 1.0)
        self.assertEqual(metrics["specificity"], 1.0)
        self.assertEqual(metrics["confusion_matrix"], {"tn": 5, "fp": 0, "fn": 0, "tp": 5})

    def test_imperfect_classification(self):
        # 4 genuine (0), 4 manipulated (1)
        # Predictions:
        # genuine: 3 correct (TN=3), 1 false positive (FP=1)
        # manipulated: 2 correct (TP=2), 2 false negatives (FN=2)
        y_true = [0, 0, 0, 0, 1, 1, 1, 1]
        y_pred = [0, 0, 0, 1, 0, 0, 1, 1]
        metrics = compute_binary_metrics(y_true, y_pred)

        self.assertEqual(metrics["total_samples"], 8)
        self.assertEqual(metrics["confusion_matrix"], {"tn": 3, "fp": 1, "fn": 2, "tp": 2})
        # Accuracy: (3 + 2) / 8 = 5/8 = 0.625
        self.assertEqual(metrics["accuracy"], 0.625)
        # Precision (manipulated): TP / (TP + FP) = 2 / 3 = 0.666667
        self.assertAlmostEqual(metrics["precision"], 2 / 3, places=5)
        # Recall (manipulated): TP / (TP + FN) = 2 / 4 = 0.5
        self.assertEqual(metrics["recall"], 0.5)
        # Specificity (genuine recall): TN / (TN + FP) = 3 / 4 = 0.75
        self.assertEqual(metrics["specificity"], 0.75)
        # Balanced Accuracy: (0.5 + 0.75) / 2 = 0.625
        self.assertEqual(metrics["balanced_accuracy"], 0.625)

    def test_zero_division_safety_all_genuine(self):
        # All samples are genuine (0), model predicts all genuine (0)
        # TP=0, FP=0, FN=0 -> Precision (TP / (TP+FP)) is 0 / 0
        y_true = [0, 0, 0, 0]
        y_pred = [0, 0, 0, 0]
        metrics = compute_binary_metrics(y_true, y_pred)

        self.assertEqual(metrics["precision"], 0.0)
        self.assertEqual(metrics["recall"], 0.0)
        self.assertEqual(metrics["f1_score"], 0.0)
        self.assertEqual(metrics["specificity"], 1.0)
        self.assertEqual(metrics["accuracy"], 1.0)

    def test_zero_division_safety_all_manipulated(self):
        # All samples are manipulated (1), model predicts all manipulated (1)
        # TN=0, FN=0, FP=0 -> Specificity (TN / (TN+FP)) is 0 / 0
        y_true = [1, 1, 1, 1]
        y_pred = [1, 1, 1, 1]
        metrics = compute_binary_metrics(y_true, y_pred)

        self.assertEqual(metrics["precision"], 1.0)
        self.assertEqual(metrics["recall"], 1.0)
        self.assertEqual(metrics["f1_score"], 1.0)
        self.assertEqual(metrics["specificity"], 0.0)
        self.assertEqual(metrics["accuracy"], 1.0)

    def test_empty_input(self):
        metrics = compute_binary_metrics([], [])
        self.assertEqual(metrics["total_samples"], 0)
        self.assertEqual(metrics["accuracy"], 0.0)
        self.assertEqual(metrics["f1_score"], 0.0)

    def test_mismatched_length(self):
        with self.assertRaises(ValueError):
            compute_binary_metrics([0, 1], [0])

    def test_torch_tensor_inputs(self):
        y_true = torch.tensor([0, 1, 0, 1])
        y_pred = torch.tensor([0, 1, 1, 0])
        metrics = compute_binary_metrics(y_true, y_pred)
        self.assertEqual(metrics["total_samples"], 4)
        self.assertEqual(metrics["confusion_matrix"], {"tn": 1, "fp": 1, "fn": 1, "tp": 1})

    def test_alias_equivalence(self):
        y_true = [0, 1, 0, 1]
        y_pred = [0, 1, 0, 0]
        m1 = compute_binary_metrics(y_true, y_pred)
        m2 = compute_classification_metrics(y_true, y_pred)
        self.assertEqual(m1, m2)

    def test_format_metrics_summary(self):
        y_true = [0, 1, 0, 1]
        y_pred = [0, 1, 0, 1]
        metrics = compute_binary_metrics(y_true, y_pred)
        summary = format_metrics_summary(metrics)
        self.assertIn("Accuracy:", summary)
        self.assertIn("Confusion Matrix:", summary)
        self.assertIn("TN=2", summary)
        self.assertIn("TP=2", summary)


if __name__ == "__main__":
    unittest.main()
