"""
Unit Tests for FALCON-404 Checkpoint Manager Module
Milestone: Phase 7.2A.3 — Training Pipeline Development
Author: Lead Developer & System Architect: Harshad Mane
"""

import os
import shutil
import tempfile
import unittest
import torch
import torch.nn as nn
from ml.src.checkpoint import (
    CheckpointManager,
    save_checkpoint,
    load_checkpoint,
    find_best_checkpoint,
)


class DummyModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc = nn.Linear(4, 2)

    def forward(self, x):
        return self.fc(x)


class TestCheckpointManager(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="falcon_ckpt_test_")

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_save_and_load_manager(self):
        mgr = CheckpointManager(experiment_dir=self.temp_dir, experiment_name="test_exp")
        model = DummyModel()
        optimizer = torch.optim.SGD(model.parameters(), lr=0.01)

        # Modify weight slightly so it has specific state
        with torch.no_grad():
            model.fc.weight.fill_(1.23)

        path = mgr.save_checkpoint(
            model=model,
            optimizer=optimizer,
            epoch=3,
            metrics={"val_loss": 0.45, "val_f1": 0.88},
            config={"batch_size": 16},
            is_best=True,
        )

        self.assertTrue(os.path.isfile(path))
        self.assertTrue(os.path.isfile(mgr.best_checkpoint_path))

        # Create new model and restore
        new_model = DummyModel()
        new_optimizer = torch.optim.SGD(new_model.parameters(), lr=0.01)

        loaded_data = mgr.load_checkpoint(path, new_model, new_optimizer)
        self.assertEqual(loaded_data["epoch"], 3)
        self.assertEqual(loaded_data["metrics"]["val_f1"], 0.88)
        self.assertEqual(loaded_data["config"]["batch_size"], 16)
        self.assertEqual(loaded_data["falcon_version"], "7.2A.3")

        # Verify weights match
        self.assertTrue(torch.allclose(model.fc.weight, new_model.fc.weight))

    def test_functional_save_and_load(self):
        save_file = os.path.join(self.temp_dir, "custom_sub", "model.pt")
        model = DummyModel()
        with torch.no_grad():
            model.fc.weight.fill_(0.42)

        save_checkpoint(
            model=model,
            checkpoint_path=save_file,
            epoch=5,
            metrics={"val_loss": 0.22},
        )
        self.assertTrue(os.path.isfile(save_file))

        new_model = DummyModel()
        ckpt = load_checkpoint(save_file, new_model)
        self.assertEqual(ckpt["epoch"], 5)
        self.assertTrue(torch.allclose(model.fc.weight, new_model.fc.weight))

    def test_find_best_checkpoint(self):
        mgr = CheckpointManager(experiment_dir=self.temp_dir, experiment_name="test_search")
        model = DummyModel()
        mgr.save_checkpoint(model, is_best=True)

        found = find_best_checkpoint(experiment_dir=self.temp_dir, experiment_name="test_search")
        self.assertIsNotNone(found)
        self.assertTrue(os.path.isfile(found))

    def test_missing_file_raises(self):
        mgr = CheckpointManager(experiment_dir=self.temp_dir, experiment_name="test_exp")
        model = DummyModel()
        with self.assertRaises(FileNotFoundError):
            mgr.load_checkpoint("non_existent_file.pt", model)


if __name__ == "__main__":
    unittest.main()
