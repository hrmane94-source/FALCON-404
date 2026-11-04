"""
FALCON-404: Machine Learning Source Package
Milestone: Phase 7.2A — AI/ML Document Manipulation Detection
Author: Lead Developer & System Architect: Harshad Mane
"""

from .dataset import (
    FalconDocumentDataset,
    validate_falcon_dataset,
    DatasetIntegrityError,
    LABEL_MAP,
    CLASS_NAMES,
    VALID_SPLITS,
    EXPECTED_IMAGE_SIZE,
    EXPECTED_TOTAL_RECORDS,
)

__all__ = [
    "FalconDocumentDataset",
    "validate_falcon_dataset",
    "DatasetIntegrityError",
    "LABEL_MAP",
    "CLASS_NAMES",
    "VALID_SPLITS",
    "EXPECTED_IMAGE_SIZE",
    "EXPECTED_TOTAL_RECORDS",
]
