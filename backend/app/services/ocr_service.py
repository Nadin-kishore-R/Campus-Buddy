import io
import base64
from typing import Optional, List
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False


def preprocess_image_multi(image: Image.Image) -> List[Image.Image]:
    """
    Generates multiple preprocessed image candidates optimized for Tesseract OCR.
    - Upscaling (Lanczos) for low-resolution/small font images
    - Grayscale conversion & contrast adjustment
    - Binary thresholding for high legibility
    """
    candidates = []
    
    # Ensure RGB / L mode
    if image.mode in ('RGBA', 'LA', 'P'):
        bg = Image.new('RGB', image.size, (255, 255, 255))
        if image.mode == 'P':
            image = image.convert('RGBA')
        bg.paste(image, mask=image.split()[-1] if 'A' in image.mode else None)
        image = bg
    else:
        image = image.convert('RGB')

    # 1. Base upscale: if width is small, scale up so characters have enough resolution
    w, h = image.size
    if w < 1800:
        scale = max(2.0, 1800.0 / w)
        img_upscaled = image.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    else:
        img_upscaled = image

    candidates.append(img_upscaled)

    # 2. Grayscale + Moderate Contrast (1.4x)
    gray = img_upscaled.convert('L')
    enhancer = ImageEnhance.Contrast(gray)
    gray_contrast = enhancer.enhance(1.4)
    candidates.append(gray_contrast)

    # 3. Grayscale + Binarization (Threshold 150)
    binarized = gray.point(lambda p: 255 if p > 150 else 0)
    candidates.append(binarized)

    return candidates


def extract_ocr_from_pil(image: Image.Image) -> str:
    """
    Extract text from a PIL Image using pytesseract with multi-pass evaluation.
    Selects the result with highest alphanumeric text density.
    """
    if not PYTESSERACT_AVAILABLE:
        print("[OCR Service] Warning: pytesseract is not installed.")
        return ""

    results = []
    candidates = preprocess_image_multi(image)
    configs = ['--oem 3 --psm 3', '--oem 3 --psm 6', '--oem 3 --psm 11']

    for candidate in candidates:
        for cfg in configs:
            try:
                text = pytesseract.image_to_string(candidate, config=cfg).strip()
                if text:
                    results.append(text)
            except Exception as e:
                continue

    if not results:
        return ""

    # Rank results by valid alphanumeric character count
    results.sort(key=lambda t: len([c for c in t if c.isalnum()]), reverse=True)
    best_text = results[0]
    return best_text


def extract_ocr_from_bytes(image_bytes: bytes) -> str:
    """Extract text from image raw bytes."""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        return extract_ocr_from_pil(image)
    except Exception as e:
        print(f"[OCR Service] Error opening image bytes: {e}")
        return ""


def extract_ocr_from_base64(base64_str: str) -> str:
    """Extract text from a base64 encoded image string."""
    if not base64_str:
        return ""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(base64_str)
        return extract_ocr_from_bytes(img_bytes)
    except Exception as e:
        print(f"[OCR Service] Error decoding base64 image: {e}")
        return ""


def extract_ocr_from_file(file_path: str) -> str:
    """Extract text from an image file on disk."""
    try:
        image = Image.open(file_path)
        return extract_ocr_from_pil(image)
    except Exception as e:
        print(f"[OCR Service] Error opening image file {file_path}: {e}")
        return ""


async def analyze_image_with_vision_or_ocr(image_base64_str: str) -> str:
    """
    Hybrid Image Analysis:
    1. First attempts Ollama Vision Model (if available).
    2. If Ollama vision model fails, is missing, or returns empty, falls back to enhanced multi-pass Tesseract OCR.
    """
    from app.config import settings
    from app.llm.ollama_client import ollama_client

    if not image_base64_str:
        return ""

    formatted_b64 = image_base64_str if image_base64_str.startswith("data:") else f"data:image/jpeg;base64,{image_base64_str}"

    # 1. Try Vision Model via Ollama
    vision_model = getattr(settings, "VISION_MODEL_NAME", "llama3.2-vision")
    prompt = (
        "Analyze this image in detail. Extract all readable text, titles, numbers, tables, "
        "and describe the visual elements, symbols, layout, and contents accurately."
    )
    messages_vision = [{
        "role": "user",
        "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": formatted_b64}}
        ]
    }]

    try:
        vision_response = await ollama_client.generate_chat_completion(messages_vision, model_override=vision_model)
        if vision_response and vision_response.strip():
            print(f"[Vision/OCR] Vision model '{vision_model}' responded successfully.")
            return vision_response.strip()
    except Exception as e:
        print(f"[Vision/OCR] Vision model '{vision_model}' call failed or not found ({e}). Falling back to Tesseract OCR.")

    # 2. Fallback to Multi-Pass Tesseract OCR
    ocr_result = extract_ocr_from_base64(image_base64_str)
    if ocr_result:
        print(f"[Vision/OCR] Tesseract OCR extracted {len(ocr_result)} chars successfully.")
    return ocr_result
