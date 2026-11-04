"""
FALCON-404: Hardware Device Management
Phase: 7.2A.2 — Model Architecture & Image Preprocessing
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Provides robust, hardware-agnostic device selection and diagnostics
    for the FALCON-404 deep-learning pipeline.

    Supports:
    - Automatic CUDA acceleration on GPU-equipped systems (e.g. RTX 4050).
    - Transparent fallback to CPU on systems without CUDA.
    - Explicit device preference overrides (e.g., forcing 'cpu' for debugging).
    - Safe exception handling during CUDA initialization.
"""

import logging
from typing import Dict, Any, Optional

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

logger = logging.getLogger("falcon404.device")


def is_cuda_available() -> bool:
    """Safely checks whether CUDA acceleration is usable without raising errors."""
    if not TORCH_AVAILABLE:
        return False
    try:
        return bool(torch.cuda.is_available() and torch.cuda.device_count() > 0)
    except Exception as e:
        logger.warning(f"Error checking CUDA availability: {e}. Falling back to CPU.")
        return False


def get_device(preference: Optional[str] = None) -> "torch.device":
    """
    Selects and returns the optimal execution device.

    Args:
        preference: Optional explicit device string (e.g., 'cuda', 'cuda:0', 'cpu').
                    If None, automatically selects CUDA if available, else CPU.

    Returns:
        torch.device instance representing the chosen device.
    """
    if not TORCH_AVAILABLE:
        raise RuntimeError("PyTorch is not installed. Cannot initialize device.")

    if preference is not None:
        pref_lower = preference.strip().lower()
        if pref_lower.startswith("cuda"):
            if is_cuda_available():
                try:
                    dev = torch.device(preference)
                    # Test tensor allocation to verify device readiness
                    _ = torch.zeros(1, device=dev)
                    return dev
                except Exception as e:
                    logger.warning(
                        f"Requested CUDA device '{preference}' failed readiness check: {e}. "
                        "Falling back to CPU."
                    )
                    return torch.device("cpu")
            else:
                logger.warning(
                    f"CUDA was requested ('{preference}') but is not available on this system. "
                    "Falling back to CPU."
                )
                return torch.device("cpu")
        elif pref_lower == "cpu":
            return torch.device("cpu")
        else:
            return torch.device(preference)

    # Automatic selection
    if is_cuda_available():
        try:
            dev = torch.device("cuda:0")
            _ = torch.zeros(1, device=dev)
            return dev
        except Exception as e:
            logger.warning(f"CUDA initialization error: {e}. Falling back to CPU.")
            return torch.device("cpu")

    return torch.device("cpu")


def get_device_name(device: Optional["torch.device"] = None) -> str:
    """
    Returns the descriptive name of the device (e.g. 'NVIDIA GeForce RTX 4050 Laptop GPU' or 'CPU').
    """
    if not TORCH_AVAILABLE:
        return "PyTorch Not Installed"

    target_dev = device or get_device()
    if target_dev.type == "cuda":
        try:
            dev_idx = target_dev.index if target_dev.index is not None else 0
            return torch.cuda.get_device_name(dev_idx)
        except Exception:
            return "CUDA Device (Name Unavailable)"
    return "CPU"


def get_device_info() -> Dict[str, Any]:
    """
    Returns detailed diagnostics regarding the available compute environment.
    """
    if not TORCH_AVAILABLE:
        return {
            "torch_available": False,
            "device": "unavailable",
            "cuda_available": False
        }

    dev = get_device()
    cuda_avail = is_cuda_available()
    info: Dict[str, Any] = {
        "torch_available": True,
        "selected_device": str(dev),
        "device_type": dev.type,
        "device_name": get_device_name(dev),
        "cuda_available": cuda_avail,
        "cuda_device_count": torch.cuda.device_count() if cuda_avail else 0,
    }

    if cuda_avail:
        try:
            idx = dev.index if dev.index is not None else 0
            props = torch.cuda.get_device_properties(idx)
            info["cuda_device_index"] = idx
            info["total_memory_gb"] = round(props.total_memory / (1024 ** 3), 2)
            info["cuda_capability"] = f"{props.major}.{props.minor}"
        except Exception as e:
            info["cuda_properties_error"] = str(e)

    return info
