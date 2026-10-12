---
title: PUP UNISAN CAMS Face Recognition AI
emoji: 🤖
colorFrom: red
colorTo: yellow
sdk: gradio
app_file: app.py
pinned: false
---

# 🤖 PUP UNISAN CAMS - AI Face Verification Microservice

This microservice handles biometric facial verification for PUP Campus Activity Management System.

### Deployment Instructions on Hugging Face Spaces:
1. Log in to [Hugging Face](https://huggingface.co) (create a free account if you haven't yet).
2. Click **New Space** -> Name it `pup-unisan-cams-ai`.
3. Choose **Gradio** as the Space SDK (Free 16GB RAM tier).
4. Set Space hardware to **CPU Basic (Free - 16GB RAM)**.
5. Upload or push `app.py` and `requirements.txt` from this directory.
6. Once built, copy your Space URL (e.g., `https://<your-username>-pup-unisan-cams-ai.hf.space`) and paste it as `AI_SERVICE_URL` in your Render Environment Variables!
