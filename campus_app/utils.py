import json
from .models import AuditLog
from django.utils import timezone

def get_client_ip(request):
    """Extracts the client's IP address from the request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def log_audit_event(request, action, target_model=None, target_id=None, status='Success', changes=None, actor=None):
    """
    Helper function to manually log an audit event.
    Can be called from views, middleware, or guards.
    """
    try:
        if not actor:
            actor = request.user if request and request.user.is_authenticated else None
            
        ip = get_client_ip(request) if request else None
        ua = request.META.get('HTTP_USER_AGENT') if request else "System/Signal"

        # Ensure changes is a JSON-serializable dict
        if changes and not isinstance(changes, dict):
            try:
                changes = json.loads(changes)
            except:
                changes = {"raw_data": str(changes)}

        AuditLog.objects.create(
            actor=actor,
            action=action,
            target_model=target_model,
            target_id=str(target_id) if target_id else None,
            status=status,
            ip_address=ip,
            user_agent=ua,
            changes=changes
        )
    except Exception as e:
        # We don't want audit logging to crash the main app flow
        print(f"CRITICAL: Failed to log audit event: {str(e)}")

# ==========================================
# SENTIMENT ANALYSIS UTILITIES
# ==========================================
from .ai_utils import get_hf_sentiment, get_sentiment

# ==========================================
# 🟢 STUDENT MULTI-ORG CONTEXT PROCESSOR 🟢
# ==========================================
def student_org_context_processor(request):
    """
    Supplies active_org, user_orgs, and switcher info across student templates.
    """
    try:
        if hasattr(request, 'user') and request.user.is_authenticated:
            from .models import Student
            student = Student.objects.filter(user=request.user).first()
            if student:
                user_orgs = student.get_all_organizations()
                active_org = request.session.get('active_org')
                if not active_org or active_org not in user_orgs:
                    active_org = student.organization.strip() if student.organization else (user_orgs[0] if user_orgs else '')
                    request.session['active_org'] = active_org

                from .views import ORG_FULL_NAMES
                user_org_details = []
                for code in user_orgs:
                    logo = f"/static/images/orgImage/{code}/{code}.png"
                    if code == "PUSO":
                        logo = "/static/images/orgImage/PUSO/PUSO.jpg"
                    elif code in ("PRIDE", "PRIDEVerse", "BahaghariU"):
                        logo = "/static/images/footer/bahaghari.png"
                    user_org_details.append({
                        'code': code,
                        'name': ORG_FULL_NAMES.get(code, code),
                        'logo': logo
                    })

                return {
                    'active_org': active_org,
                    'user_orgs': user_orgs,
                    'user_org_details': user_org_details,
                    'active_org_full_name': ORG_FULL_NAMES.get(active_org, active_org),
                    'is_multi_org': len(user_orgs) > 1
                }
    except Exception:
        try:
            from django.db import connection
            connection.close()
        except Exception:
            pass
    return {
        'active_org': '',
        'user_orgs': [],
        'user_org_details': [],
        'active_org_full_name': '',
        'is_multi_org': False
    }
