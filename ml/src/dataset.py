"""
FALCON-404: PyTorch Dataset Adapter for Document Manipulation Screening
Phase: 7.2A.1 — PyTorch Environment & Dataset Adapter
Author: Lead Developer & System Architect: Harshad Mane

Description:
    Provides a high-performance, strictly validated PyTorch Dataset adapter
    for the FALCON-404 Synthetic Document Screening Dataset (v1.0.1).

    Enforces:
    - Label mapping: genuine = 0, manipulated = 1.
    - Anti-leakage group isolation (train/validation/test partitions).
    - Strict path resolution and error trapping (never silently skip corrupted files).
    - Optional RGB image transforms and metadata extraction.
    - Full PyTorch Dataset compatibility with graceful fallback if torch is not yet installed.
"""

import os
import csv
import json
import collections
from typing import Dict, List, Tuple, Any, Optional, Callable, Union
from PIL import Image

# Graceful PyTorch Dataset inheritance
try:
    import torch
    from torch.utils.data import Dataset as TorchDataset
    TORCH_AVAILABLE = True
except ImportError:
    class TorchDataset:
        """Fallback base class when torch is not yet installed."""
        pass
    TORCH_AVAILABLE = False


# Canonical Constants
LABEL_MAP = {
    "genuine": 0,
    "manipulated": 1
}

CLASS_NAMES = ["genuine", "manipulated"]

VALID_SPLITS = frozenset({"train", "validation", "test"})

DOCUMENT_CATEGORIES = frozenset({
    "identity_documents",
    "tax_id_documents",
    "driving_credentials",
    "exam_hall_tickets",
    "kyc_documents",
    "student_id"
})

EXPECTED_IMAGE_SIZE = (640, 403)  # (width, height)
EXPECTED_TOTAL_RECORDS = 1200
EXPECTED_CLASS_COUNTS = {"genuine": 600, "manipulated": 600}
EXPECTED_SPLIT_COUNTS = {"train": 840, "validation": 180, "test": 180}
EXPECTED_CATEGORY_COUNT = 200
EXPECTED_PAIRED_GROUPS = 600


class DatasetIntegrityError(Exception):
    """Raised when dataset files, manifests, or samples violate integrity requirements."""
    pass


class FalconDocumentDataset(TorchDataset):
    """
    PyTorch Dataset adapter for FALCON-404 Document Screening Datasets.

    Args:
        dataset_root: Path to the dataset directory containing dataset_manifest.csv.
        split: One of 'train', 'validation', 'test', or None to load all records.
        transform: Optional callable transform applied to the PIL RGB image.
        target_transform: Optional callable transform applied to the integer label.
        return_metadata: If True, __getitem__ returns (image, label, metadata_dict).
                         If False (default), returns standard PyTorch (image, label).
        validate_manifest: If True, performs integrity checks on manifest rows during init.
    """

    def __init__(
        self,
        dataset_root: str,
        split: Optional[str] = None,
        transform: Optional[Callable[[Image.Image], Any]] = None,
        target_transform: Optional[Callable[[int], Any]] = None,
        return_metadata: bool = False,
        validate_manifest: bool = True
    ):
        self.dataset_root = os.path.abspath(dataset_root)
        self.manifest_path = os.path.join(self.dataset_root, "dataset_manifest.csv")
        self.split = split
        self.transform = transform
        self.target_transform = target_transform
        self.return_metadata = return_metadata

        if self.split is not None and self.split not in VALID_SPLITS:
            raise ValueError(
                f"Invalid split '{self.split}'. Expected one of: {sorted(list(VALID_SPLITS))} or None."
            )

        if not os.path.isfile(self.manifest_path):
            raise FileNotFoundError(
                f"Manifest file not found at: {self.manifest_path}. "
                "Ensure dataset_root points to a valid dataset root."
            )

        self._records: List[Dict[str, Any]] = []
        self._load_and_filter_manifest(validate=validate_manifest)

    def _load_and_filter_manifest(self, validate: bool = True):
        with open(self.manifest_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            all_rows = list(reader)

        if len(all_rows) == 0:
            raise DatasetIntegrityError(f"Manifest at {self.manifest_path} is empty.")

        for idx, row in enumerate(all_rows):
            sample_id = row.get("sample_id", "").strip()
            if not sample_id:
                raise DatasetIntegrityError(f"Manifest row {idx + 1} has missing or empty 'sample_id'.")

            cls_str = row.get("class", "").strip().lower()
            if cls_str not in LABEL_MAP:
                raise DatasetIntegrityError(
                    f"Row {idx + 1} ({sample_id}): Unknown class '{cls_str}'. "
                    f"Expected one of: {list(LABEL_MAP.keys())}."
                )

            split_str = row.get("split", "").strip().lower()
            if split_str not in VALID_SPLITS:
                raise DatasetIntegrityError(
                    f"Row {idx + 1} ({sample_id}): Invalid split '{split_str}'. "
                    f"Expected one of: {sorted(list(VALID_SPLITS))}."
                )

            # Filter by split if requested
            if self.split is not None and split_str != self.split:
                continue

            img_rel = row.get("image_path", "").strip()
            if not img_rel:
                raise DatasetIntegrityError(f"Row {idx + 1} ({sample_id}): Missing 'image_path'.")

            img_abs = os.path.join(self.dataset_root, img_rel)
            if validate and not os.path.isfile(img_abs):
                raise FileNotFoundError(
                    f"Sample {sample_id}: Referenced image does not exist: {img_abs}"
                )

            self._records.append({
                "sample_id": sample_id,
                "label": LABEL_MAP[cls_str],
                "class_name": cls_str,
                "split": split_str,
                "group_id": row.get("group_id", "").strip(),
                "document_category": row.get("document_category", "").strip(),
                "tampering_type": row.get("tampering_type", "none").strip(),
                "image_path": img_abs,
                "mask_path": os.path.join(self.dataset_root, row.get("mask_path", "").strip()),
                "ocr_annotation": os.path.join(self.dataset_root, row.get("ocr_annotation", "").strip()),
                "raw_row": row
            })

    def __len__(self) -> int:
        return len(self._records)

    def __getitem__(self, idx: int) -> Union[Tuple[Any, int], Tuple[Any, int, Dict[str, Any]]]:
        if idx < 0 or idx >= len(self._records):
            raise IndexError(f"Index {idx} out of bounds for dataset of length {len(self._records)}.")

        rec = self._records[idx]
        img_path = rec["image_path"]

        if not os.path.isfile(img_path):
            raise FileNotFoundError(f"Image not found at: {img_path} (Sample: {rec['sample_id']})")

        try:
            with Image.open(img_path) as im:
                image = im.convert("RGB")
        except Exception as e:
            raise DatasetIntegrityError(
                f"Failed to read image at {img_path} for sample {rec['sample_id']}: {e}"
            ) from e

        label = rec["label"]

        if self.transform is not None:
            image = self.transform(image)

        if self.target_transform is not None:
            label = self.target_transform(label)

        if self.return_metadata:
            meta = {
                "sample_id": rec["sample_id"],
                "class_name": rec["class_name"],
                "split": rec["split"],
                "group_id": rec["group_id"],
                "document_category": rec["document_category"],
                "tampering_type": rec["tampering_type"],
                "image_path": rec["image_path"],
                "mask_path": rec["mask_path"],
                "ocr_annotation": rec["ocr_annotation"]
            }
            return image, label, meta

        return image, label

    def get_metadata(self, idx: int) -> Dict[str, Any]:
        """Returns the full metadata dictionary for a specific index."""
        if idx < 0 or idx >= len(self._records):
            raise IndexError(f"Index {idx} out of range.")
        rec = self._records[idx]
        return {
            "sample_id": rec["sample_id"],
            "class_name": rec["class_name"],
            "label": rec["label"],
            "split": rec["split"],
            "group_id": rec["group_id"],
            "document_category": rec["document_category"],
            "tampering_type": rec["tampering_type"],
            "image_path": rec["image_path"],
            "mask_path": rec["mask_path"],
            "ocr_annotation": rec["ocr_annotation"]
        }

    def get_sample_ids(self) -> List[str]:
        """Returns the list of sample IDs in the current dataset split."""
        return [r["sample_id"] for r in self._records]

    def get_labels(self) -> List[int]:
        """Returns the integer labels for all samples in the current dataset split."""
        return [r["label"] for r in self._records]

    def get_group_ids(self) -> List[str]:
        """Returns the group IDs for all samples in the current dataset split."""
        return [r["group_id"] for r in self._records]


def validate_falcon_dataset(
    dataset_root: str,
    manifest_filename: str = "dataset_manifest.csv"
) -> Dict[str, Any]:
    """
    Performs comprehensive verification of the FALCON-404 Dataset v1.0.1 on disk.

    Validates:
      1. Exactly 1,200 expected manifest records.
      2. Perfect class balance (600 genuine, 600 manipulated).
      3. Six document categories with 200 records each.
      4. Split distributions: 840 train (70%), 180 validation (15%), 180 test (15%).
      5. Exactly 600 paired group IDs.
      6. Zero group leakage across splits.
      7. All image paths exist and have dimensions (640, 403).
      8. Label mapping integrity.
    """
    dataset_path = os.path.abspath(dataset_root)
    manifest_path = os.path.join(dataset_path, manifest_filename)

    if not os.path.isfile(manifest_path):
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    with open(manifest_path, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    total = len(rows)
    if total != EXPECTED_TOTAL_RECORDS:
        raise DatasetIntegrityError(
            f"Expected exactly {EXPECTED_TOTAL_RECORDS} records, found {total}."
        )

    class_counts = collections.Counter(r["class"].strip().lower() for r in rows)
    if class_counts != EXPECTED_CLASS_COUNTS:
        raise DatasetIntegrityError(
            f"Class distribution mismatch. Expected {EXPECTED_CLASS_COUNTS}, got {dict(class_counts)}."
        )

    split_counts = collections.Counter(r["split"].strip().lower() for r in rows)
    if split_counts != EXPECTED_SPLIT_COUNTS:
        raise DatasetIntegrityError(
            f"Split distribution mismatch. Expected {EXPECTED_SPLIT_COUNTS}, got {dict(split_counts)}."
        )

    cat_counts = collections.Counter(r["document_category"].strip() for r in rows)
    for cat in DOCUMENT_CATEGORIES:
        if cat_counts.get(cat, 0) != EXPECTED_CATEGORY_COUNT:
            raise DatasetIntegrityError(
                f"Category '{cat}' has {cat_counts.get(cat, 0)} records; expected {EXPECTED_CATEGORY_COUNT}."
            )

    # Check group isolation
    groups = collections.defaultdict(set)
    for r in rows:
        gid = r.get("group_id", "").strip()
        if not gid:
            raise DatasetIntegrityError(f"Sample {r.get('sample_id')} has an empty group_id.")
        groups[gid].add(r["split"].strip().lower())

    if len(groups) != EXPECTED_PAIRED_GROUPS:
        raise DatasetIntegrityError(
            f"Expected {EXPECTED_PAIRED_GROUPS} unique group_ids, found {len(groups)}."
        )

    leaking_groups = [g for g, s in groups.items() if len(s) > 1]
    if len(leaking_groups) > 0:
        raise DatasetIntegrityError(
            f"Anti-leakage violation: {len(leaking_groups)} groups span multiple splits: {leaking_groups[:5]}"
        )

    # Image existence and dimensions verification
    missing_images = []
    dim_mismatches = []

    for r in rows:
        sid = r["sample_id"]
        img_abs = os.path.join(dataset_path, r["image_path"].strip())
        if not os.path.isfile(img_abs):
            missing_images.append((sid, img_abs))
            continue

        try:
            with Image.open(img_abs) as im:
                if im.size != EXPECTED_IMAGE_SIZE:
                    dim_mismatches.append((sid, im.size))
        except Exception as e:
            missing_images.append((sid, str(e)))

    if len(missing_images) > 0:
        raise DatasetIntegrityError(
            f"Missing or unreadable images ({len(missing_images)}): {missing_images[:5]}"
        )

    if len(dim_mismatches) > 0:
        raise DatasetIntegrityError(
            f"Image dimension mismatches ({len(dim_mismatches)}). Expected {EXPECTED_IMAGE_SIZE}, "
            f"got: {dim_mismatches[:5]}"
        )

    return {
        "status": "PASSED",
        "total_records": total,
        "class_distribution": dict(class_counts),
        "split_distribution": dict(split_counts),
        "category_distribution": dict(cat_counts),
        "unique_groups": len(groups),
        "leaking_groups": len(leaking_groups),
        "image_size": EXPECTED_IMAGE_SIZE,
        "missing_images": len(missing_images),
        "dimension_mismatches": len(dim_mismatches)
    }
