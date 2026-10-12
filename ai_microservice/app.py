import os
import base64
import cv2
import numpy as np
from deepface import DeepFace
import gradio as gr
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="PUP UNISAN CAMS Face Recognition API")

def base64_to_cv2(b64_string):
    if "," in b64_string:
        b64_string = b64_string.split(",")[1]
    img_data = base64.b64decode(b64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "PUP UNISAN CAMS Face Verification AI Engine",
        "model": "ArcFace",
        "detector": "opencv"
    }

@app.post("/verify")
async def verify(request: Request):
    try:
        data = await request.json()
        live_b64 = data.get("live_base64")
        anchor_b64 = data.get("anchor_base64")
        
        if not live_b64 or not anchor_b64:
            return JSONResponse(
                {"error": "Missing live_base64 or anchor_base64", "is_match": False, "distance": 1.0},
                status_code=400
            )

        img1 = base64_to_cv2(live_b64)
        img2 = base64_to_cv2(anchor_b64)

        if img1 is None or img2 is None:
            return JSONResponse(
                {"error": "Unable to decode image frames", "is_match": False, "distance": 1.0},
                status_code=400
            )

        result = DeepFace.verify(
            img1_path=img1,
            img2_path=img2,
            enforce_detection=False,
            model_name='ArcFace',
            detector_backend='opencv'
        )

        is_match = bool(result.get('verified', False))
        dist = float(result.get('distance', 1.0))

        # Adjusted leniency threshold for OpenCV crop alignment
        if not is_match and dist < 0.85:
            is_match = True

        return {
            "status": "success",
            "is_match": is_match,
            "distance": round(dist, 4)
        }
    except Exception as e:
        print(f"DeepFace verification error: {str(e)}")
        return JSONResponse(
            {"error": str(e), "is_match": False, "distance": 1.0},
            status_code=500
        )

with gr.Blocks(title="PUP UNISAN CAMS - AI Engine") as demo:
    gr.Markdown("# 🤖 PUP UNISAN CAMS - Face Recognition AI Microservice")
    gr.Markdown("This Hugging Face Space powers facial biometric verification for PUP UNISAN CAMS.")
    gr.Markdown("### API Endpoints:")
    gr.Markdown("- **GET `/health`**: Health status check")
    gr.Markdown("- **POST `/verify`**: Face matching verification (`live_base64`, `anchor_base64`)")

app = gr.mount_gradio_app(app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
