"""
FALCON-404: Synthetic Document Dataset Generation Pipeline (Phase 7.1)
Author: Harshad Mane (FALCON-404)
Description:
    Reproducible pipeline for generating synthetic document-like images,
    controlled localized alterations, matching pixel-level ground-truth binary masks,
    and anti-leakage train/validation/test manifests for document forensics research.

IMPORTANT:
    All generated documents are purely synthetic, explicitly marked with
    "SYNTHETIC — NOT A VALID ID", and do not replicate or mock official government credentials.
"""

import os
import sys
import io
import json
import csv
import math
import random
import argparse
import datetime
import time
from typing import Dict, List, Tuple, Any, Optional
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# -----------------------------------------------------------------------------
# Constant Fictional Data Pools (Deterministic & Purely Fictional)
# -----------------------------------------------------------------------------
FIRST_NAMES = [
    "Aarav", "Aditi", "Alex", "Ananya", "Carlos", "Chen", "Dev", "Elena",
    "Fatima", "George", "Ishaan", "Jordan", "Kavita", "Liam", "Maya",
    "Naveen", "Olivia", "Priya", "Rahul", "Sarah", "Tariq", "Vikram", "Zoe"
]

LAST_NAMES = [
    "Alvarez", "Banerjee", "Chen", "Deshmukh", "Gupta", "Ito", "Johnson",
    "Kowalski", "Mehta", "Nakamura", "Patel", "Rao", "Sharma", "Singh",
    "Vance", "Williams", "Zhang"
]

DESIGNATIONS = [
    "RESEARCH SCIENTIST", "SECURITY ANALYST", "FIELD SPECIALIST",
    "SYSTEMS OPERATOR", "FORENSIC EXAMINER", "AUDIT TECHNICIAN",
    "LABORATORY FELLOW", "INSPECTION OFFICER"
]

DEPARTMENTS = [
    "FORENSIC ARCHIVES", "CYBER INTEGRITY LAB", "QUANTUM RESEARCH",
    "DATA VERIFICATION DIV", "SIGNAL FORENSICS UNIT", "BIO-METRIC SYSTEMS"
]

TEMPLATE_TYPES = ["ALPHA_CARD", "BETA_CERTIFICATE", "GAMMA_PERMIT"]

# -----------------------------------------------------------------------------
# Helper Utilities
# -----------------------------------------------------------------------------
def get_system_font(size: int = 16, bold: bool = False) -> ImageFont.ImageFont:
    """Attempt to load a standard system font, with robust fallback to default."""
    font_names = []
    if bold:
        font_names.extend(["arialbd.ttf", "segoeuib.ttf", "DejaVuSans-Bold.ttf", "Helvetica-Bold.ttf"])
    font_names.extend(["arial.ttf", "segoeui.ttf", "DejaVuSans.ttf", "Helvetica.ttf"])

    for name in font_names:
        try:
            return ImageFont.truetype(name, size)
        except (IOError, OSError):
            continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def draw_guilloche_pattern(draw: ImageDraw.ImageDraw, bbox: Tuple[int, int, int, int], color: Tuple[int, int, int, int], step: int = 30):
    """Draw a subtle mathematical wave pattern simulating anti-counterfeiting guilloche."""
    x0, y0, x1, y1 = bbox
    width = x1 - x0
    height = y1 - y0
    for offset_y in range(y0, y1, step):
        points = []
        for x in range(x0, x1, 8):
            rel_x = (x - x0) / width
            wave = math.sin(rel_x * math.pi * 6) * 12 + math.cos(rel_x * math.pi * 3) * 6
            y = offset_y + wave
            if y0 <= y <= y1:
                points.append((x, y))
        if len(points) > 1:
            draw.line(points, fill=color, width=1)


def draw_synthetic_avatar(draw: ImageDraw.ImageDraw, bbox: Tuple[int, int, int, int], rng: random.Random):
    """Draw a purely geometric synthetic portrait silhouette inside a bounded photo frame."""
    x0, y0, x1, y1 = bbox
    w = x1 - x0
    h = y1 - y0

    # Background photo hue
    bg_hues = [
        (225, 235, 245), (230, 240, 235), (245, 240, 230),
        (235, 230, 245), (220, 228, 238)
    ]
    bg_color = rng.choice(bg_hues)
    draw.rectangle([x0, y0, x1, y1], fill=bg_color)

    # Silhouette colors
    skin_tones = [
        (190, 145, 120), (140, 95, 75), (220, 180, 155),
        (165, 120, 95), (240, 200, 175)
    ]
    clothing_tones = [
        (35, 55, 85), (50, 65, 55), (80, 45, 50),
        (40, 40, 50), (60, 75, 95)
    ]
    skin = rng.choice(skin_tones)
    clothes = rng.choice(clothing_tones)

    # Shoulder / Torso
    torso_top = int(y0 + h * 0.62)
    torso_w = int(w * 0.85)
    torso_x0 = x0 + (w - torso_w) // 2
    draw.chord([torso_x0, torso_top - 10, torso_x0 + torso_w, y1 + int(h * 0.4)], 180, 360, fill=clothes)

    # Neck
    neck_w = int(w * 0.22)
    neck_h = int(h * 0.16)
    neck_x0 = x0 + (w - neck_w) // 2
    neck_y0 = int(y0 + h * 0.50)
    draw.rectangle([neck_x0, neck_y0, neck_x0 + neck_w, neck_y0 + neck_h], fill=skin)

    # Head
    head_w = int(w * 0.44)
    head_h = int(h * 0.44)
    head_x0 = x0 + (w - head_w) // 2
    head_y0 = int(y0 + h * 0.15)
    draw.ellipse([head_x0, head_y0, head_x0 + head_w, head_y0 + head_h], fill=skin)

    # Hair / Cap silhouette
    hair_tones = [(30, 25, 25), (65, 45, 30), (85, 70, 50), (45, 40, 42)]
    hair_color = rng.choice(hair_tones)
    draw.chord([head_x0 - 2, head_y0 - 4, head_x0 + head_w + 2, head_y0 + int(head_h * 0.55)], 170, 370, fill=hair_color)

    # Frame border
    draw.rectangle([x0, y0, x1, y1], outline=(100, 115, 130), width=2)


# -----------------------------------------------------------------------------
# Synthetic Credential Generator
# -----------------------------------------------------------------------------
class SyntheticCredentialGenerator:
    """Generates clean, synthetic pristine document images with field metadata."""

    def __init__(self, rng: random.Random):
        self.rng = rng

    def generate_pristine(self, sample_idx: int, template_type: str) -> Tuple[Image.Image, Dict[str, Any]]:
        """Generates a pristine synthetic image and returns the image with its layout metadata."""
        if template_type == "ALPHA_CARD":
            return self._generate_alpha_card(sample_idx)
        elif template_type == "BETA_CERTIFICATE":
            return self._generate_beta_certificate(sample_idx)
        else:
            return self._generate_gamma_permit(sample_idx)

    def _generate_alpha_card(self, sample_idx: int) -> Tuple[Image.Image, Dict[str, Any]]:
        width, height = 960, 600
        img = Image.new("RGB", (width, height), (248, 250, 252))
        draw = ImageDraw.Draw(img)

        # Background security pattern
        draw_guilloche_pattern(draw, (20, 20, width - 20, height - 20), (220, 228, 238), step=28)

        # Header Band
        band_color = (15, 23, 42)
        draw.rectangle([0, 0, width, 84], fill=band_color)
        draw.rectangle([0, 84, width, 88], fill=(234, 88, 12))  # Orange accent strip

        # Header typography
        f_head = get_system_font(20, bold=True)
        f_sub = get_system_font(12, bold=False)
        f_watermark = get_system_font(13, bold=True)
        f_label = get_system_font(12, bold=False)
        f_val = get_system_font(16, bold=True)
        f_small = get_system_font(11, bold=False)

        draw.text((28, 18), "FALCON FORENSIC VERIFICATION INSTITUTE", fill=(255, 255, 255), font=f_head)
        draw.text((28, 48), "RESEARCH SYNTHETIC SPECIMEN // CREDENTIAL ALPHA", fill=(148, 163, 184), font=f_sub)

        # Watermark prominent warning
        draw.rectangle([width - 340, 16, width - 24, 68], outline=(234, 88, 12), width=1, fill=(30, 41, 59))
        draw.text((width - 325, 26), "SYNTHETIC — NOT A VALID ID", fill=(249, 115, 22), font=f_watermark)
        draw.text((width - 325, 46), "FOR RESEARCH USE ONLY", fill=(148, 163, 184), font=f_small)

        # Photo frame
        photo_x, photo_y, photo_w, photo_h = 48, 130, 200, 250
        draw_synthetic_avatar(draw, (photo_x, photo_y, photo_x + photo_w, photo_y + photo_h), self.rng)

        # Fictional Identity fields

        first_name = self.rng.choice(FIRST_NAMES)
        last_name = self.rng.choice(LAST_NAMES)
        full_name = f"{first_name} {last_name}".upper()
        
        doc_id = f"SYN-{self.rng.randint(100, 999)}-{self.rng.randint(1000, 9999)}-{chr(self.rng.randint(65, 90))}"
        dob = f"{self.rng.randint(1975, 2004)}-{self.rng.randint(1, 12):02d}-{self.rng.randint(1, 28):02d}"
        issue_date = f"2023-{self.rng.randint(1, 12):02d}-{self.rng.randint(1, 28):02d}"
        expiry_date = f"2028-{self.rng.randint(1, 12):02d}-{self.rng.randint(1, 28):02d}"
        role = self.rng.choice(DESIGNATIONS)
        dept = self.rng.choice(DEPARTMENTS)

        fields = {}

        # Draw structured fields
        start_x = 290
        curr_y = 130

        # Field 1: Name
        draw.text((start_x, curr_y), "CANDIDATE FULL NAME", fill=(100, 116, 139), font=f_label)
        draw.text((start_x, curr_y + 18), full_name, fill=(15, 23, 42), font=f_val)
        fields["full_name"] = {
            "bbox": [start_x - 4, curr_y + 14, 340, 32],
            "text": full_name
        }
        curr_y += 62

        # Field 2: Identifier
        draw.text((start_x, curr_y), "CREDENTIAL IDENTIFIER", fill=(100, 116, 139), font=f_label)
        draw.text((start_x, curr_y + 18), doc_id, fill=(15, 23, 42), font=f_val)
        fields["doc_id"] = {
            "bbox": [start_x - 4, curr_y + 14, 300, 32],
            "text": doc_id
        }
        curr_y += 62

        # Field 3: Designation / Department
        draw.text((start_x, curr_y), "CLASSIFICATION & DEPARTMENT", fill=(100, 116, 139), font=f_label)
        draw.text((start_x, curr_y + 18), f"{role} // {dept}", fill=(30, 41, 59), font=get_system_font(14, bold=True))
        fields["role"] = {
            "bbox": [start_x - 4, curr_y + 14, 460, 30],
            "text": f"{role} // {dept}"
        }
        curr_y += 62

        # Field 4: Dates (DOB, Valid From, Valid Thru)
        draw.text((start_x, curr_y), "DATE OF BIRTH", fill=(100, 116, 139), font=f_label)
        draw.text((start_x, curr_y + 18), dob, fill=(15, 23, 42), font=f_val)
        fields["dob"] = {
            "bbox": [start_x - 4, curr_y + 14, 150, 30],
            "text": dob
        }

        draw.text((start_x + 180, curr_y), "ISSUED", fill=(100, 116, 139), font=f_label)
        draw.text((start_x + 180, curr_y + 18), issue_date, fill=(15, 23, 42), font=f_val)
        fields["issue_date"] = {
            "bbox": [start_x + 176, curr_y + 14, 150, 30],
            "text": issue_date
        }

        draw.text((start_x + 360, curr_y), "VALID THRU", fill=(100, 116, 139), font=f_label)
        draw.text((start_x + 360, curr_y + 18), expiry_date, fill=(15, 23, 42), font=f_val)
        fields["expiry_date"] = {
            "bbox": [start_x + 356, curr_y + 14, 150, 30],
            "text": expiry_date
        }

        # Simulated Barcode / Machine Zone Box
        mrz_y = height - 100
        draw.rectangle([48, mrz_y, width - 48, height - 36], fill=(241, 245, 249), outline=(203, 213, 225))
        barcode_x = 64
        while barcode_x < 320:
            bw = self.rng.choice([2, 3, 4, 6])
            draw.rectangle([barcode_x, mrz_y + 10, barcode_x + bw, height - 46], fill=(15, 23, 42))
            barcode_x += bw + self.rng.choice([2, 3, 5])
        
        mrz_text_1 = f"IDSPEC<<{last_name.upper()}<<{first_name.upper()}<<<<<<<<<<<<<<<<<<"
        mrz_text_2 = f"{doc_id.replace('-', '')}9IND{dob.replace('-', '')}7M{expiry_date.replace('-', '')}8<<<<<<<"
        f_mono = get_system_font(13, bold=True)
        draw.text((350, mrz_y + 12), mrz_text_1[:40], fill=(51, 65, 85), font=f_mono)
        draw.text((350, mrz_y + 34), mrz_text_2[:40], fill=(51, 65, 85), font=f_mono)

        fields["photo"] = {
            "bbox": [photo_x, photo_y, photo_w, photo_h],
            "text": "[PHOTO_PORTRAIT]"
        }

        # Outer border
        draw.rectangle([0, 0, width - 1, height - 1], outline=(148, 163, 184), width=2)

        meta = {
            "template_type": "ALPHA_CARD",
            "dimensions": [width, height],
            "fields": fields,
            "synthetic_identity": {
                "name": full_name,
                "id": doc_id,
                "dob": dob,
                "dept": dept
            }
        }
        return img, meta

    def _generate_beta_certificate(self, sample_idx: int) -> Tuple[Image.Image, Dict[str, Any]]:
        width, height = 1000, 700
        img = Image.new("RGB", (width, height), (253, 252, 248))
        draw = ImageDraw.Draw(img)

        # Border flourish
        draw.rectangle([18, 18, width - 18, height - 18], outline=(180, 140, 75), width=2)
        draw.rectangle([26, 26, width - 26, height - 26], outline=(215, 185, 130), width=1)
        draw_guilloche_pattern(draw, (32, 32, width - 32, height - 32), (242, 235, 220), step=34)

        f_title = get_system_font(26, bold=True)
        f_sub = get_system_font(14, bold=False)
        f_warn = get_system_font(13, bold=True)
        f_body = get_system_font(15, bold=False)
        f_emp = get_system_font(20, bold=True)
        f_num = get_system_font(15, bold=True)

        draw.text((width // 2 - 240, 60), "CERTIFICATE OF ACCREDITATION", fill=(45, 30, 15), font=f_title)
        draw.text((width // 2 - 180, 102), "FORENSIC SYSTEM COMPETENCY AUDIT SPECIMEN", fill=(115, 95, 70), font=f_sub)

        # Watermark
        draw.rectangle([width // 2 - 160, 135, width // 2 + 160, 168], fill=(250, 240, 230), outline=(210, 80, 30))
        draw.text((width // 2 - 145, 142), "SYNTHETIC — NOT A VALID ID", fill=(210, 80, 30), font=f_warn)

        first_name = self.rng.choice(FIRST_NAMES)
        last_name = self.rng.choice(LAST_NAMES)
        full_name = f"{first_name} {last_name}".upper()
        cert_num = f"CRT-FALCON-{self.rng.randint(10000, 99999)}"
        issue_date = f"2024-{self.rng.randint(1, 12):02d}-{self.rng.randint(1, 28):02d}"
        specialization = self.rng.choice(DESIGNATIONS)

        # Body text
        draw.text((width // 2 - 130, 210), "This certifies that the candidate:", fill=(90, 80, 70), font=f_body)
        draw.text((width // 2 - (len(full_name) * 7), 245), full_name, fill=(20, 20, 20), font=f_emp)
        
        draw.text((width // 2 - 220, 300), f"Has successfully satisfied synthetic test protocol requirements in:", fill=(90, 80, 70), font=f_body)
        draw.text((width // 2 - (len(specialization) * 6), 335), specialization, fill=(45, 30, 15), font=get_system_font(18, bold=True))

        fields = {
            "candidate_name": {
                "bbox": [width // 2 - 180, 240, 360, 40],
                "text": full_name
            },
            "specialization": {
                "bbox": [width // 2 - 220, 330, 440, 36],
                "text": specialization
            }
        }

        # Photo frame on left
        photo_x, photo_y, photo_w, photo_h = 80, 390, 180, 220
        draw_synthetic_avatar(draw, (photo_x, photo_y, photo_x + photo_w, photo_y + photo_h), self.rng)
        fields["photo"] = {
            "bbox": [photo_x, photo_y, photo_w, photo_h],
            "text": "[PHOTO_PORTRAIT]"
        }

        # Seal / Stamp simulator on right
        seal_cx, seal_cy = width - 180, 500
        draw.ellipse([seal_cx - 65, seal_cy - 65, seal_cx + 65, seal_cy + 65], outline=(175, 50, 40), width=3)
        draw.ellipse([seal_cx - 55, seal_cy - 55, seal_cx + 55, seal_cy + 55], outline=(175, 50, 40), width=1)
        draw.text((seal_cx - 45, seal_cy - 12), "★ VERIFIED ★", fill=(175, 50, 40), font=get_system_font(13, bold=True))
        fields["seal"] = {
            "bbox": [seal_cx - 65, seal_cy - 65, 130, 130],
            "text": "[AUTHENTIC_SEAL]"
        }

        # Certificate details in middle
        draw.text((320, 430), "DOCUMENT REGISTRATION NUMBER:", fill=(115, 95, 70), font=f_body)
        draw.text((320, 455), cert_num, fill=(20, 20, 20), font=f_num)
        fields["cert_num"] = {
            "bbox": [316, 450, 280, 32],
            "text": cert_num
        }

        draw.text((320, 510), "DATE OF ACCREDITATION:", fill=(115, 95, 70), font=f_body)
        draw.text((320, 535), issue_date, fill=(20, 20, 20), font=f_num)
        fields["issue_date"] = {
            "bbox": [316, 530, 220, 32],
            "text": issue_date
        }

        meta = {
            "template_type": "BETA_CERTIFICATE",
            "dimensions": [width, height],
            "fields": fields,
            "synthetic_identity": {
                "name": full_name,
                "id": cert_num,
                "dob": "N/A",
                "dept": specialization
            }
        }
        return img, meta

    def _generate_gamma_permit(self, sample_idx: int) -> Tuple[Image.Image, Dict[str, Any]]:
        width, height = 900, 640
        img = Image.new("RGB", (width, height), (242, 245, 248))
        draw = ImageDraw.Draw(img)

        # Header zone with security hatch
        draw.rectangle([0, 0, width, 100], fill=(24, 43, 73))
        draw_guilloche_pattern(draw, (20, 105, width - 20, height - 20), (220, 230, 240), step=26)

        f_h = get_system_font(22, bold=True)
        f_s = get_system_font(13, bold=False)
        f_w = get_system_font(12, bold=True)
        f_fld = get_system_font(12, bold=False)
        f_val = get_system_font(16, bold=True)

        draw.text((35, 22), "GLOBAL RESEARCH ACCESS PERMIT", fill=(255, 255, 255), font=f_h)
        draw.text((35, 56), "FORENSIC EXPERIMENTATION SPECIMEN — NON-TRANSFERABLE", fill=(175, 195, 220), font=f_s)

        # Prominent synthetic notice banner
        draw.rectangle([width - 320, 24, width - 25, 76], fill=(15, 23, 42), outline=(249, 115, 22))
        draw.text((width - 305, 34), "SYNTHETIC — NOT A VALID ID", fill=(249, 115, 22), font=f_w)
        draw.text((width - 305, 52), "ARTIFICIAL TEST RECORD", fill=(203, 213, 225), font=get_system_font(11))

        # Photo frame right aligned
        photo_w, photo_h = 200, 240
        photo_x = width - photo_w - 40
        photo_y = 130
        draw_synthetic_avatar(draw, (photo_x, photo_y, photo_x + photo_w, photo_y + photo_h), self.rng)

        first_name = self.rng.choice(FIRST_NAMES)
        last_name = self.rng.choice(LAST_NAMES)
        full_name = f"{first_name} {last_name}".upper()
        permit_id = f"PERMIT-404-{self.rng.randint(1000, 9999)}-{self.rng.randint(10, 99)}"
        clearance = f"LEVEL {self.rng.randint(1, 5)} - RESTRICTED"
        dob = f"{self.rng.randint(1980, 2002)}-{self.rng.randint(1, 12):02d}-{self.rng.randint(1, 28):02d}"
        expires = f"2029-{self.rng.randint(1, 12):02d}-{self.rng.randint(1, 28):02d}"

        fields = {
            "photo": {
                "bbox": [photo_x, photo_y, photo_w, photo_h],
                "text": "[PHOTO_PORTRAIT]"
            }
        }

        lx = 50
        ly = 135
        # Field 1: Name
        draw.text((lx, ly), "PERMIT HOLDER NAME", fill=(100, 116, 139), font=f_fld)
        draw.text((lx, ly + 18), full_name, fill=(15, 23, 42), font=f_val)
        fields["holder_name"] = {
            "bbox": [lx - 4, ly + 14, 380, 32],
            "text": full_name
        }
        ly += 65

        # Field 2: Permit ID
        draw.text((lx, ly), "PERMIT NUMBER", fill=(100, 116, 139), font=f_fld)
        draw.text((lx, ly + 18), permit_id, fill=(15, 23, 42), font=f_val)
        fields["permit_id"] = {
            "bbox": [lx - 4, ly + 14, 340, 32],
            "text": permit_id
        }
        ly += 65

        # Field 3: Clearance Level
        draw.text((lx, ly), "CLEARANCE CLASSIFICATION", fill=(100, 116, 139), font=f_fld)
        draw.text((lx, ly + 18), clearance, fill=(185, 28, 28), font=f_val)
        fields["clearance"] = {
            "bbox": [lx - 4, ly + 14, 300, 32],
            "text": clearance
        }
        ly += 65

        # Field 4: DOB and Expiry
        draw.text((lx, ly), "DATE OF BIRTH", fill=(100, 116, 139), font=f_fld)
        draw.text((lx, ly + 18), dob, fill=(15, 23, 42), font=f_val)
        fields["dob"] = {
            "bbox": [lx - 4, ly + 14, 160, 30],
            "text": dob
        }

        draw.text((lx + 220, ly), "EXPIRES", fill=(100, 116, 139), font=f_fld)
        draw.text((lx + 220, ly + 18), expires, fill=(15, 23, 42), font=f_val)
        fields["expiry"] = {
            "bbox": [lx + 216, ly + 14, 160, 30],
            "text": expires
        }

        # Bottom Barcode & Machine Strip
        bot_y = height - 120
        draw.rectangle([35, bot_y, width - 35, height - 35], fill=(235, 240, 245), outline=(190, 205, 220))
        draw.text((55, bot_y + 15), "AUTHENTICATION CHECKSUM:", fill=(100, 116, 139), font=f_fld)
        checksum_hex = f"0x{self.rng.randint(0x10000000, 0xFFFFFFFF):X} {self.rng.randint(0x10000000, 0xFFFFFFFF):X}"
        draw.text((55, bot_y + 35), checksum_hex, fill=(15, 23, 42), font=get_system_font(15, bold=True))

        fields["checksum"] = {
            "bbox": [50, bot_y + 30, 380, 32],
            "text": checksum_hex
        }

        draw.rectangle([0, 0, width - 1, height - 1], outline=(100, 116, 139), width=2)

        meta = {
            "template_type": "GAMMA_PERMIT",
            "dimensions": [width, height],
            "fields": fields,
            "synthetic_identity": {
                "name": full_name,
                "id": permit_id,
                "dob": dob,
                "dept": clearance
            }
        }
        return img, meta


# -----------------------------------------------------------------------------
# Manipulation Engine
# -----------------------------------------------------------------------------
class ManipulationEngine:
    """Applies controlled, forensically interesting localized alterations and creates binary masks."""

    MANIPULATION_TYPES = [
        "text_replacement",
        "copy_move",
        "portrait_swap",
        "localized_resampling_blur",
        "localized_recompression"
    ]

    def __init__(self, rng: random.Random):
        self.rng = rng

    def apply_manipulation(
        self,
        base_img: Image.Image,
        meta: Dict[str, Any],
        manip_type: Optional[str] = None
    ) -> Tuple[Image.Image, Image.Image, str, List[int], int, float]:
        """
        Applies a localized manipulation to a copy of base_img.
        Returns:
            manipulated_img, mask_img (0=pristine, 255=altered), manip_type, bbox, altered_pixel_count, altered_pixel_ratio
        """
        if manip_type is None:
            manip_type = self.rng.choice(self.MANIPULATION_TYPES)

        width, height = base_img.size
        # Grayscale mask: 0 for untouched, 255 for altered
        mask = Image.new("L", (width, height), 0)
        img_copy = base_img.copy()

        if manip_type == "text_replacement":
            return self._apply_text_replacement(img_copy, mask, meta)
        elif manip_type == "copy_move":
            return self._apply_copy_move(img_copy, mask, meta)
        elif manip_type == "portrait_swap":
            return self._apply_portrait_swap(img_copy, mask, meta)
        elif manip_type == "localized_resampling_blur":
            return self._apply_resampling_blur(img_copy, mask, meta)
        elif manip_type == "localized_recompression":
            return self._apply_recompression(img_copy, mask, meta)
        else:
            raise ValueError(f"Unknown manipulation type: {manip_type}")

    def _apply_text_replacement(
        self,
        img: Image.Image,
        mask: Image.Image,
        meta: Dict[str, Any]
    ) -> Tuple[Image.Image, Image.Image, str, List[int], int, float]:
        fields = meta["fields"]
        text_keys = [k for k in fields.keys() if k != "photo" and k != "seal"]
        chosen_key = self.rng.choice(text_keys) if text_keys else list(fields.keys())[0]
        finfo = fields[chosen_key]
        x, y, w, h = finfo["bbox"]

        # Ensure box is within bounds
        x = max(0, min(x, img.width - 20))
        y = max(0, min(y, img.height - 15))
        w = max(20, min(w, img.width - x))
        h = max(14, min(h, img.height - y))

        draw_img = ImageDraw.Draw(img)
        draw_mask = ImageDraw.Draw(mask)

        # Clear existing text box with slightly mismatched background color (forensic artifact)
        bg_sample = img.getpixel((max(0, x - 5), max(0, y - 5)))
        tint = (
            min(255, bg_sample[0] + self.rng.choice([-6, -4, 4, 6])),
            min(255, bg_sample[1] + self.rng.choice([-6, -4, 4, 6])),
            min(255, bg_sample[2] + self.rng.choice([-6, -4, 4, 6]))
        )
        draw_img.rectangle([x, y, x + w - 1, y + h - 1], fill=tint)
        draw_mask.rectangle([x, y, x + w - 1, y + h - 1], fill=255)

        # Forge new value
        if "id" in chosen_key.lower() or "num" in chosen_key.lower():
            new_text = f"FORGED-{self.rng.randint(1000, 9999)}-MOD"
        elif "date" in chosen_key.lower() or "dob" in chosen_key.lower():
            new_text = f"1999-09-09"
        else:
            new_text = f"FORGED {self.rng.choice(FIRST_NAMES).upper()} {self.rng.choice(LAST_NAMES).upper()}"

        draw_img.text((x + 2, y + 2), new_text[:28], fill=(15, 23, 42), font=get_system_font(15, bold=True))

        altered_pixels = mask.tobytes().count(b"\xff")
        ratio = altered_pixels / (img.width * img.height)
        return img, mask, "text_replacement", [x, y, w, h], altered_pixels, ratio

    def _apply_copy_move(
        self,
        img: Image.Image,
        mask: Image.Image,
        meta: Dict[str, Any]
    ) -> Tuple[Image.Image, Image.Image, str, List[int], int, float]:
        fields = meta["fields"]
        keys = list(fields.keys())
        chosen_key = self.rng.choice(keys)
        finfo = fields[chosen_key]
        sx, sy, sw, sh = finfo["bbox"]

        # Clamp source
        sx = max(0, min(sx, img.width - 20))
        sy = max(0, min(sy, img.height - 15))
        sw = max(20, min(sw, img.width - sx))
        sh = max(14, min(sh, img.height - sy))

        patch = img.crop((sx, sy, sx + sw, sy + sh))

        # Target coordinates: displaced by offset
        dx = max(10, min(img.width - sw - 10, sx + self.rng.choice([-150, -80, 80, 150])))
        dy = max(10, min(img.height - sh - 10, sy + self.rng.choice([-60, -40, 40, 60])))

        img.paste(patch, (dx, dy))

        draw_mask = ImageDraw.Draw(mask)
        draw_mask.rectangle([dx, dy, dx + sw - 1, dy + sh - 1], fill=255)

        altered_pixels = mask.tobytes().count(b"\xff")
        ratio = altered_pixels / (img.width * img.height)
        return img, mask, "copy_move", [dx, dy, sw, sh], altered_pixels, ratio

    def _apply_portrait_swap(
        self,
        img: Image.Image,
        mask: Image.Image,
        meta: Dict[str, Any]
    ) -> Tuple[Image.Image, Image.Image, str, List[int], int, float]:
        if "photo" in meta["fields"]:
            px, py, pw, ph = meta["fields"]["photo"]["bbox"]
        else:
            px, py, pw, ph = 50, 150, 180, 220

        # Create swapped photo
        swapped_img = Image.new("RGB", (pw, ph), (230, 235, 240))
        draw_swapped = ImageDraw.Draw(swapped_img)
        draw_synthetic_avatar(draw_swapped, (0, 0, pw, ph), self.rng)

        # Paste onto image with subtle edge seam
        img.paste(swapped_img, (px, py))

        draw_mask = ImageDraw.Draw(mask)
        draw_mask.rectangle([px, py, px + pw - 1, py + ph - 1], fill=255)

        altered_pixels = mask.tobytes().count(b"\xff")
        ratio = altered_pixels / (img.width * img.height)
        return img, mask, "portrait_swap", [px, py, pw, ph], altered_pixels, ratio

    def _apply_resampling_blur(
        self,
        img: Image.Image,
        mask: Image.Image,
        meta: Dict[str, Any]
    ) -> Tuple[Image.Image, Image.Image, str, List[int], int, float]:
        fields = meta["fields"]
        keys = list(fields.keys())
        chosen_key = self.rng.choice(keys)
        bx, by, bw, bh = fields[chosen_key]["bbox"]

        bx = max(0, min(bx, img.width - 20))
        by = max(0, min(by, img.height - 15))
        bw = max(20, min(bw, img.width - bx))
        bh = max(14, min(bh, img.height - by))

        patch = img.crop((bx, by, bx + bw, by + bh))
        # Downscale 4x then upscale back to create distinct interpolation artifacts
        small = patch.resize((max(4, bw // 4), max(4, bh // 4)), resample=Image.Resampling.BILINEAR)
        restored = small.resize((bw, bh), resample=Image.Resampling.BICUBIC)
        restored = restored.filter(ImageFilter.GaussianBlur(radius=1.8))

        img.paste(restored, (bx, by))

        draw_mask = ImageDraw.Draw(mask)
        draw_mask.rectangle([bx, by, bx + bw - 1, by + bh - 1], fill=255)

        altered_pixels = mask.tobytes().count(b"\xff")
        ratio = altered_pixels / (img.width * img.height)
        return img, mask, "localized_resampling_blur", [bx, by, bw, bh], altered_pixels, ratio

    def _apply_recompression(
        self,
        img: Image.Image,
        mask: Image.Image,
        meta: Dict[str, Any]
    ) -> Tuple[Image.Image, Image.Image, str, List[int], int, float]:
        fields = meta["fields"]
        keys = list(fields.keys())
        chosen_key = self.rng.choice(keys)
        rx, ry, rw, rh = fields[chosen_key]["bbox"]

        rx = max(0, min(rx, img.width - 20))
        ry = max(0, min(ry, img.height - 15))
        rw = max(20, min(rw, img.width - rx))
        rh = max(14, min(rh, img.height - ry))

        patch = img.crop((rx, ry, rx + rw, ry + rh))
        buf = io.BytesIO()
        # Save at low JPEG quality to introduce 8x8 blocking forensic artifacts
        patch.save(buf, format="JPEG", quality=15)
        buf.seek(0)
        recomp_patch = Image.open(buf).convert("RGB")

        img.paste(recomp_patch, (rx, ry))

        draw_mask = ImageDraw.Draw(mask)
        draw_mask.rectangle([rx, ry, rx + rw - 1, ry + rh - 1], fill=255)

        altered_pixels = mask.tobytes().count(b"\xff")
        ratio = altered_pixels / (img.width * img.height)
        return img, mask, "localized_recompression", [rx, ry, rw, rh], altered_pixels, ratio



# -----------------------------------------------------------------------------
# Dataset Pipeline Orchestrator
# -----------------------------------------------------------------------------
class SyntheticDatasetPipeline:
    """Manages full dataset generation, anti-leakage splitting, and manifest generation."""

    def __init__(
        self,
        output_dir: str,
        num_identities: int = 30,
        seed: int = 404,
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15
    ):
        self.output_dir = output_dir
        self.num_identities = num_identities
        self.seed = seed
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio
        self.test_ratio = test_ratio

        self.rng = random.Random(seed)
        self.generator = SyntheticCredentialGenerator(self.rng)
        self.manipulator = ManipulationEngine(self.rng)

        # Output paths
        self.images_dir = os.path.join(output_dir, "images")
        self.masks_dir = os.path.join(output_dir, "masks")
        self.manifest_csv = os.path.join(output_dir, "dataset_manifest.csv")
        self.train_jsonl = os.path.join(output_dir, "train.jsonl")
        self.val_jsonl = os.path.join(output_dir, "validation.jsonl")
        self.test_jsonl = os.path.join(output_dir, "test.jsonl")
        self.audit_jsonl = os.path.join(output_dir, "generation.jsonl")
        self.config_json = os.path.join(output_dir, "generation_config.json")

    def run(self) -> Dict[str, Any]:
        """Executes the dataset generation pipeline."""
        start_time = time.time()
        os.makedirs(self.images_dir, exist_ok=True)
        os.makedirs(self.masks_dir, exist_ok=True)

        print(f"==================================================")
        print(f"FALCON-404 :: SYNTHETIC DATASET GENERATION PIPELINE")
        print(f"Identities to generate: {self.num_identities}")
        print(f"Random seed: {self.seed}")
        print(f"Output directory: {self.output_dir}")
        print(f"Splits target: {self.train_ratio*100:.0f}% train / {self.val_ratio*100:.0f}% val / {self.test_ratio*100:.0f}% test")
        print(f"==================================================")

        # 1. Anti-leakage partition assignment by identity ID
        identity_ids = [f"ID_{i+1:04d}" for i in range(self.num_identities)]
        # Deterministic shuffle for splitting
        split_rng = random.Random(self.seed + 1)
        shuffled_ids = list(identity_ids)
        split_rng.shuffle(shuffled_ids)

        n_train = int(round(self.num_identities * self.train_ratio))
        n_val = int(round(self.num_identities * self.val_ratio))
        train_ids = set(shuffled_ids[:n_train])
        val_ids = set(shuffled_ids[n_train:n_train + n_val])
        test_ids = set(shuffled_ids[n_train + n_val:])

        records: List[Dict[str, Any]] = []
        audit_log: List[Dict[str, Any]] = []

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # 2. Generation Loop
        for i, ident_id in enumerate(identity_ids):
            split = "train" if ident_id in train_ids else ("validation" if ident_id in val_ids else "test")
            template = TEMPLATE_TYPES[i % len(TEMPLATE_TYPES)]

            # Generate Pristine
            pristine_img, meta = self.generator.generate_pristine(i + 1, template)
            pristine_sample_id = f"{ident_id}_PRISTINE"
            pristine_img_rel = os.path.join("images", f"{pristine_sample_id}.png").replace("\\", "/")
            pristine_mask_rel = os.path.join("masks", f"{pristine_sample_id}_mask.png").replace("\\", "/")

            pristine_img_path = os.path.join(self.output_dir, pristine_img_rel)
            pristine_mask_path = os.path.join(self.output_dir, pristine_mask_rel)

            # Pristine mask is completely zero
            pristine_mask = Image.new("L", pristine_img.size, 0)

            pristine_img.save(pristine_img_path, format="PNG")
            pristine_mask.save(pristine_mask_path, format="PNG")

            pristine_rec = {
                "sample_id": pristine_sample_id,
                "source_sample_id": ident_id,
                "template_type": template,
                "split": split,
                "label": "pristine_synthetic",
                "manipulation_type": "none",
                "manipulation_bbox": json.dumps([0, 0, 0, 0]),
                "image_path": pristine_img_rel,
                "mask_path": pristine_mask_rel,
                "image_width": pristine_img.width,
                "image_height": pristine_img.height,
                "altered_pixel_count": 0,
                "altered_pixel_ratio": 0.0,
                "created_at": now_iso
            }
            records.append(pristine_rec)
            audit_log.append({
                "timestamp": now_iso,
                "action": "create_sample",
                "sample_id": pristine_sample_id,
                "type": "pristine_synthetic",
                "split": split
            })

            # Generate Manipulated Derived Sample
            # Pick manipulation type cyclically or randomly
            m_type = ManipulationEngine.MANIPULATION_TYPES[i % len(ManipulationEngine.MANIPULATION_TYPES)]
            manip_img, manip_mask, applied_type, bbox, altered_px, ratio = self.manipulator.apply_manipulation(
                pristine_img, meta, manip_type=m_type
            )

            manip_sample_id = f"{ident_id}_MANIP_{applied_type.upper()}"
            manip_img_rel = os.path.join("images", f"{manip_sample_id}.png").replace("\\", "/")
            manip_mask_rel = os.path.join("masks", f"{manip_sample_id}_mask.png").replace("\\", "/")

            manip_img_path = os.path.join(self.output_dir, manip_img_rel)
            manip_mask_path = os.path.join(self.output_dir, manip_mask_rel)

            manip_img.save(manip_img_path, format="PNG")
            manip_mask.save(manip_mask_path, format="PNG")

            manip_rec = {
                "sample_id": manip_sample_id,
                "source_sample_id": ident_id,
                "template_type": template,
                "split": split,
                "label": "manipulated_synthetic",
                "manipulation_type": applied_type,
                "manipulation_bbox": json.dumps(bbox),
                "image_path": manip_img_rel,
                "mask_path": manip_mask_rel,
                "image_width": manip_img.width,
                "image_height": manip_img.height,
                "altered_pixel_count": altered_px,
                "altered_pixel_ratio": round(ratio, 6),
                "created_at": now_iso
            }
            records.append(manip_rec)
            audit_log.append({
                "timestamp": now_iso,
                "action": "create_sample",
                "sample_id": manip_sample_id,
                "type": "manipulated_synthetic",
                "manipulation": applied_type,
                "bbox": bbox,
                "split": split
            })

            if (i + 1) % 10 == 0 or (i + 1) == self.num_identities:
                print(f"  Processed {i+1}/{self.num_identities} identities ({len(records)} total samples generated)...")

        # 3. Write CSV Manifest
        fieldnames = [
            "sample_id", "source_sample_id", "template_type", "split", "label",
            "manipulation_type", "manipulation_bbox", "image_path", "mask_path",
            "image_width", "image_height", "altered_pixel_count", "altered_pixel_ratio", "created_at"
        ]
        with open(self.manifest_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in records:
                writer.writerow(r)

        # 4. Write JSONL Splits
        train_records = [r for r in records if r["split"] == "train"]
        val_records = [r for r in records if r["split"] == "validation"]
        test_records = [r for r in records if r["split"] == "test"]

        def write_jsonl(path: str, data: List[Dict[str, Any]]):
            with open(path, "w", encoding="utf-8") as f:
                for item in data:
                    f.write(json.dumps(item) + "\n")

        write_jsonl(self.train_jsonl, train_records)
        write_jsonl(self.val_jsonl, val_records)
        write_jsonl(self.test_jsonl, test_records)

        # 5. Write Generation Audit Log
        write_jsonl(self.audit_jsonl, audit_log)

        # 6. Write Configuration & Metadata Summary
        elapsed_sec = round(time.time() - start_time, 2)
        config_summary = {
            "pipeline": "FALCON-404 Synthetic Forensics Dataset Generator",
            "version": "7.1",
            "author": "Harshad Mane",
            "seed": self.seed,
            "generated_at": now_iso,
            "elapsed_seconds": elapsed_sec,
            "num_identities": self.num_identities,
            "total_samples": len(records),
            "splits": {
                "train_count": len(train_records),
                "val_count": len(val_records),
                "test_count": len(test_records)
            },
            "class_distribution": {
                "pristine_synthetic": sum(1 for r in records if r["label"] == "pristine_synthetic"),
                "manipulated_synthetic": sum(1 for r in records if r["label"] == "manipulated_synthetic")
            },
            "manipulation_distribution": {
                m: sum(1 for r in records if r["manipulation_type"] == m)
                for m in ["none"] + ManipulationEngine.MANIPULATION_TYPES
            }
        }
        with open(self.config_json, "w", encoding="utf-8") as f:
            json.dump(config_summary, f, indent=2)

        print("\nDataset Generation Complete!")
        print(f"Total samples: {len(records)} ({config_summary['class_distribution']['pristine_synthetic']} pristine, {config_summary['class_distribution']['manipulated_synthetic']} manipulated)")
        print(f"Train: {len(train_records)} | Validation: {len(val_records)} | Test: {len(test_records)}")
        print(f"Manifest: {self.manifest_csv}")
        print(f"Elapsed: {elapsed_sec}s")
        return config_summary


# -----------------------------------------------------------------------------
# CLI Entry Point
# -----------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="FALCON-404 Synthetic Document Dataset Generator (Phase 7.1)")
    parser.add_argument("--num-samples", type=int, default=30, help="Number of base identities to generate (smoke test default: 30)")
    parser.add_argument("--output-dir", type=str, default="ml_data/phase7_synthetic", help="Output directory")
    parser.add_argument("--seed", type=int, default=404, help="Reproducibility random seed")
    parser.add_argument("--train-ratio", type=float, default=0.70, help="Ratio for training split")
    parser.add_argument("--val-ratio", type=float, default=0.15, help="Ratio for validation split")
    parser.add_argument("--test-ratio", type=float, default=0.15, help="Ratio for test split")

    args = parser.parse_args()

    pipeline = SyntheticDatasetPipeline(
        output_dir=args.output_dir,
        num_identities=args.num_samples,
        seed=args.seed,
        train_ratio=args.train_ratio,
        val_ratio=args.val_ratio,
        test_ratio=args.test_ratio
    )
    pipeline.run()


if __name__ == "__main__":
    main()
