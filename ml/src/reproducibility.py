"""
FALCON-404: Reproducibility & Deterministic Seed Management
Phase: 7.2A.3 — Training Pipeline Development
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Enforces deterministic random seed initialization across Python random,
    NumPy, PyTorch CPU, and CUDA execution streams.
"""

import os
import random
import logging
from typing import Optional, Dict, Any

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

logger = logging.getLogger("falcon404.reproducibility")


def seed_everything(seed: int = 404, deterministic: bool = True) -> Dict[str, Any]:
    """
    Initializes seeds across all random number generators.

    Args:
        seed: Integer seed value (default 404).
        deterministic: If True, configures PyTorch and cuDNN for deterministic execution.

    Returns:
        Dictionary summarizing seed configuration.
    """
    os.environ["PYTHONHASHSEED"] = str(seed)
    random.seed(seed)

    if NUMPY_AVAILABLE:
        np.random.seed(seed)

    if TORCH_AVAILABLE:
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed(seed)
            torch.cuda.manual_seed_all(seed)

        if deterministic:
            torch.backends.cudnn.deterministic = True
            torch.backends.cudnn.benchmark = False
            try:
                torch.use_deterministic_algorithms(True, warn_only=True)
            except Exception as e:
                logger.warning(f"Could not enable strict deterministic algorithms: {e}")

    return {
        "seed": seed,
        "deterministic": deterministic,
        "torch_cuda_deterministic": deterministic if TORCH_AVAILABLE else False,
        "cudnn_benchmark": False if (TORCH_AVAILABLE and deterministic) else True
    }


def seed_worker(worker_id: int) -> None:
    """
    DataLoader worker_init_fn ensuring each worker receives a distinct but reproducible seed.
    """
    worker_seed = (torch.initial_seed() + worker_id) % (2 ** 32)
    random.seed(worker_seed)
    if NUMPY_AVAILABLE:
        np.random.seed(worker_seed)
