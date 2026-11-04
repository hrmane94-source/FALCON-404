"""
FALCON-404: Machine Learning Inference Service Configuration
Milestone: Phase 7.3 — ML Model Integration
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Provides centralized environment-aware configuration for the FastAPI
    MobileNetV3-Small document manipulation inference service.
"""

import os
from typing import List


class Settings:
    """Inference service settings loaded from environment variables with safe defaults."""

    # Server Network Binding
    HOST: str = os.getenv("ML_API_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("ML_API_PORT", "8000"))

    # Model & Checkpoint
    DEFAULT_CHECKPOINT: str = os.path.join(
        "ml", "experiments", "exp_20261104_falcon404_final_model", "best_model.pt"
    )
    CHECKPOINT_PATH: str = os.getenv("ML_CHECKPOINT_PATH", DEFAULT_CHECKPOINT)
    MODEL_ARCHITECTURE: str = "MobileNetV3-Small"
    MODEL_IDENTIFIER: str = os.getenv(
        "ML_MODEL_IDENTIFIER",
        "FALCON-404 MobileNetV3-Small (exp_20261104_falcon404_final_model)"
    )

    # Hardware Device Execution
    # Set to 'cpu', 'cuda', 'cuda:0', or None for automatic GPU detection
    DEVICE: str = os.getenv("ML_DEVICE", None)

    # Classification Thresholds
    DECISION_THRESHOLD: float = float(os.getenv("ML_DECISION_THRESHOLD", "0.50"))
    REVIEW_MARGIN: float = float(os.getenv("ML_REVIEW_MARGIN", "0.10"))

    # Upload Security Guards
    MAX_UPLOAD_BYTES: int = int(os.getenv("ML_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))  # 10 MB limit
    ALLOWED_MIME_TYPES: set = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/bmp",
        "image/tiff"
    }

    # CORS Origins (Restricted to Node server and React frontend by default)
    CORS_ORIGINS_RAW: str = os.getenv(
        "ML_CORS_ORIGINS",
        "https://falcon-404.vercel.app,http://localhost:5173,http://localhost:4040,http://127.0.0.1:5173,http://127.0.0.1:4040"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS_RAW.split(",") if origin.strip()]

    # Statutory Screening Disclaimer
    SCREENING_DISCLAIMER: str = (
        "AI screening is an experimental assessment of visual document manipulation. "
        "It does not establish official document authenticity."
    )


settings = Settings()
