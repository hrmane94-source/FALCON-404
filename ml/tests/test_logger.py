"""
Unit Tests for FALCON-404 Experiment Logger Module
Milestone: Phase 7.2A.3 — Training Pipeline Development
Author: Lead Developer & System Architect: Harshad Mane
"""

import os
import csv
import json
import shutil
import tempfile
import unittest
from ml.src.logger import ExperimentLogger, TrainingLogger


class TestLogger(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="falcon_logger_test_")

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_init_creates_csv_header(self):
        logger = ExperimentLogger(experiment_dir=self.temp_dir, experiment_name="exp1")
        self.assertTrue(os.path.isfile(logger.csv_path))

        with open(logger.csv_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader)
            self.assertEqual(header, ExperimentLogger.CSV_HEADER)

    def test_log_epoch(self):
        logger = ExperimentLogger(experiment_dir=self.temp_dir, experiment_name="exp2")
        metrics = {
            "accuracy": 0.85,
            "balanced_accuracy": 0.84,
            "precision": 0.88,
            "recall": 0.82,
            "specificity": 0.86,
            "f1_score": 0.85,
            "macro_f1": 0.845,
            "confusion_matrix": {"tn": 43, "fp": 7, "fn": 9, "tp": 41},
        }
        logger.log_epoch(
            epoch=1,
            train_loss=0.354,
            val_loss=0.312,
            metrics=metrics,
            learning_rate=0.0005,
            duration_sec=12.4,
            is_best=True,
            early_stopped=False,
        )

        with open(logger.csv_path, "r", encoding="utf-8") as f:
            rows = list(csv.reader(f))
            self.assertEqual(len(rows), 2)  # header + 1 data row
            row = rows[1]
            self.assertEqual(row[0], "1")  # epoch
            self.assertEqual(row[1], "0.354000")  # train_loss
            self.assertEqual(row[2], "0.312000")  # val_loss
            self.assertEqual(row[16], "1")  # is_best
            self.assertEqual(row[17], "0")  # early_stopped

    def test_log_metadata(self):
        logger = TrainingLogger(experiment_dir=self.temp_dir, experiment_name="exp3")
        config = {"batch_size": 16, "lr": 1e-4}
        device_info = {"device": "cuda:0", "cuda_available": True}
        logger.log_metadata(
            config=config,
            device_info=device_info,
            final_summary={"best_epoch": 5, "best_val_loss": 0.25},
        )

        self.assertTrue(os.path.isfile(logger.meta_path))
        with open(logger.meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
            self.assertEqual(meta["experiment_name"], "exp3")
            self.assertEqual(meta["config"]["batch_size"], 16)
            self.assertEqual(meta["device_info"]["device"], "cuda:0")
            self.assertEqual(meta["final_summary"]["best_epoch"], 5)


if __name__ == "__main__":
    unittest.main()
