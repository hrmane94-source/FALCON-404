"""
FALCON-404: Experiment Metrics & Metadata Logger
Phase: 7.2A.3 — Training Pipeline Development
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Records granular epoch-by-epoch training and validation metrics to CSV,
    and serializes comprehensive experiment configurations and hardware metadata to JSON.
"""

import os
import csv
import json
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List


class ExperimentLogger:
    """
    Logs experiment metrics and metadata to structured CSV and JSON files.

    Args:
        experiment_dir: Base directory for experiments (e.g. ml/experiments).
        experiment_name: Unique name or subfolder for the experiment run.
    """

    CSV_HEADER = [
        "epoch",
        "train_loss",
        "val_loss",
        "accuracy",
        "balanced_accuracy",
        "precision",
        "recall",
        "specificity",
        "f1_score",
        "macro_f1",
        "tn",
        "fp",
        "fn",
        "tp",
        "learning_rate",
        "epoch_duration_sec",
        "is_best",
        "early_stopped"
    ]

    def __init__(self, experiment_dir: str = "ml/experiments", experiment_name: str = "baseline"):
        self.experiment_dir = os.path.abspath(experiment_dir)
        self.experiment_name = experiment_name
        self.log_dir = os.path.join(self.experiment_dir, self.experiment_name, "logs")
        os.makedirs(self.log_dir, exist_ok=True)

        self.csv_path = os.path.join(self.log_dir, "epoch_metrics.csv")
        self.meta_path = os.path.join(self.log_dir, "experiment_meta.json")

        self._init_csv()

    def _init_csv(self) -> None:
        """Initializes CSV header if file does not exist."""
        if not os.path.isfile(self.csv_path):
            with open(self.csv_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(self.CSV_HEADER)

    def log_epoch(
        self,
        epoch: int,
        train_loss: float,
        val_loss: float,
        metrics: Dict[str, Any],
        learning_rate: float,
        duration_sec: float,
        is_best: bool = False,
        early_stopped: bool = False
    ) -> None:
        """Appends an epoch metrics row to CSV."""
        cm = metrics.get("confusion_matrix", {"tn": 0, "fp": 0, "fn": 0, "tp": 0})
        row = [
            epoch,
            f"{train_loss:.6f}",
            f"{val_loss:.6f}",
            f"{metrics.get('accuracy', 0.0):.6f}",
            f"{metrics.get('balanced_accuracy', 0.0):.6f}",
            f"{metrics.get('precision', 0.0):.6f}",
            f"{metrics.get('recall', 0.0):.6f}",
            f"{metrics.get('specificity', 0.0):.6f}",
            f"{metrics.get('f1_score', 0.0):.6f}",
            f"{metrics.get('macro_f1', 0.0):.6f}",
            cm.get("tn", 0),
            cm.get("fp", 0),
            cm.get("fn", 0),
            cm.get("tp", 0),
            f"{learning_rate:.8f}",
            f"{duration_sec:.2f}",
            int(is_best),
            int(early_stopped)
        ]

        with open(self.csv_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(row)

    def log_metadata(
        self,
        config: Dict[str, Any],
        device_info: Dict[str, Any],
        dataset_info: Optional[Dict[str, Any]] = None,
        final_summary: Optional[Dict[str, Any]] = None
    ) -> None:
        """Writes comprehensive experiment metadata to JSON."""
        meta = {
            "experiment_name": self.experiment_name,
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "config": config,
            "device_info": device_info,
            "dataset_info": dataset_info or {},
            "final_summary": final_summary or {}
        }

        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)


# Alias for API compatibility
TrainingLogger = ExperimentLogger

