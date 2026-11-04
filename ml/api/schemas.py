"""
FALCON-404: Inference Service Pydantic Schemas
Milestone: Phase 7.3 — ML Model Integration
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Declares strict request and response schemas for FastAPI endpoints.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check endpoint response schema."""
    status: str = Field(..., description="Service status ('HEALTHY', 'DEGRADED', 'UNHEALTHY')")
    service: str = Field(default="FALCON-404 ML Inference Service")
    version: str = Field(default="1.0.0")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    model_loaded: bool = Field(..., description="True if PyTorch model is initialized and ready")
    model_architecture: str = Field(..., description="Model architecture descriptor")
    model_identifier: str = Field(..., description="Unique model experiment and version ID")
    checkpoint_identifier: str = Field(..., description="Name or relative identifier of active checkpoint")
    checkpoint_epoch: Optional[int] = Field(None, description="Trained epoch index of loaded checkpoint")
    device: str = Field(..., description="Execution device ('cuda:0', 'cpu', etc.)")


class PredictionResponse(BaseModel):
    """Document tampering classification response schema."""
    predicted_class: str = Field(
        ...,
        description="Categorical status: 'GENUINE', 'MANIPULATED', 'NEEDS_REVIEW', or 'ERROR'"
    )
    genuine_probability: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model softmax probability that document is genuine (Class 0)"
    )
    manipulated_probability: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model softmax probability that document is manipulated (Class 1)"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence magnitude of predicted class"
    )
    tampering_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Tampering suspicion score equivalent to manipulated_probability"
    )
    decision_threshold: float = Field(
        ...,
        description="Decision threshold used to separate genuine from manipulated"
    )
    review_band: List[float] = Field(
        ...,
        description="Probability interval [lower, upper] requiring human analyst review"
    )
    processing_time_ms: float = Field(
        ...,
        ge=0.0,
        description="End-to-end inference execution latency in milliseconds"
    )
    device: str = Field(
        ...,
        description="Execution device used for tensor computation"
    )
    model_identifier: str = Field(
        ...,
        description="Identifier of model checkpoint used for screening"
    )
    screening_disclaimer: str = Field(
        ...,
        description="Mandatory scientific governance and legal disclaimer"
    )


class ErrorDetail(BaseModel):
    """Detailed error object."""
    code: str = Field(..., description="Standardized error code")
    message: str = Field(..., description="Human-readable error description")
    timestamp: str = Field(..., description="ISO 8601 timestamp")


class ErrorResponse(BaseModel):
    """Standardized API error envelope."""
    error: ErrorDetail
