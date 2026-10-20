import os

# Render assigns PORT dynamically (defaulting to 10000 on Render, 8000 locally).
# Binding to 0.0.0.0:$PORT ensures Render's health checks and port scanner can detect the active service.
port = os.environ.get("PORT", "8000")
bind = f"0.0.0.0:{port}"

# Concurrency & timeouts suitable for Render containers
workers = int(os.environ.get("WEB_CONCURRENCY", "1"))
threads = int(os.environ.get("PYTHON_MAX_THREADS", "2"))
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "120"))
keepalive = 5
