import json
import base64
import os
import sys
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

def parse_face_descriptor(face_data):
    """
    Parses a 128-dimensional face descriptor from JSON string, comma-separated string, or list/array.
    Returns np.ndarray with shape (128,) and float32 dtype, or None if invalid.
    """
    if not face_data:
        return None
    try:
        if isinstance(face_data, str):
            clean = face_data.strip()
            if clean.startswith('data:image'):
                return None
            if clean.startswith('[') and clean.endswith(']'):
                vec = json.loads(clean)
            else:
                vec = [float(x.strip()) for x in clean.strip('[]').split(',') if x.strip()]
        elif isinstance(face_data, (list, tuple, np.ndarray)):
            vec = list(face_data)
        else:
            return None

        arr = np.array(vec, dtype=np.float32)
        if arr.shape == (128,):
            return arr
    except Exception:
        pass
    return None

def check_duplicate_face(candidate_face, current_user=None, threshold=0.60):
    """
    Scans the database across Students, OrgProfiles, and AdviserProfiles to check
    if the candidate face descriptor matches any existing registered face.
    
    Excludes profiles belonging to `current_user` so that valid profile updates
    or re-verifications don't trigger false duplicate alarms against the user's own account.
    
    Returns:
        (is_duplicate: bool, matched_info: dict or None)
        matched_info: {'role': str, 'identifier': str, 'name': str, 'distance': float}
    """
    candidate_vec = parse_face_descriptor(candidate_face)
    if candidate_vec is None:
        return False, None

    # Lazy import to avoid circular dependency
    from .models import Student, OrgProfile, AdviserProfile

    records = []
    vectors = []

    # 1. Check Student records
    student_qs = Student.objects.exclude(face_encoding__isnull=True).exclude(face_encoding='')
    if current_user and getattr(current_user, 'is_authenticated', False):
        student_qs = student_qs.exclude(user=current_user)

    for s_id, s_num, s_name, encoding in student_qs.values_list('id', 'student_number', 'full_name', 'face_encoding'):
        vec = parse_face_descriptor(encoding)
        if vec is not None:
            vectors.append(vec)
            records.append({
                'role': 'Student',
                'id': s_id,
                'identifier': s_num,
                'name': s_name
            })

    # 2. Check OrgProfile records
    org_qs = OrgProfile.objects.exclude(face_encoding__isnull=True).exclude(face_encoding='')
    if current_user and getattr(current_user, 'is_authenticated', False):
        org_qs = org_qs.exclude(user=current_user)

    for o_id, org_name, encoding in org_qs.values_list('id', 'organization', 'face_encoding'):
        vec = parse_face_descriptor(encoding)
        if vec is not None:
            vectors.append(vec)
            records.append({
                'role': 'Organizer',
                'id': o_id,
                'identifier': org_name,
                'name': org_name
            })

    # 3. Check AdviserProfile records
    adv_qs = AdviserProfile.objects.exclude(face_encoding__isnull=True).exclude(face_encoding='')
    if current_user and getattr(current_user, 'is_authenticated', False):
        adv_qs = adv_qs.exclude(user=current_user)

    for a_id, a_username, encoding in adv_qs.values_list('id', 'user__username', 'face_encoding'):
        vec = parse_face_descriptor(encoding)
        if vec is not None:
            vectors.append(vec)
            records.append({
                'role': 'Adviser',
                'id': a_id,
                'identifier': a_username,
                'name': a_username
            })

    if not vectors:
        return False, None

    matrix = np.array(vectors, dtype=np.float32)
    diffs = matrix - candidate_vec
    distances = np.linalg.norm(diffs, axis=1)

    min_idx = int(np.argmin(distances))
    min_dist = float(distances[min_idx])

    if min_dist < threshold:
        matched = records[min_idx].copy()
        matched['distance'] = min_dist
        return True, matched

    return False, None

def verify_face(live_face, anchor_face, threshold=0.6):
    """
    Client-side Face-API Verification Engine.
    Compares two 128-dimensional face descriptors (JSON lists or numerical vectors)
    using Euclidean distance.
    Runs in < 0.2 milliseconds using NumPy with ZERO heavy server dependencies.
    Returns (is_match: bool, distance: float).
    """
    if not live_face or not anchor_face:
        return False, 1.0

    try:
        # Parse live descriptor
        if isinstance(live_face, str):
            live_clean = live_face.strip()
            if live_clean.startswith('[') and live_clean.endswith(']'):
                live_vec = json.loads(live_clean)
            else:
                live_vec = [float(x.strip()) for x in live_clean.strip('[]').split(',') if x.strip()]
        else:
            live_vec = list(live_face)

        # Parse anchor descriptor
        if isinstance(anchor_face, str):
            anchor_clean = anchor_face.strip()
            if anchor_clean.startswith('[') and anchor_clean.endswith(']'):
                anchor_vec = json.loads(anchor_clean)
            else:
                anchor_vec = [float(x.strip()) for x in anchor_clean.strip('[]').split(',') if x.strip()]
        else:
            anchor_vec = list(anchor_face)

        v1 = np.array(live_vec, dtype=np.float32)
        v2 = np.array(anchor_vec, dtype=np.float32)

        if v1.shape != (128,) or v2.shape != (128,):
            print(f"Face descriptor dimension mismatch: v1={v1.shape}, v2={v2.shape}")
            return False, 1.0

        distance = float(np.linalg.norm(v1 - v2))
        is_match = distance < threshold
        return is_match, distance
    except Exception as e:
        print(f"Face descriptor verification calculation error: {e}")
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
