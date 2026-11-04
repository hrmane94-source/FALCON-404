"""
FALCON-404: Early Stopping Controller
Phase: 7.2A.3 — Training Pipeline Development
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Monitors validation performance to halt training when optimization plateaus,
    preventing overfitting and conserving computational resources.
"""

from typing import Optional


class EarlyStopping:
    """
    Early stopping monitor.

    Args:
        patience: Number of epochs to wait without improvement before stopping.
        min_delta: Minimum relative change required to qualify as an improvement.
        mode: 'min' for loss, 'max' for metrics like F1 or accuracy.
    """

    def __init__(
        self,
        patience: int = 7,
        min_delta: float = 0.0005,
        mode: str = "min"
    ):
        if patience <= 0:
            raise ValueError(f"patience must be > 0, got {patience}")
        if mode not in {"min", "max"}:
            raise ValueError(f"mode must be 'min' or 'max', got {mode}")

        self.patience = patience
        self.min_delta = min_delta
        self.mode = mode

        self.counter: int = 0
        self.best_score: Optional[float] = None
        self.best_epoch: int = 0
        self.early_stop: bool = False
        self.is_best: bool = False

    def step(self, current_metric: float, epoch: int) -> bool:
        """
        Updates monitor state with the current epoch's metric.

        Args:
            current_metric: Validation metric value (e.g. val_loss).
            epoch: Current 1-based epoch index.

        Returns:
            True if early stopping criterion has been triggered, False otherwise.
        """
        score = current_metric

        if self.best_score is None:
            self.best_score = score
            self.best_epoch = epoch
            self.is_best = True
            self.counter = 0
            return False

        improvement = False
        if self.mode == "min":
            if score < (self.best_score - self.min_delta):
                improvement = True
        else:  # mode == "max"
            if score > (self.best_score + self.min_delta):
                improvement = True

        if improvement:
            self.best_score = score
            self.best_epoch = epoch
            self.is_best = True
            self.counter = 0
        else:
            self.is_best = False
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True

        return self.early_stop

    def reset(self) -> None:
        """Resets the early stopping tracker."""
        self.counter = 0
        self.best_score = None
        self.best_epoch = 0
        self.early_stop = False
        self.is_best = False
