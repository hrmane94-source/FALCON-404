"""
Unit Tests for FALCON-404 Training Engine Module
Milestone: Phase 7.2A.3 — Training Pipeline Development
Author: Lead Developer & System Architect: Harshad Mane
"""

import os
import shutil
import tempfile
import unittest
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from ml.src.engine import (
    train_one_epoch,
    validate_one_epoch,
    build_dataloaders,
)
from ml.configs.baseline_config import BaselineConfig


class DummyClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Conv2d(3, 8, kernel_size=3, padding=1)
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc = nn.Linear(8, 2)

    def forward(self, x):
        x = self.conv(x)
        x = self.pool(x)
        x = torch.flatten(x, 1)
        return self.fc(x)


class TestEngine(unittest.TestCase):
    def setUp(self):
        self.device = torch.device("cpu")
        self.model = DummyClassifier().to(self.device)
        self.criterion = nn.CrossEntropyLoss()
        self.optimizer = torch.optim.AdamW(self.model.parameters(), lr=0.01)

        # Create dummy tensors (4 samples, 3 channels, 32x32)
        images = torch.randn(4, 3, 32, 32)
        labels = torch.tensor([0, 1, 0, 1], dtype=torch.long)
        self.dataset = TensorDataset(images, labels)
        self.loader = DataLoader(self.dataset, batch_size=2, shuffle=False)

    def test_train_one_epoch_updates_weights(self):
        initial_weight = self.model.fc.weight.clone()

        avg_loss = train_one_epoch(
            model=self.model,
            dataloader=self.loader,
            criterion=self.criterion,
            optimizer=self.optimizer,
            device=self.device,
            scaler=None,
        )

        self.assertIsInstance(avg_loss, float)
        self.assertGreater(avg_loss, 0.0)
        # Weights must have been modified by optimizer step
        self.assertFalse(torch.allclose(initial_weight, self.model.fc.weight))

    def test_validate_one_epoch_returns_metrics(self):
        avg_loss, metrics = validate_one_epoch(
            model=self.model,
            dataloader=self.loader,
            criterion=self.criterion,
            device=self.device,
        )

        self.assertIsInstance(avg_loss, float)
        self.assertGreater(avg_loss, 0.0)
        self.assertIn("accuracy", metrics)
        self.assertIn("f1_score", metrics)
        self.assertIn("confusion_matrix", metrics)
        self.assertEqual(metrics["total_samples"], 4)

    def test_build_dataloaders_actual_dataset(self):
        config = BaselineConfig(
            dataset_dir="ml_data/FALCON_404_DATASET_v1.0",
            batch_size=8,
            dataloader_workers=0,
            pin_memory=False,
        )

        train_loader, val_loader, test_loader = build_dataloaders(config)
        self.assertIsNotNone(train_loader)
        self.assertIsNotNone(val_loader)
        self.assertIsNotNone(test_loader)

        # Check lengths
        # 840 / 8 = 105 batches
        self.assertEqual(len(train_loader.dataset), 840)
        # 180 / 8 = 23 batches (last batch 4)
        self.assertEqual(len(val_loader.dataset), 180)
        self.assertEqual(len(test_loader.dataset), 180)


if __name__ == "__main__":
    unittest.main()
