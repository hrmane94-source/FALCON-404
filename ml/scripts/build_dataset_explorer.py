"""
FALCON-404: Offline Dataset Explorer & Report Generator (Phase 7.1B)
Author: Harshad Mane (FALCON-404)
Description:
    Standalone, offline-first tool to inspect, validate, and generate comprehensive
    HTML visual galleries, contact sheets, and audit summaries for:
      1. Synthetic Test Dataset (ml_data/phase7_synthetic/)
      2. Team Research Dataset (ml_data/real_training_dataset/)

Security & Architectural Guarantees:
    - Zero-fallback guarantee: Never falls back to synthetic data if real data is empty.
    - True offline: 0 CDN calls, 0 remote fonts, 0 network requests.
    - Path traversal protection: Rejects any path escaping the selected dataset root.
    - Strict HTML escaping for all manifest strings.
"""

import os
import sys
import io
import json
import csv
import html
import time
import argparse
import datetime
from typing import Dict, List, Tuple, Any, Optional, Set
from PIL import Image, ImageDraw, ImageFont


# -----------------------------------------------------------------------------
# Data Models
# -----------------------------------------------------------------------------
class UnifiedSampleRecord:
    """Standardized internal representation of a sample record."""

    def __init__(
        self,
        sample_id: str,
        source_id: str,
        label: str,
        manipulation_type: str,
        image_path: str,
        original_image_path: Optional[str] = None,
        mask_path: Optional[str] = None,
        template_family: str = "unknown",
        split: str = "unassigned",
        review_status: str = "unreviewed",
        provenance: str = "unknown",
        license_info: str = "unknown",
        capture_device: str = "unspecified",
        capture_condition: str = "unspecified",
        image_width: Optional[int] = None,
        image_height: Optional[int] = None,
        altered_pixels: int = 0,
        notes: str = ""
    ):
        self.sample_id = sample_id
        self.source_id = source_id
        self.label = label
        self.manipulation_type = manipulation_type or "none"
        self.image_path = image_path
        self.original_image_path = original_image_path
        self.mask_path = mask_path
        self.template_family = template_family or "unknown"
        self.split = split or "unassigned"
        self.review_status = review_status or "unreviewed"
        self.provenance = provenance or "unknown"
        self.license_info = license_info or "unknown"
        self.capture_device = capture_device or "unspecified"
        self.capture_condition = capture_condition or "unspecified"
        self.image_width = image_width
        self.image_height = image_height
        self.altered_pixels = altered_pixels
        self.notes = notes

        # Resolved flags & file existence
        self.image_exists = False
        self.mask_exists = False
        self.original_exists = False
        self.path_traversal_flag = False
        self.dimension_mismatch = False


# -----------------------------------------------------------------------------
# Font & Helper Utilities
# -----------------------------------------------------------------------------
def get_explorer_font(size: int = 12, bold: bool = False) -> ImageFont.ImageFont:
    """Loads system font with safe fallback to PIL default."""
    names = ["arial.ttf", "segoeui.ttf", "DejaVuSans.ttf"]
    if bold:
        names = ["arialbd.ttf", "segoeuib.ttf", "DejaVuSans-Bold.ttf"] + names

    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except (IOError, OSError):
            continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def is_path_safe(base_dir: str, rel_path: str) -> bool:
    """Ensures relative path resolves strictly inside base_dir."""
    if not rel_path or not rel_path.strip():
        return True
    try:
        base_abs = os.path.realpath(os.path.abspath(base_dir))
        target_abs = os.path.realpath(os.path.abspath(os.path.join(base_dir, rel_path)))
        return os.path.commonpath([base_abs, target_abs]) == base_abs
    except Exception:
        return False


# -----------------------------------------------------------------------------
# Schema Adapters
# -----------------------------------------------------------------------------
class DatasetAdapter:
    """Detects manifest schema and normalizes records into UnifiedSampleRecord."""

    @staticmethod
    def detect_and_parse(dataset_dir: str, log_fn=print) -> Tuple[str, List[UnifiedSampleRecord], List[str]]:
        errors: List[str] = []
        records: List[UnifiedSampleRecord] = []

        # Check candidate manifest paths
        manifest_candidates = [
            os.path.join(dataset_dir, "manifests", "dataset_manifest.csv"),
            os.path.join(dataset_dir, "dataset_manifest.csv")
        ]
        manifest_path = None
        for cand in manifest_candidates:
            if os.path.isfile(cand):
                manifest_path = cand
                break

        if not manifest_path:
            log_fn(f"  No manifest file found in {dataset_dir}.")
            return "empty_or_unprepared", [], errors

        log_fn(f"  Found manifest: {manifest_path}")

        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                headers = reader.fieldnames or []
                rows = list(reader)
        except Exception as e:
            errors.append(f"Failed to read CSV manifest: {str(e)}")
            return "corrupted_manifest", [], errors

        if not rows:
            log_fn("  Manifest contains header only (0 sample records).")
            return "empty_manifest", [], errors

        # Determine schema format
        if "source_doc_id" in headers:
            schema_type = "team_research_dataset"
            log_fn(f"  Identified Schema: Team Research Dataset ({len(rows)} records)")
            for r in rows:
                rec = UnifiedSampleRecord(
                    sample_id=r.get("sample_id", "").strip(),
                    source_id=r.get("source_doc_id", "").strip(),
                    label=r.get("label", "").strip(),
                    manipulation_type=r.get("manipulation_type", "none").strip(),
                    image_path=r.get("image_path", "").strip(),
                    original_image_path=r.get("original_image_path", "").strip() or None,
                    mask_path=r.get("mask_path", "").strip() or None,
                    template_family=r.get("template_family", "unknown").strip(),
                    split=r.get("split", "unassigned").strip(),
                    review_status=r.get("review_status", "pending_review").strip(),
                    provenance=r.get("provenance", "team_capture").strip(),
                    license_info=r.get("license_or_permission", "internal_research").strip(),
                    capture_device=r.get("capture_device", "").strip(),
                    capture_condition=r.get("capture_condition", "").strip(),
                    image_width=int(r.get("image_width")) if r.get("image_width") and r.get("image_width").isdigit() else None,
                    image_height=int(r.get("image_height")) if r.get("image_height") and r.get("image_height").isdigit() else None,
                    altered_pixels=int(r.get("altered_pixels")) if r.get("altered_pixels") and r.get("altered_pixels").isdigit() else 0,
                    notes=r.get("notes", "").strip()
                )
                records.append(rec)

        elif "source_sample_id" in headers:
            schema_type = "synthetic_test_dataset"
            log_fn(f"  Identified Schema: Synthetic Test Dataset ({len(rows)} records)")
            for r in rows:
                rec = UnifiedSampleRecord(
                    sample_id=r.get("sample_id", "").strip(),
                    source_id=r.get("source_sample_id", "").strip(),
                    label=r.get("label", "").strip(),
                    manipulation_type=r.get("manipulation_type", "none").strip(),
                    image_path=r.get("image_path", "").strip(),
                    original_image_path=None,
                    mask_path=r.get("mask_path", "").strip() or None,
                    template_family=r.get("template_type", "unknown").strip(),
                    split=r.get("split", "train").strip(),
                    review_status="synthetic_automated",
                    provenance="procedural_generator_7.1",
                    license_info="internal_test_specimen",
                    capture_device="synthetic_rasterizer",
                    capture_condition="clean_render",
                    image_width=int(r.get("image_width")) if r.get("image_width") and r.get("image_width").isdigit() else None,
                    image_height=int(r.get("image_height")) if r.get("image_height") and r.get("image_height").isdigit() else None,
                    altered_pixels=int(r.get("altered_pixel_count")) if r.get("altered_pixel_count") and r.get("altered_pixel_count").isdigit() else 0,
                    notes=f"bbox: {r.get('manipulation_bbox', '')}"
                )
                records.append(rec)
        else:
            schema_type = "generic_dataset"
            log_fn(f"  Identified Schema: Generic Manifest ({len(rows)} records)")
            for r in rows:
                rec = UnifiedSampleRecord(
                    sample_id=r.get("sample_id", "").strip(),
                    source_id=r.get("source_id", r.get("source_doc_id", r.get("source_sample_id", ""))).strip(),
                    label=r.get("label", "unknown").strip(),
                    manipulation_type=r.get("manipulation_type", "none").strip(),
                    image_path=r.get("image_path", "").strip(),
                    original_image_path=r.get("original_image_path", "").strip() or None,
                    mask_path=r.get("mask_path", "").strip() or None,
                    template_family=r.get("template_family", r.get("template_type", "unknown")).strip(),
                    split=r.get("split", "unassigned").strip()
                )
                records.append(rec)

        return schema_type, records, errors


# -----------------------------------------------------------------------------
# Dataset Explorer Core Engine
# -----------------------------------------------------------------------------
class DatasetExplorerEngine:
    """Audits dataset files, generates contact sheets/thumbnails, and compiles HTML report."""

    def __init__(
        self,
        dataset_dir: str,
        output_dir: Optional[str] = None,
        max_thumbnails: int = 80,
        thumbnail_size: int = 240
    ):
        self.dataset_dir = os.path.abspath(dataset_dir)
        self.output_dir = os.path.abspath(output_dir or os.path.join(dataset_dir, "reports"))
        self.assets_dir = os.path.join(self.output_dir, "assets")
        self.thumb_dir = os.path.join(self.assets_dir, "thumbnails")
        self.sheets_dir = os.path.join(self.assets_dir, "contact_sheets")
        self.html_file = os.path.join(self.output_dir, "dataset_report.html")
        self.summary_json = os.path.join(self.output_dir, "dataset_summary.json")
        self.log_file = os.path.join(self.output_dir, "explorer_generation.log")

        self.max_thumbnails = max_thumbnails
        self.thumbnail_size = thumbnail_size

        self.logs: List[str] = []
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def log(self, msg: str):
        print(msg)
        self.logs.append(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}")

    def build(self) -> Dict[str, Any]:
        """Main execution flow."""
        start_time = time.time()
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.thumb_dir, exist_ok=True)
        os.makedirs(self.sheets_dir, exist_ok=True)

        self.log("==================================================")
        self.log("FALCON-404 :: OFFLINE DATASET EXPLORER")
        self.log(f"Target Directory: {self.dataset_dir}")
        self.log(f"Output Directory: {self.output_dir}")
        self.log("==================================================")

        # 1. Parse manifest
        schema_type, records, parse_errors = DatasetAdapter.detect_and_parse(self.dataset_dir, log_fn=self.log)
        self.errors.extend(parse_errors)

        # 2. Check if dataset is empty
        is_empty = (len(records) == 0)
        stats: Dict[str, Any] = {}
        contact_sheet_files: List[Dict[str, str]] = []

        if is_empty:
            self.log("  Notice: Selected dataset is empty or unpopulated.")
            stats = self._compute_empty_stats(schema_type)
        else:
            # 3. Resolve files and audit integrity
            stats = self._audit_records(records)

            # 4. Generate thumbnails & contact sheets
            contact_sheet_files = self._generate_visual_assets(records)

        # 5. Build Standalone Offline HTML Report
        self._generate_html_report(schema_type, records, stats, contact_sheet_files)

        # 6. Save JSON summary and build log
        stats["schema_type"] = schema_type
        stats["dataset_directory"] = self.dataset_dir
        stats["elapsed_seconds"] = round(time.time() - start_time, 2)
        stats["generated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

        with open(self.summary_json, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2)

        with open(self.log_file, "w", encoding="utf-8") as f:
            f.write("\n".join(self.logs) + "\n")

        self.log("\nExplorer Generation Complete!")
        self.log(f"Report: {self.html_file}")
        self.log(f"Summary: {self.summary_json}")
        self.log(f"Status: {stats.get('audit_status', 'SUCCESS')}")
        return stats

    def _compute_empty_stats(self, schema_type: str) -> Dict[str, Any]:
        return {
            "total_records": 0,
            "total_images_on_disk": self._count_images_on_disk(),
            "distinct_source_specimens": 0,
            "unaltered_samples": 0,
            "altered_samples": 0,
            "available_masks": 0,
            "missing_images": 0,
            "missing_masks": 0,
            "broken_references": 0,
            "duplicate_sample_ids": 0,
            "dimension_mismatches": 0,
            "path_traversal_errors": 0,
            "labels": {},
            "manipulation_types": {},
            "splits": {},
            "template_families": {},
            "source_specimens_per_split": {},
            "audit_status": "EMPTY_OR_UNPREPARED"
        }

    def _count_images_on_disk(self) -> int:
        count = 0
        valid_exts = {".png", ".jpg", ".jpeg"}
        for root, _, files in os.walk(self.dataset_dir):
            # Skip reports directory
            if "reports" in os.path.split(root):
                continue
            for f in files:
                if os.path.splitext(f.lower())[1] in valid_exts and not f.endswith("_mask.png") and not f.endswith("_MASK.png"):
                    count += 1
        return count

    def _audit_records(self, records: List[UnifiedSampleRecord]) -> Dict[str, Any]:
        self.log("  Auditing manifest records against filesystem...")

        sample_id_set: Set[str] = set()
        duplicates: List[str] = []
        source_id_set: Set[str] = set()

        unaltered_count = 0
        altered_count = 0
        missing_images = 0
        missing_masks = 0
        broken_refs = 0
        path_traversal_errs = 0
        dim_mismatches = 0
        available_masks = 0

        label_counts: Dict[str, int] = {}
        manip_counts: Dict[str, int] = {}
        split_counts: Dict[str, int] = {}
        template_counts: Dict[str, int] = {}
        specimens_per_split: Dict[str, Set[str]] = {}

        for rec in records:
            # Check duplicate ID
            if rec.sample_id in sample_id_set:
                duplicates.append(rec.sample_id)
            sample_id_set.add(rec.sample_id)

            if rec.source_id:
                source_id_set.add(rec.source_id)

            # Classifications
            label_counts[rec.label] = label_counts.get(rec.label, 0) + 1
            manip_counts[rec.manipulation_type] = manip_counts.get(rec.manipulation_type, 0) + 1
            split_counts[rec.split] = split_counts.get(rec.split, 0) + 1
            template_counts[rec.template_family] = template_counts.get(rec.template_family, 0) + 1

            if rec.split not in specimens_per_split:
                specimens_per_split[rec.split] = set()
            if rec.source_id:
                specimens_per_split[rec.split].add(rec.source_id)

            if rec.label in ("unaltered_mock", "pristine_synthetic", "pristine"):
                unaltered_count += 1
            else:
                altered_count += 1

            # Path Traversal Check
            if not is_path_safe(self.dataset_dir, rec.image_path):
                rec.path_traversal_flag = True
                path_traversal_errs += 1
                self.errors.append(f"Security: Path traversal violation in image_path for {rec.sample_id}: {rec.image_path}")

            if rec.mask_path and not is_path_safe(self.dataset_dir, rec.mask_path):
                rec.path_traversal_flag = True
                path_traversal_errs += 1
                self.errors.append(f"Security: Path traversal violation in mask_path for {rec.sample_id}: {rec.mask_path}")

            # Check image existence
            img_abs = os.path.join(self.dataset_dir, rec.image_path)
            if not rec.path_traversal_flag and os.path.isfile(img_abs):
                rec.image_exists = True
                try:
                    with Image.open(img_abs) as im:
                        w, h = im.size
                        rec.image_width = rec.image_width or w
                        rec.image_height = rec.image_height or h
                except Exception:
                    pass
            else:
                missing_images += 1
                broken_refs += 1

            # Check original existence if applicable
            if rec.original_image_path:
                orig_abs = os.path.join(self.dataset_dir, rec.original_image_path)
                if os.path.isfile(orig_abs):
                    rec.original_exists = True
                else:
                    self.warnings.append(f"Sample {rec.sample_id}: Original image path not found on disk: {rec.original_image_path}")

            # Check mask existence
            if rec.mask_path:
                mask_abs = os.path.join(self.dataset_dir, rec.mask_path)
                if not rec.path_traversal_flag and os.path.isfile(mask_abs):
                    rec.mask_exists = True
                    available_masks += 1
                    try:
                        with Image.open(mask_abs) as m_im:
                            mw, mh = m_im.size
                            if rec.image_width and rec.image_height:
                                if (mw, mh) != (rec.image_width, rec.image_height):
                                    rec.dimension_mismatch = True
                                    dim_mismatches += 1
                                    self.errors.append(f"Sample {rec.sample_id}: Mask dimensions ({mw}x{mh}) mismatch image ({rec.image_width}x{rec.image_height})")
                    except Exception:
                        pass
                else:
                    if rec.label not in ("unaltered_mock", "pristine_synthetic", "pristine"):
                        missing_masks += 1
                        broken_refs += 1
                        self.warnings.append(f"Sample {rec.sample_id}: Mask file missing at {rec.mask_path}")

        # Check anti-leakage if splits exist
        leaked_specimens = {}
        specimen_to_splits: Dict[str, Set[str]] = {}
        for rec in records:
            if rec.source_id and rec.split != "unassigned":
                if rec.source_id not in specimen_to_splits:
                    specimen_to_splits[rec.source_id] = set()
                specimen_to_splits[rec.source_id].add(rec.split)

        for s_id, s_splits in specimen_to_splits.items():
            if len(s_splits) > 1:
                leaked_specimens[s_id] = list(s_splits)

        if leaked_specimens:
            self.errors.append(f"Data leakage detected: {len(leaked_specimens)} source specimens span multiple splits: {leaked_specimens}")

        return {
            "total_records": len(records),
            "total_images_on_disk": self._count_images_on_disk(),
            "distinct_source_specimens": len(source_id_set),
            "unaltered_samples": unaltered_count,
            "altered_samples": altered_count,
            "available_masks": available_masks,
            "missing_images": missing_images,
            "missing_masks": missing_masks,
            "broken_references": broken_refs,
            "duplicate_sample_ids": len(duplicates),
            "dimension_mismatches": dim_mismatches,
            "path_traversal_errors": path_traversal_errs,
            "labels": label_counts,
            "manipulation_types": manip_counts,
            "splits": split_counts,
            "template_families": template_counts,
            "source_specimens_per_split": {k: len(v) for k, v in specimens_per_split.items()},
            "leakage_count": len(leaked_specimens),
            "audit_status": "PASSED" if len(self.errors) == 0 else "FAILED_ISSUES_FOUND"
        }

    def _generate_visual_assets(self, records: List[UnifiedSampleRecord]) -> List[Dict[str, str]]:
        self.log("  Generating thumbnails and contact sheets...")
        sheets: List[Dict[str, str]] = []

        # 1. Generate individual thumbnails for the first N records
        processed_count = 0
        for rec in records[:self.max_thumbnails]:
            if not rec.image_exists:
                continue

            img_abs = os.path.join(self.dataset_dir, rec.image_path)
            thumb_name = f"{rec.sample_id}_thumb.jpg"
            thumb_abs = os.path.join(self.thumb_dir, thumb_name)

            try:
                with Image.open(img_abs) as im:
                    im_rgb = im.convert("RGB")
                    im_rgb.thumbnail((self.thumbnail_size, self.thumbnail_size))
                    im_rgb.save(thumb_abs, format="JPEG", quality=85)
                    processed_count += 1
            except Exception as e:
                self.warnings.append(f"Thumbnail failed for {rec.sample_id}: {str(e)}")

            # Mask thumbnail
            if rec.mask_exists and rec.mask_path:
                mask_abs = os.path.join(self.dataset_dir, rec.mask_path)
                mthumb_name = f"{rec.sample_id}_mask_thumb.png"
                mthumb_abs = os.path.join(self.thumb_dir, mthumb_name)
                try:
                    with Image.open(mask_abs) as mim:
                        mim_l = mim.convert("L")
                        mim_l.thumbnail((self.thumbnail_size, self.thumbnail_size))
                        mim_l.save(mthumb_abs, format="PNG")
                except Exception:
                    pass

        self.log(f"    Generated {processed_count} individual thumbnails.")

        # 2. Build Unaltered Contact Sheet
        unaltered_records = [r for r in records if r.image_exists and r.label in ("unaltered_mock", "pristine_synthetic", "pristine")][:24]
        if unaltered_records:
            sheet_rel = self._create_grid_contact_sheet(
                unaltered_records,
                title="UNALTERED PHYSICAL SPECIMENS // SOURCE CAPTURES",
                filename="unaltered_contact_sheet.jpg"
            )
            if sheet_rel:
                sheets.append({"title": "Unaltered Source Specimens", "rel_path": sheet_rel})

        # 3. Build Altered Contact Sheet
        altered_records = [r for r in records if r.image_exists and r.label not in ("unaltered_mock", "pristine_synthetic", "pristine")][:24]
        if altered_records:
            sheet_rel = self._create_grid_contact_sheet(
                altered_records,
                title="CONTROLLED ALTERED SPECIMENS // MANIPULATED SPECIMENS",
                filename="altered_contact_sheet.jpg"
            )
            if sheet_rel:
                sheets.append({"title": "Altered Specimens", "rel_path": sheet_rel})

        # 4. Build Paired Comparison Sheet (Original | Altered | Mask)
        comparison_rel = self._create_comparison_contact_sheet(records)
        if comparison_rel:
            sheets.append({"title": "Original vs Altered vs Mask Comparisons", "rel_path": comparison_rel})

        return sheets

    def _create_grid_contact_sheet(self, sample_subset: List[UnifiedSampleRecord], title: str, filename: str) -> Optional[str]:
        if not sample_subset:
            return None

        cols = 4
        rows = (len(sample_subset) + cols - 1) // cols
        card_w, card_h = 240, 180
        pad_x, pad_y = 16, 20
        header_h = 60

        total_w = cols * (card_w + pad_x) + pad_x
        total_h = header_h + rows * (card_h + pad_y) + pad_y

        sheet = Image.new("RGB", (total_w, total_h), (15, 23, 42)) # Navy background
        draw = ImageDraw.Draw(sheet)

        f_head = get_explorer_font(18, bold=True)
        f_sub = get_explorer_font(11, bold=False)
        f_card = get_explorer_font(11, bold=True)

        draw.text((pad_x, 14), title, fill=(248, 250, 252), font=f_head)
        draw.text((pad_x, 38), f"FALCON-404 FORENSIC AUDIT // TOTAL ITEMS: {len(sample_subset)}", fill=(148, 163, 184), font=f_sub)

        for idx, rec in enumerate(sample_subset):
            c = idx % cols
            r = idx // cols
            x = pad_x + c * (card_w + pad_x)
            y = header_h + pad_y + r * (card_h + pad_y)

            # Card background
            draw.rectangle([x, y, x + card_w, y + card_h], fill=(30, 41, 59), outline=(71, 85, 105))

            # Thumbnail inside card
            img_abs = os.path.join(self.dataset_dir, rec.image_path)
            try:
                with Image.open(img_abs) as im:
                    thumb = im.convert("RGB")
                    thumb.thumbnail((card_w - 12, card_h - 40))
                    tx = x + (card_w - thumb.width) // 2
                    ty = y + 6 + (card_h - 40 - thumb.height) // 2
                    sheet.paste(thumb, (tx, ty))
            except Exception:
                draw.text((x + 10, y + 50), "[IMAGE LOAD ERROR]", fill=(239, 68, 68), font=f_card)

            # Label banner
            lbl_text = rec.sample_id[:26]
            draw.rectangle([x, y + card_h - 26, x + card_w, y + card_h], fill=(15, 23, 42))
            draw.text((x + 6, y + card_h - 22), lbl_text, fill=(226, 232, 240), font=f_card)

        out_path = os.path.join(self.sheets_dir, filename)
        sheet.save(out_path, format="JPEG", quality=85)
        # Return path relative to reports directory
        return os.path.join("assets", "contact_sheets", filename).replace("\\", "/")

    def _create_comparison_contact_sheet(self, records: List[UnifiedSampleRecord]) -> Optional[str]:
        # Find up to 6 altered records that have an original or synthetic pair and a mask
        pairs: List[Tuple[UnifiedSampleRecord, Optional[str], Optional[str]]] = []

        # Build index of pristine/unaltered records
        unaltered_map: Dict[str, UnifiedSampleRecord] = {}
        for r in records:
            if r.label in ("unaltered_mock", "pristine_synthetic", "pristine") and r.image_exists:
                unaltered_map[r.source_id] = r

        for r in records:
            if r.label not in ("unaltered_mock", "pristine_synthetic", "pristine") and r.image_exists and r.mask_exists:
                orig_path = None
                if r.original_image_path and os.path.isfile(os.path.join(self.dataset_dir, r.original_image_path)):
                    orig_path = os.path.join(self.dataset_dir, r.original_image_path)
                elif r.source_id in unaltered_map:
                    orig_path = os.path.join(self.dataset_dir, unaltered_map[r.source_id].image_path)

                mask_abs = os.path.join(self.dataset_dir, r.mask_path)
                pairs.append((r, orig_path, mask_abs))
                if len(pairs) >= 6:
                    break

        if not pairs:
            return None

        row_h = 170
        col_w = 230
        pad = 16
        header_h = 60
        total_w = pad + 3 * (col_w + pad)
        total_h = header_h + len(pairs) * (row_h + pad) + pad

        sheet = Image.new("RGB", (total_w, total_h), (15, 23, 42))
        draw = ImageDraw.Draw(sheet)

        f_head = get_explorer_font(18, bold=True)
        f_sub = get_explorer_font(12, bold=False)
        f_col = get_explorer_font(13, bold=True)
        f_tag = get_explorer_font(10, bold=False)

        draw.text((pad, 14), "FORENSIC TRIPLET AUDIT // ORIGINAL | ALTERED | GROUND-TRUTH MASK", fill=(248, 250, 252), font=f_head)
        draw.text((pad, 38), f"FALCON-404 TRIPLET COMPARISONS // COUNT: {len(pairs)}", fill=(148, 163, 184), font=f_sub)

        for row_idx, (altered_rec, orig_abs, mask_abs) in enumerate(pairs):
            y = header_h + pad + row_idx * (row_h + pad)

            # Triplet Box
            draw.rectangle([pad, y, total_w - pad, y + row_h], fill=(30, 41, 59), outline=(71, 85, 105))

            # Column 1: Original Image
            x1 = pad + 10
            draw.text((x1, y + 6), "ORIGINAL SOURCE", fill=(56, 189, 248), font=f_col)
            if orig_abs and os.path.isfile(orig_abs):
                try:
                    with Image.open(orig_abs) as im:
                        im_thumb = im.convert("RGB")
                        im_thumb.thumbnail((col_w - 20, row_h - 45))
                        sheet.paste(im_thumb, (x1, y + 28))
                except Exception:
                    draw.text((x1, y + 40), "[LOAD ERROR]", fill=(239, 68, 68), font=f_tag)
            else:
                draw.text((x1, y + 50), "NO ORIGINAL SPECIMEN", fill=(148, 163, 184), font=f_tag)

            # Column 2: Altered Image
            x2 = x1 + col_w + pad
            draw.text((x2, y + 6), f"ALTERED ({altered_rec.manipulation_type.upper()})", fill=(249, 115, 22), font=f_col)
            alt_abs = os.path.join(self.dataset_dir, altered_rec.image_path)
            if os.path.isfile(alt_abs):
                try:
                    with Image.open(alt_abs) as im:
                        im_thumb = im.convert("RGB")
                        im_thumb.thumbnail((col_w - 20, row_h - 45))
                        sheet.paste(im_thumb, (x2, y + 28))
                except Exception:
                    pass

            # Column 3: Ground Truth Mask
            x3 = x2 + col_w + pad
            draw.text((x3, y + 6), f"BINARY MASK ({altered_rec.altered_pixels} PX)", fill=(234, 179, 8), font=f_col)
            if mask_abs and os.path.isfile(mask_abs):
                try:
                    with Image.open(mask_abs) as im:
                        im_thumb = im.convert("RGB")
                        im_thumb.thumbnail((col_w - 20, row_h - 45))
                        sheet.paste(im_thumb, (x3, y + 28))
                except Exception:
                    pass

        out_path = os.path.join(self.sheets_dir, "comparison_contact_sheet.jpg")
        sheet.save(out_path, format="JPEG", quality=85)
        return os.path.join("assets", "contact_sheets", "comparison_contact_sheet.jpg").replace("\\", "/")

    def _generate_html_report(
        self,
        schema_type: str,
        records: List[UnifiedSampleRecord],
        stats: Dict[str, Any],
        contact_sheets: List[Dict[str, str]]
    ):
        self.log("  Compiling true offline HTML report...")
        is_synthetic = (schema_type == "synthetic_test_dataset")
        is_empty = (len(records) == 0)

        # Build Card HTML items
        card_items_html = []
        for r in records[:self.max_thumbnails]:
            thumb_rel = os.path.join("assets", "thumbnails", f"{r.sample_id}_thumb.jpg").replace("\\", "/")
            thumb_full = os.path.join(self.output_dir, thumb_rel)
            has_thumb = os.path.isfile(thumb_full)

            # Badge color
            is_unaltered = r.label in ("unaltered_mock", "pristine_synthetic", "pristine")
            lbl_badge_class = "badge-emerald" if is_unaltered else "badge-amber"
            split_badge_class = "badge-slate"

            mask_badge = "<span class='badge badge-slate'>No Mask</span>"
            if r.mask_exists:
                mask_badge = f"<span class='badge badge-teal'>Mask: {r.altered_pixels} px</span>"
            elif not is_unaltered:
                mask_badge = "<span class='badge badge-rose'>Mask Missing</span>"

            dim_str = f"{r.image_width}x{r.image_height}" if r.image_width else "Unknown dim"

            card_html = f"""
            <div class="sample-card" data-label="{html.escape(r.label)}" data-split="{html.escape(r.split)}" data-manip="{html.escape(r.manipulation_type)}" data-template="{html.escape(r.template_family)}">
                <div class="card-thumb-container">
                    {f'<img src="{html.escape(thumb_rel)}" alt="{html.escape(r.sample_id)}" class="card-thumb" loading="lazy" />' if has_thumb else '<div class="no-thumb">No Preview Available</div>'}
                </div>
                <div class="card-body">
                    <div class="card-id" title="{html.escape(r.sample_id)}">{html.escape(r.sample_id)}</div>
                    <div class="card-sub">Source: <strong>{html.escape(r.source_id or 'N/A')}</strong> | {html.escape(r.template_family)}</div>
                    <div class="badges-row">
                        <span class="badge {lbl_badge_class}">{html.escape(r.label)}</span>
                        <span class="badge badge-indigo">{html.escape(r.manipulation_type)}</span>
                        <span class="badge {split_badge_class}">{html.escape(r.split)}</span>
                    </div>
                    <div class="card-footer">
                        <span>{html.escape(dim_str)}</span>
                        {mask_badge}
                    </div>
                </div>
            </div>
            """
            card_items_html.append(card_html)

        # Contact Sheets HTML
        sheets_html = []
        for s in contact_sheets:
            sheets_html.append(f"""
            <div class="sheet-container">
                <h3 class="sheet-title">{html.escape(s['title'])}</h3>
                <a href="{html.escape(s['rel_path'])}" target="_blank" title="Click to view full resolution contact sheet">
                    <img src="{html.escape(s['rel_path'])}" alt="{html.escape(s['title'])}" class="sheet-img" />
                </a>
            </div>
            """)

        # Error / Warning banner HTML
        alerts_html = []
        if is_synthetic:
            alerts_html.append("""
            <div class="alert-box alert-warning">
                <div class="alert-title">SYNTHETIC TEST DATASET — STRICT ISOLATION NOTICE</div>
                <div class="alert-desc">
                    These generated synthetic specimens are strictly for verifying the dataset pipeline,
                    mask alignment algorithms, and validation tooling. 
                    <strong>They will NOT be used to train, validate, select, or evaluate the final FALCON-404 ML model.</strong>
                </div>
            </div>
            """)
        elif is_empty:
            alerts_html.append("""
            <div class="alert-box alert-info">
                <div class="alert-title">TEAM RESEARCH DATASET — AWAITING MANUAL COLLECTION</div>
                <div class="alert-desc">
                    This directory is reserved for genuine physical camera captures of clearly fictional specimens.
                    The directory is currently empty. To populate it, consult 
                    <code>ml/docs/REAL_DATASET_COLLECTION_GUIDE.md</code> and follow the standard CSV template.
                </div>
            </div>
            """)

        for err in self.errors:
            alerts_html.append(f"""
            <div class="alert-box alert-error">
                <strong>Audit Error:</strong> {html.escape(err)}
            </div>
            """)

        for warn in self.warnings:
            alerts_html.append(f"""
            <div class="alert-box alert-warning">
                <strong>Audit Warning:</strong> {html.escape(warn)}
            </div>
            """)

        full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FALCON-404 :: Dataset Explorer & Forensic Audit</title>
    <style>
        :root {{
            --bg-canvas: #090d16;
            --bg-surface: #0f172a;
            --bg-card: #1e293b;
            --border-subtle: #334155;
            --border-strong: #475569;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent-orange: #ea580c;
            --accent-blue: #38bdf8;
            --accent-emerald: #10b981;
            --accent-rose: #f43f5e;
            --accent-amber: #f59e0b;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            background: var(--bg-canvas);
            color: var(--text-main);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 24px;
            line-height: 1.5;
        }}
        .header {{
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-left: 5px solid var(--accent-orange);
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 24px;
        }}
        .header-top {{ display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }}
        .header-title {{ font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #fff; }}
        .header-sub {{ font-size: 13px; color: var(--text-muted); margin-top: 4px; }}
        .header-meta {{ font-size: 12px; color: var(--accent-blue); text-align: right; }}

        .alert-box {{
            padding: 14px 18px;
            border-radius: 6px;
            margin-bottom: 16px;
            font-size: 13px;
        }}
        .alert-warning {{ background: #451a03; border: 1px solid #b45309; color: #fde68a; }}
        .alert-error {{ background: #4c0519; border: 1px solid #be123c; color: #fecdd3; }}
        .alert-info {{ background: #082f49; border: 1px solid #0369a1; color: #bae6fd; }}
        .alert-title {{ font-weight: bold; margin-bottom: 4px; }}

        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }}
        .stat-card {{
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 16px;
        }}
        .stat-val {{ font-size: 26px; font-weight: 700; color: #fff; }}
        .stat-label {{ font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }}

        .section-header {{
            font-size: 18px;
            font-weight: 700;
            color: #fff;
            margin: 28px 0 16px 0;
            border-bottom: 1px solid var(--border-subtle);
            padding-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        .filter-bar {{
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 14px;
            align-items: center;
        }}
        .filter-group {{ display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); }}
        .filter-select, .search-input {{
            background: var(--bg-card);
            border: 1px solid var(--border-strong);
            color: #fff;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 13px;
        }}
        .search-input {{ width: 220px; }}

        .gallery-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 18px;
            margin-bottom: 32px;
        }}
        .sample-card {{
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: transform 0.15s ease, border-color 0.15s ease;
        }}
        .sample-card:hover {{
            transform: translateY(-2px);
            border-color: var(--accent-orange);
        }}
        .card-thumb-container {{
            width: 100%;
            height: 160px;
            background: #020617;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }}
        .card-thumb {{
            width: 100%;
            height: 100%;
            object-fit: contain;
        }}
        .no-thumb {{ color: var(--text-muted); font-size: 12px; }}
        .card-body {{ padding: 12px 14px; flex: 1; display: flex; flex-direction: column; }}
        .card-id {{ font-size: 13px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
        .card-sub {{ font-size: 11px; color: var(--text-muted); margin: 3px 0 8px 0; }}
        .badges-row {{ display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }}
        .badge {{
            font-size: 10px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 4px;
            text-transform: uppercase;
        }}
        .badge-emerald {{ background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }}
        .badge-amber {{ background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }}
        .badge-indigo {{ background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); }}
        .badge-teal {{ background: rgba(20, 184, 166, 0.2); color: #5eead4; border: 1px solid rgba(20, 184, 166, 0.4); }}
        .badge-rose {{ background: rgba(244, 63, 94, 0.2); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.4); }}
        .badge-slate {{ background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.4); }}

        .card-footer {{
            margin-top: auto;
            border-top: 1px solid var(--border-subtle);
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: var(--text-muted);
        }}

        .sheet-container {{
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
        }}
        .sheet-title {{ font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 12px; }}
        .sheet-img {{
            width: 100%;
            height: auto;
            border-radius: 4px;
            border: 1px solid var(--border-strong);
            display: block;
        }}

        .audit-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-bottom: 24px;
            background: var(--bg-surface);
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--border-subtle);
        }}
        .audit-table th, .audit-table td {{
            padding: 10px 14px;
            text-align: left;
            border-bottom: 1px solid var(--border-subtle);
        }}
        .audit-table th {{ background: var(--bg-card); color: #fff; font-weight: 600; }}
        .status-pill {{
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 999px;
        }}
        .status-ok {{ background: rgba(16, 185, 129, 0.2); color: #34d399; }}
        .status-fail {{ background: rgba(244, 63, 94, 0.2); color: #fda4af; }}

        footer {{
            border-top: 1px solid var(--border-subtle);
            padding-top: 16px;
            font-size: 12px;
            color: var(--text-muted);
            text-align: center;
        }}
    </style>
</head>
<body>

    <div class="header">
        <div class="header-top">
            <div>
                <div class="header-title">FALCON-404 // DATASET EXPLORER & FORENSIC AUDITOR</div>
                <div class="header-sub">OFFLINE INSPECTION WORKSTATION & GROUND-TRUTH VERIFIER</div>
            </div>
            <div class="header-meta">
                <div>Schema: <strong>{html.escape(schema_type)}</strong></div>
                <div>Status: <span class="status-pill {'status-ok' if stats.get('audit_status') == 'PASSED' else 'status-fail'}">{html.escape(stats.get('audit_status', 'UNKNOWN'))}</span></div>
            </div>
        </div>
    </div>

    <!-- Alert / Notice Banners -->
    {''.join(alerts_html)}

    <!-- Summary Statistics -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-val">{stats.get('total_records', 0)}</div>
            <div class="stat-label">Manifest Records</div>
        </div>
        <div class="stat-card">
            <div class="stat-val">{stats.get('distinct_source_specimens', 0)}</div>
            <div class="stat-label">Source Specimens</div>
        </div>
        <div class="stat-card">
            <div class="stat-val">{stats.get('unaltered_samples', 0)}</div>
            <div class="stat-label">Unaltered / Pristine</div>
        </div>
        <div class="stat-card">
            <div class="stat-val">{stats.get('altered_samples', 0)}</div>
            <div class="stat-label">Altered / Manipulated</div>
        </div>
        <div class="stat-card">
            <div class="stat-val">{stats.get('available_masks', 0)}</div>
            <div class="stat-label">Ground-Truth Masks</div>
        </div>
        <div class="stat-card">
            <div class="stat-val">{stats.get('missing_images', 0)}</div>
            <div class="stat-label">Missing Images</div>
        </div>
        <div class="stat-card">
            <div class="stat-val">{stats.get('dimension_mismatches', 0)}</div>
            <div class="stat-label">Mask Mismatches</div>
        </div>
        <div class="stat-card">
            <div class="stat-val">{stats.get('leakage_count', 0)}</div>
            <div class="stat-label">Split Leaks</div>
        </div>
    </div>

    <!-- Contact Sheets Section -->
    {f'''
    <div class="section-header">
        <span>CONTACT SHEETS & HIGH-DENSITY VISUAL OVERVIEWS</span>
        <span style="font-size: 12px; font-weight: normal; color: var(--text-muted);">{len(contact_sheets)} Sheets Generated</span>
    </div>
    {''.join(sheets_html)}
    ''' if sheets_html else ''}

    <!-- Visual Sample Gallery -->
    <div class="section-header">
        <span>SAMPLE GALLERY & GROUND-TRUTH INSPECTION</span>
        <span id="gallery-count" style="font-size: 12px; font-weight: normal; color: var(--text-muted);">{len(card_items_html)} Records Displayed</span>
    </div>

    <!-- Gallery Filters -->
    <div class="filter-bar">
        <div class="filter-group">
            <label for="filter-label">Label:</label>
            <select id="filter-label" class="filter-select">
                <option value="ALL">All Labels</option>
                {f'<option value="unaltered_mock">unaltered_mock</option><option value="altered_mock">altered_mock</option>' if not is_synthetic else '<option value="pristine_synthetic">pristine_synthetic</option><option value="manipulated_synthetic">manipulated_synthetic</option>'}
            </select>
        </div>
        <div class="filter-group">
            <label for="filter-split">Split:</label>
            <select id="filter-split" class="filter-select">
                <option value="ALL">All Splits</option>
                <option value="train">train</option>
                <option value="validation">validation</option>
                <option value="test">test</option>
                <option value="unassigned">unassigned</option>
            </select>
        </div>
        <div class="filter-group">
            <label for="filter-search">Search:</label>
            <input type="text" id="filter-search" class="search-input" placeholder="Search by ID or source..." />
        </div>
    </div>

    <div class="gallery-grid" id="gallery-container">
        {''.join(card_items_html) if card_items_html else '<div style="color: var(--text-muted); font-size: 14px; padding: 20px;">No sample images available to display.</div>'}
    </div>

    <!-- Forensic Audit Checklist -->
    <div class="section-header">
        <span>DATASET INTEGRITY & VALIDATION SUMMARY</span>
    </div>
    <table class="audit-table">
        <thead>
            <tr>
                <th>Verification Check</th>
                <th>Observed State</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Manifest Parsing & File Resolution</td>
                <td>{stats.get('total_records', 0)} records in manifest, {stats.get('total_images_on_disk', 0)} image files on disk</td>
                <td><span class="status-pill {'status-ok' if stats.get('broken_references', 0) == 0 else 'status-fail'}">{'PASSED' if stats.get('broken_references', 0) == 0 else f'{stats.get("broken_references")} BROKEN'}</span></td>
            </tr>
            <tr>
                <td>Ground-Truth Mask Dimension Parity</td>
                <td>{stats.get('dimension_mismatches', 0)} mismatches detected</td>
                <td><span class="status-pill {'status-ok' if stats.get('dimension_mismatches', 0) == 0 else 'status-fail'}">{'PASSED' if stats.get('dimension_mismatches', 0) == 0 else 'MISMATCH FOUND'}</span></td>
            </tr>
            <tr>
                <td>Anti-Leakage Partition Isolation</td>
                <td>{stats.get('leakage_count', 0)} specimen overlaps across splits</td>
                <td><span class="status-pill {'status-ok' if stats.get('leakage_count', 0) == 0 else 'status-fail'}">{'PASSED' if stats.get('leakage_count', 0) == 0 else 'LEAKAGE DETECTED'}</span></td>
            </tr>
            <tr>
                <td>Path Traversal Security Check</td>
                <td>{stats.get('path_traversal_errors', 0)} violations found</td>
                <td><span class="status-pill {'status-ok' if stats.get('path_traversal_errors', 0) == 0 else 'status-fail'}">{'PASSED' if stats.get('path_traversal_errors', 0) == 0 else 'TRAVERSAL DETECTED'}</span></td>
            </tr>
            <tr>
                <td>Duplicate Sample IDs</td>
                <td>{stats.get('duplicate_sample_ids', 0)} duplicate keys</td>
                <td><span class="status-pill {'status-ok' if stats.get('duplicate_sample_ids', 0) == 0 else 'status-fail'}">{'PASSED' if stats.get('duplicate_sample_ids', 0) == 0 else 'DUPLICATES FOUND'}</span></td>
            </tr>
        </tbody>
    </table>

    <footer>
        FALCON-404 Forensic Intelligence Platform &bull; Developed by Harshad Mane &bull; Offline Dataset Explorer v7.1B
    </footer>

    <script>
        // Pure Offline Vanilla JS Filtering (0 external calls)
        document.addEventListener("DOMContentLoaded", function() {{
            const filterLabel = document.getElementById("filter-label");
            const filterSplit = document.getElementById("filter-split");
            const filterSearch = document.getElementById("filter-search");
            const gallery = document.getElementById("gallery-container");
            const cards = gallery ? gallery.getElementsByClassName("sample-card") : [];
            const countEl = document.getElementById("gallery-count");

            function updateFilters() {{
                const labelVal = filterLabel ? filterLabel.value : "ALL";
                const splitVal = filterSplit ? filterSplit.value : "ALL";
                const searchVal = filterSearch ? filterSearch.value.toLowerCase().trim() : "";
                let visibleCount = 0;

                for (let i = 0; i < cards.length; i++) {{
                    const card = cards[i];
                    const cLabel = card.getAttribute("data-label") || "";
                    const cSplit = card.getAttribute("data-split") || "";
                    const text = card.textContent.toLowerCase();

                    const matchLabel = (labelVal === "ALL" || cLabel === labelVal);
                    const matchSplit = (splitVal === "ALL" || cSplit === splitVal);
                    const matchSearch = (searchVal === "" || text.includes(searchVal));

                    if (matchLabel && matchSplit && matchSearch) {{
                        card.style.display = "";
                        visibleCount++;
                    }} else {{
                        card.style.display = "none";
                    }}
                }}

                if (countEl) {{
                    countEl.textContent = visibleCount + " Records Displayed";
                }}
            }}

            if (filterLabel) filterLabel.addEventListener("change", updateFilters);
            if (filterSplit) filterSplit.addEventListener("change", updateFilters);
            if (filterSearch) filterSearch.addEventListener("input", updateFilters);
        }});
    </script>
</body>
</html>
"""
        with open(self.html_file, "w", encoding="utf-8") as f:
            f.write(full_html)


# -----------------------------------------------------------------------------
# CLI Entry Point
# -----------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="FALCON-404 Offline Dataset Explorer & Auditor (Phase 7.1B)")
    parser.add_argument("--dataset-dir", type=str, default="ml_data/phase7_synthetic", help="Path to dataset directory")
    parser.add_argument("--output-dir", type=str, default=None, help="Output directory for reports (default: <dataset-dir>/reports)")
    parser.add_argument("--max-thumbnails", type=int, default=80, help="Max thumbnails to generate")
    parser.add_argument("--thumbnail-size", type=int, default=240, help="Max thumbnail pixel dimension")

    args = parser.parse_args()

    engine = DatasetExplorerEngine(
        dataset_dir=args.dataset_dir,
        output_dir=args.output_dir,
        max_thumbnails=args.max_thumbnails,
        thumbnail_size=args.thumbnail_size
    )
    engine.build()


if __name__ == "__main__":
    main()
