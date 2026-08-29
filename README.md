# AI Image Generator

A modern, clean, and responsive AI Image Generator web application built with FastAPI and modern Vanilla JavaScript/CSS.

---

## ✨ Features

- 🎨 **Modern Clean UI**: Dark glassmorphism interface with smooth ambient glows and animations.
- ✍️ **Custom Text Prompts**: Dynamic input box with character counter and <kbd>Ctrl</kbd> + <kbd>Enter</kbd> keyboard shortcut.
- 📐 **Multiple Aspect Ratios**: Square (1:1), Portrait (9:16 / 3:4), and Landscape (16:9 / 4:3).
- 🎭 **Art Styles**: Realistic, Cinematic, Anime, 3D Render, and Digital Art.
- 🖼️ **Multi-Image Generation**: Generate 1 or 2 images per request.
- ⏳ **Loading Animations**: Custom shimmer placeholders and dynamic progress text.
- 📥 **Image Actions**: Download generated images with timestamps, Regenerate with same settings, or Clear the workspace.
- 🔒 **Secure Backend**: API keys are securely managed on the backend and never exposed to the client.

---

## 📁 Project Structure

```
ai-image-generator/
├── backend/
│   ├── main.py           # FastAPI backend server
│   ├── requirements.txt  # Backend dependencies
│   ├── .env.example      # Environment variables template
│   └── .env              # Secrets (git-ignored)
├── frontend/
│   ├── index.html        # Main landing page
│   ├── style.css         # Styling & responsive design
│   └── app.js            # Frontend logic & API interaction
└── README.md
```

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

Start the FastAPI backend:
```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### 2. Frontend Setup

Open `frontend/index.html` directly in your browser or run a simple local web server:

```bash
cd frontend
python -m http.server 3000
```

Access the web app at: **`http://localhost:3000`**

---

## 🔌 API Reference

### `POST /generate-image`

**Request Body:**
```json
{
  "prompt": "A majestic dragon on a crystal mountain peak at sunset",
  "size": "square",
  "style": "cinematic",
  "count": 1
}
```

**Response:**
```json
{
  "images": ["<base64_encoded_png>"],
  "mime_type": "image/png",
  "provider": "ai"
}
```
