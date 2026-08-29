import os
import base64
import urllib.parse
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = None
if OPENAI_API_KEY and OPENAI_API_KEY.startswith("sk-"):
    openai_client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI(title="AI Image Generator API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Dimension mapping ─────────────────────────────────────────────────────────
DIMENSIONS_MAP = {
    "square":    (1024, 1024),
    "portrait":  (768, 1024),
    "landscape": (1024, 768),
}

# ── Style prompt suffixes ─────────────────────────────────────────────────────
STYLE_MAP = {
    "realistic":   "hyperrealistic photography, 8k resolution, photorealistic masterpiece, sharp focus",
    "cinematic":   "cinematic film still, dramatic studio lighting, 35mm lens, atmospheric depth of field",
    "anime":       "anime aesthetic illustration, vibrant colors, clean lineart, Makoto Shinkai style",
    "3d":          "3D render, octane render, volumetric lighting, unreal engine 5, ray tracing",
    "digital_art": "digital concept art, intricate details, trending on artstation, masterpiece",
}


class GenerateRequest(BaseModel):
    prompt: str
    size: str = "square"       # square | portrait | landscape
    style: str = "realistic"   # realistic | cinematic | anime | 3d | digital_art
    count: int = 1             # 1 or 2


class ImageResult(BaseModel):
    images: list[str]          # base64 encoded strings
    mime_type: str = "image/png"
    provider: str = "ai"


def generate_with_pollinations(full_prompt: str, width: int, height: int, seed: int = None) -> str:
    """Generate high-quality AI images using free Flux/SD endpoint."""
    encoded_prompt = urllib.parse.quote(full_prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&nologo=true&enhance=true"
    if seed:
        url += f"&seed={seed}"

    with httpx.Client(timeout=60.0) as client:
        resp = client.get(url, headers={"User-Agent": "AI-Image-Generator/1.0"})
        resp.raise_for_status()
        return base64.b64encode(resp.content).decode("utf-8")


@app.get("/")
def root():
    return {"status": "AI Image Generator API is running"}


@app.post("/generate-image", response_model=ImageResult)
async def generate_image(req: GenerateRequest):
    """Generate images from a text prompt with automatic high-speed AI pipeline."""

    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    count = max(1, min(req.count, 2))
    width, height = DIMENSIONS_MAP.get(req.size, (1024, 1024))
    style_suffix = STYLE_MAP.get(req.style, "")
    full_prompt = f"{req.prompt.strip()}, {style_suffix}" if style_suffix else req.prompt.strip()

    encoded_images = []
    used_provider = "openai"

    # Try OpenAI first if configured
    if openai_client:
        try:
            for _ in range(count):
                resp = openai_client.images.generate(
                    model="gpt-image-1",
                    prompt=full_prompt,
                    size=f"{width}x{height}" if width == height else "1024x1024",
                    n=1
                )
                img_url = resp.data[0].url
                with httpx.Client(timeout=40.0) as client:
                    img_data = client.get(img_url).content
                    encoded_images.append(base64.b64encode(img_data).decode("utf-8"))
        except Exception as e:
            # Fallback to high-quality free AI generator if credits exhausted or model unavailable
            print(f"[Info] OpenAI unavailable ({e}), using free high-quality AI generator fallback.")
            encoded_images = []
            used_provider = "flux-ai"

    # Fallback / Direct Free AI Generator
    if not encoded_images:
        import time, random
        try:
            for i in range(count):
                seed = random.randint(100000, 999999) + i * 1337
                b64 = generate_with_pollinations(full_prompt, width, height, seed=seed)
                encoded_images.append(b64)
            used_provider = "flux-ai"
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Image generation failed: {str(exc)}")

    if not encoded_images:
        raise HTTPException(status_code=500, detail="Failed to generate images. Please try a different prompt.")

    return ImageResult(images=encoded_images, mime_type="image/png", provider=used_provider)
