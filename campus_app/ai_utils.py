import base64
import os
import sys
import tempfile
import cv2
import numpy as np

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

try:
    # pyrefly: ignore [missing-import]
    from deepface import DeepFace
except Exception as e:
    print(f"DeepFace initialization note: {e}")
    DeepFace = None

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer, NEGATE, BOOSTER_DICT

# Initialize VADER
analyzer = SentimentIntensityAnalyzer()

# 🇵🇭 TAGALOG/TAGLISH ENHANCEMENT 🇵🇭
tagalog_lexicon = {
    # Positive
    'maganda': 3.0, 'mahusay': 3.0, 'sulit': 2.5, 'salamat': 2.0, 'naintindihan': 2.0,
    'masaya': 2.5, 'nakatulong': 2.5, 'ayos': 2.0, 'lodi': 2.0, 'petmalu': 2.5,
    'mabait': 2.0, 'mabilis': 1.5, 'malinis': 1.5, 'organisado': 2.0, 'ganap': 1.5,
    'da best': 3.0, 'astig': 2.5, 'panalo': 3.0, 'good job': 2.5, 'nice': 2.0,
    'maraming natutunan': 3.0, 'helpful': 2.5, 'enjoy': 2.5, 'best': 3.0,
    
    # Negative
    'pangit': -3.0, 'sayang': -2.5, 'mabagal': -2.0, 'maingay': -1.5, 'gulo': -2.0,
    'hindi maganda': -3.0, 'failed': -3.0, 'boring': -2.5, 'panget': -3.0,
    'wala': -1.5, 'hindi helpful': -2.5, 'nakakaantok': -2.0, 'mahirap': -1.5,
    'magulo': -2.5, 'bulok': -3.5, 'bad': -2.5, 'late': -1.5,
    'walang kwenta': -3.5, 'sayang oras': -3.0, 'not helpful': -2.5, 'nothing': -1.5,
    'none': -1.5, 'disorganized': -2.0, 'waste': -2.5,
}

# Update constants
NEGATE.extend(['hindi', 'wala', 'huwag', 'di', 'hindi masyadong'])
BOOSTER_DICT.update({
    'sobra': 0.293, 'masyadong': 0.293, 'talaga': 0.293, 'napaka': 0.366,
    'super': 0.366, 'mas': 0.293
})

analyzer.lexicon.update(tagalog_lexicon)
analyzer.lexicon.update({
    'improvement': 0.5,
    'not helpful': -2.5,
    'not helpful at all': -3.0,
})

def base64_to_cv2(b64_string):
    """Converts a base64 string (with or without prefix) to a CV2 image."""
    if "," in b64_string:
        b64_string = b64_string.split(",")[1]
    
    img_data = base64.b64decode(b64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

# Hugging Face Configuration
HF_TOKEN = os.environ.get('HF_TOKEN')

def query_huggingface_model(model_id, payload, timeout=15):
    """
    Calls a Hugging Face model via the Inference API.
    Uses HF_TOKEN for authentication without loading heavy models locally into RAM.
    """
    token = os.environ.get('HF_TOKEN') or HF_TOKEN
    if not token:
        return None
    
    headers = {"Authorization": f"Bearer {token}"}
    urls = [
        f"https://router.huggingface.co/hf-inference/models/{model_id}",
        f"https://api-inference.huggingface.co/models/{model_id}",
    ]
    for url in urls:
        try:
            import requests
            response = requests.post(url, headers=headers, json=payload, timeout=timeout)
            if response.status_code == 200:
                return response.json()
        except Exception:
            continue
    return None

def verify_face(live_base64, anchor_base64):
    """
    Verifies if the face in live_base64 matches anchor_base64.
    If AI_SERVICE_URL is set (e.g. Hugging Face Spaces microservice), it delegates to the cloud API.
    Otherwise, it runs local DeepFace.
    """
    ai_service_url = os.environ.get('AI_SERVICE_URL')
    hf_token = os.environ.get('HF_TOKEN') or HF_TOKEN
    if ai_service_url:
        try:
            import requests
            endpoint = f"{ai_service_url.rstrip('/')}/verify"
            headers = {}
            if hf_token:
                headers['Authorization'] = f"Bearer {hf_token}"
            response = requests.post(
                endpoint,
                json={
                    "live_base64": live_base64,
                    "anchor_base64": anchor_base64
                },
                headers=headers,
                timeout=30
            )
            if response.status_code == 200:
                data = response.json()
                return bool(data.get('is_match', False)), float(data.get('distance', 1.0))
            else:
                print(f"AI Service HTTP {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Remote AI Service error, falling back to local if available: {e}")

    # Fallback to local DeepFace
    if DeepFace is None:
        print("DeepFace is not available locally and remote AI_SERVICE_URL was not reachable.")
        return False, 1.0

    try:
        img1 = base64_to_cv2(live_base64)
        img2 = base64_to_cv2(anchor_base64)
        
        # ArcFace provides superior accuracy for face recognition
        result = DeepFace.verify(
            img1_path=img1, 
            img2_path=img2, 
            enforce_detection=False,
            model_name='ArcFace', 
            detector_backend='opencv'
        )
        
        is_match = result['verified']
        dist = result.get('distance', 1.0)
        
        # Compensate for OpenCV detector misalignment
        if not is_match and dist < 0.85:
            is_match = True
            
        return is_match, dist
    except Exception as e:
        print(f"DeepFace ArcFace Error: {str(e)}")
        return False, 1.0

def get_sentiment(text):
    """
    Analyzes text and returns a sentiment breakdown.
    Specially handles structured feedback (Learning, Impact, Suggestions).
    """
    if not text or text.strip() == "":
        return {'compound': 0, 'pos': 0, 'neg': 0, 'neu': 1, 'label': 'neutral'}
    
    if "Learning:" in text and "Impact:" in text:
        lines = text.split('\n')
        section_compounds = []
        for line in lines:
            if ":" in line:
                parts = line.split(":", 1)
                label = parts[0].strip().lower()
                content = parts[1].strip() if len(parts) > 1 else ""
                
                neg_placeholders = ['nothing', 'none', 'n/a', 'ni', 'wala', 'no', 'not helpful', 'negative', 'not helpful at all', 'walang natutunan']
                if label in ['learning', 'impact'] and (content.lower() in neg_placeholders or not content):
                    section_compounds.append(-0.7)
                else:
                    section_compounds.append(analyzer.polarity_scores(content)['compound'])
            elif line.strip():
                section_compounds.append(analyzer.polarity_scores(line)['compound'])
        
        if section_compounds:
            avg_compound = sum(section_compounds) / len(section_compounds)
            min_compound = min(section_compounds)
            if min_compound <= -0.5:
                avg_compound = (avg_compound + min_compound) / 2
            vs = {'compound': round(avg_compound, 4), 'pos': 0, 'neg': 0, 'neu': 0}
        else:
            vs = analyzer.polarity_scores(text)
    else:
        vs = analyzer.polarity_scores(text)
    
    if vs['compound'] >= 0.05: label = 'positive'
    elif vs['compound'] <= -0.05: label = 'negative'
    else: label = 'neutral'
    vs['label'] = label
    return vs

def get_rating_sentiment(rating_1_to_5):
    try:
        r = float(rating_1_to_5)
        compound = (r - 3) / 2
        if compound >= 0.05: label = 'positive'
        elif compound <= -0.05: label = 'negative'
        else: label = 'neutral'
        return {'compound': compound, 'label': label}
    except:
        return {'compound': 0, 'label': 'neutral'}

def get_hf_sentiment(text, model_id="distilbert/distilbert-base-uncased-finetuned-sst-2-english"):
    """
    Runs sentiment analysis via Hugging Face Inference API.
    Falls back gracefully to Tagalog-enhanced VADER sentiment analysis
    if Hugging Face API is unavailable or offline.
    """
    if not text or not str(text).strip():
        return {'compound': 0, 'pos': 0, 'neg': 0, 'neu': 1, 'label': 'neutral', 'source': 'empty'}

    # Attempt Hugging Face Inference API if token is present
    token = os.environ.get('HF_TOKEN') or HF_TOKEN
    if token:
        try:
            result = query_huggingface_model(model_id, {"inputs": str(text)})
            if result and isinstance(result, list) and len(result) > 0:
                first = result[0]
                if isinstance(first, list):
                    labels = {item.get('label', '').upper(): float(item.get('score', 0)) for item in first if isinstance(item, dict)}
                    pos_score = labels.get('POSITIVE', labels.get('LABEL_2', 0.0))
                    neg_score = labels.get('NEGATIVE', labels.get('LABEL_0', 0.0))
                    neu_score = labels.get('NEUTRAL', labels.get('LABEL_1', 0.0))
                    compound = round(pos_score - neg_score, 4)
                    
                    label = 'neutral'
                    if compound >= 0.05:
                        label = 'positive'
                    elif compound <= -0.05:
                        label = 'negative'
                    
                    return {
                        'compound': compound,
                        'pos': pos_score,
                        'neg': neg_score,
                        'neu': neu_score,
                        'label': label,
                        'source': 'huggingface'
                    }
        except Exception as e:
            print(f"Hugging Face Inference note: {e}")

    # Fallback to local VADER with Tagalog/Taglish dictionary
    res = get_sentiment(text)
    res['source'] = 'vader_local'
    return res
