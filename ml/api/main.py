"""
FALCON-404: Fast, Secure ML Inference Microservice
Milestone: Phase 7.3 — ML Model Integration
Author: Lead Developer & System Architect: Harshad Mane

Description:
    FastAPI service hosting the trained MobileNetV3-Small Document Manipulation
    Classifier for the FALCON-404 document screening pipeline.

Endpoints:
    - GET  /health   -> Service and model status telemetry
    - POST /predict  -> Single-document visual tampering screening
"""

import os
import sys
import io
import time
import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

# Ensure project root is available on sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.api.config import settings
from ml.api.schemas import HealthResponse, PredictionResponse, ErrorResponse, ErrorDetail
from ml.src.inference import FalconDocumentClassifier

# Configure structured logging without logging document pixel payloads or paths
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [falcon404.api]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("falcon404.api")


# Global classifier reference loaded once during service lifespan
classifier: Optional[FalconDocumentClassifier] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes and pre-warms the ML classifier once on application startup."""
    global classifier
    logger.info("Initializing FALCON-404 ML Inference Service...")

    checkpoint_abs = os.path.abspath(os.path.join(PROJECT_ROOT, settings.CHECKPOINT_PATH))
    logger.info(f"Target Checkpoint: {checkpoint_abs}")
    logger.info(f"Target Device:     {settings.DEVICE or 'AUTO-DETECT'}")

    try:
        classifier = FalconDocumentClassifier(
            checkpoint_path=checkpoint_abs,
            device=settings.DEVICE,
            decision_threshold=settings.DECISION_THRESHOLD,
            review_margin=settings.REVIEW_MARGIN
        )

        # Warm-up pass with a synthetic canvas to prime CUDA / CPU graph
        warmup_img = Image.new("RGB", (224, 224), color=(200, 200, 200))
        warmup_res = classifier.predict_image(warmup_img)
        logger.info(
            f"Model loaded and warmed up successfully on device [{classifier.device}]. "
            f"Warmup Latency: {warmup_res['inference_time_ms']:.2f}ms. "
            f"Checkpoint Epoch: {classifier.checkpoint_epoch}."
        )
    except Exception as exc:
        logger.critical(f"FATAL: Failed to load model checkpoint: {exc}", exc_info=True)
        classifier = None

    yield

    logger.info("Shutting down FALCON-404 ML Inference Service...")


app = FastAPI(
    title="FALCON-404 ML Inference API",
    description="Deep Learning Document Manipulation Screening Service (MobileNetV3-Small)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"]
)


def create_error_response(status_code: int, code: str, message: str) -> JSONResponse:
    """Helper to return uniform JSON error responses without stack traces."""
    content = ErrorResponse(
        error=ErrorDetail(
            code=code,
            message=message,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    ).model_dump()
    return JSONResponse(status_code=status_code, content=content)


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Service & Model Health Telemetry",
    tags=["System"]
)
async def get_health():
    """
    Returns the real-time operational status of the service, model loading state,
    architecture, compute device, and checkpoint version.
    """
    model_loaded = classifier is not None and classifier.model is not None
    service_status = "HEALTHY" if model_loaded else "UNHEALTHY"

    return HealthResponse(
        status=service_status,
        service="FALCON-404 ML Inference Service",
        version="1.0.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        model_loaded=model_loaded,
        model_architecture=settings.MODEL_ARCHITECTURE,
        model_identifier=settings.MODEL_IDENTIFIER,
        checkpoint_identifier=os.path.basename(settings.CHECKPOINT_PATH),
        checkpoint_epoch=classifier.checkpoint_epoch if classifier else None,
        device=str(classifier.device) if classifier else "UNAVAILABLE"
    )


@app.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Screen Document for Tampering",
    tags=["Forensics"]
)
async def predict_document_manipulation(
    file: UploadFile = File(..., description="Document image file (JPEG, PNG, WebP, BMP, TIFF)")
):
    """
    Performs AI document tampering screening on the uploaded image.

    Validates:
    - Maximum upload size (10 MB).
    - MIME type and image integrity.
    - Zero permanent disk storage (processed strictly in volatile RAM).

    Returns:
    - Categorical classification: GENUINE, MANIPULATED, NEEDS_REVIEW, or ERROR.
    - Softmax probabilities and confidence score.
    - Execution latency.
    - Mandatory scientific governance disclaimer.
    """
    if classifier is None or classifier.model is None:
        return create_error_response(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="MODEL_NOT_READY",
            message="Model checkpoint is not loaded. Please verify service health."
        )

    # 1. MIME Type Validation
    content_type = (file.content_type or "").lower().strip()
    if content_type not in settings.ALLOWED_MIME_TYPES:
        return create_error_response(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            code="UNSUPPORTED_IMAGE_FORMAT",
            message=(
                f"Unsupported file format '{content_type}'. "
                f"Accepted formats: {', '.join(sorted(settings.ALLOWED_MIME_TYPES))}."
            )
        )

    # 2. Payload Size & Safe Chunked Reading
    raw_buffer = bytearray()
    max_bytes = settings.MAX_UPLOAD_BYTES

    try:
        while chunk := await file.read(64 * 1024):  # 64 KB chunks
            raw_buffer.extend(chunk)
            if len(raw_buffer) > max_bytes:
                return create_error_response(
                    status_code=413,
                    code="PAYLOAD_TOO_LARGE",
                    message=f"Uploaded image exceeds the maximum allowed size of {max_bytes // (1024*1024)} MB."
                )
    except Exception as read_err:
        logger.error(f"Error reading upload stream: {read_err}")
        return create_error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="UPLOAD_READ_ERROR",
            message="Failed to read uploaded image stream."
        )
    finally:
        await file.close()

    if len(raw_buffer) == 0:
        return create_error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="EMPTY_PAYLOAD",
            message="Uploaded image payload is empty (0 bytes)."
        )

    # 3. Content Integrity Verification via Pillow
    try:
        img_bytes = bytes(raw_buffer)
        image_stream = io.BytesIO(img_bytes)
        with Image.open(image_stream) as im:
            im.verify()  # Verifies file integrity without decoding full raster

        # Re-open stream for full decoding and RGB normalization
        image_stream.seek(0)
        with Image.open(image_stream) as im:
            pil_image = im.convert("RGB")
    except Exception as img_err:
        logger.warning(f"Rejected invalid or corrupted image upload: {img_err}")
        return create_error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="CORRUPT_OR_INVALID_IMAGE",
            message="Uploaded file is not a valid or readable image bitmap."
        )

    # 4. Model Forward Pass
    try:
        result = classifier.predict_image(pil_image)
    except Exception as inf_err:
        logger.error(f"Model forward pass exception: {inf_err}", exc_info=True)
        return create_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INFERENCE_FAILED",
            message="An error occurred during neural network tensor evaluation."
        )

    if result.get("status") == "ERROR":
        return create_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INFERENCE_ERROR",
            message=result.get("error") or "Unknown classification error."
        )

    # 5. Format Structured Response
    return PredictionResponse(
        predicted_class=result["status"],
        genuine_probability=result["probabilities"]["genuine"],
        manipulated_probability=result["probabilities"]["manipulated"],
        confidence=result["confidence"],
        tampering_score=result["tampering_score"],
        decision_threshold=result["decision_threshold"],
        review_band=result["review_band"],
        processing_time_ms=result["inference_time_ms"],
        device=result["device"],
        model_identifier=settings.MODEL_IDENTIFIER,
        screening_disclaimer=settings.SCREENING_DISCLAIMER
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "ml.api.main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level="info"
    )
