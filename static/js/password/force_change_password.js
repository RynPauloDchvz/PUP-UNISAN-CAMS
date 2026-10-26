const forceChangeData = (function() {
    try {
        const el = document.getElementById('force-change-data');
        return el ? JSON.parse(el.textContent) : { role: '', email: '' };
    } catch(e) {
        return { role: '', email: '' };
    }
})();

const { createApp } = Vue;
        createApp({
            delimiters: ['[[', ']]'],
            data() {
                // Initialize theme
                const savedTheme = localStorage.getItem('theme');
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
                
                if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.body.style.backgroundColor = '#121212';
                }

                return {
                    isDark: isDark,
                    role: forceChangeData.role || (window.location.pathname.includes('student') ? 'student' : (window.location.pathname.includes('adviser') ? 'adviser' : 'organizer')),
                    phase: 1, // Phase 1: Password, Phase 2: Face Scan, Phase 3: Email OTP
                    passwords: { new: '', retype: '' },
                    showPassword: false,
                    showRetype: false,

                    // Tutorial Rules Modal
                    showRulesModal: false,
                    hasSeenRulesModal: false,
                    showScannerModal: false,

                    // Duplicate Face Conflict Modal
                    duplicateConflictModal: { show: false, message: '' },
                    isCheckingDuplicate: false,

                    // Biometrics state & Anti-Spoofing
                    livenessDetector: new FaceLivenessDetector(),
                    livenessMessage: 'ALIGN FACE IN CENTER',
                    isLiveVerified: false,
                    isStaticPhoto: false,
                    modelsLoaded: false,
                    loadingModels: false,
                    isCameraActive: false,
                    videoStream: null,
                    capturedFace: null,
                    capturedFaceDescriptor: null,
                    faceCaptured: false,
                    qualityScore: 0,
                    qualityStatus: {
                        isReady: false,
                        obstructed: false,
                        noFaceDetail: false,
                        tooDark: false,
                        tooBright: false
                    },
                    validationInterval: null,

                    // Email & OTP state
                    email: forceChangeData.email || '', 
                    otp: ['', '', '', '', '', ''],
                    isSending: false,
                    isVerifying: false,
                    countdown: 0,
                    timer: null,
                    toast: { show: false, message: '', type: 'success' }
                }
            },
            mounted() {
                // Preload FaceAPI model in the background
                this.loadModels();
            },
            beforeUnmount() {
                this.stopCamera();
            },
            methods: {
                showToast(message, type='success') {
                    this.toast.message = message;
                    this.toast.type = type;
                    this.toast.show = true;
                    setTimeout(() => { this.toast.show = false; }, 4000);
                },
                toggleTheme() {
                    this.isDark = !this.isDark;
                    if (this.isDark) {
                        document.documentElement.classList.add('dark');
                        document.body.style.backgroundColor = '#121212';
                        localStorage.setItem('theme', 'dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                        document.body.style.backgroundColor = '#ffffff';
                        localStorage.setItem('theme', 'light');
                    }
                },

                // ==========================================
                // PHASE 1 LOGIC
                // ==========================================
                async goToPhase2() {
                    if (!this.passwords.new || !this.passwords.retype) {
                        this.showToast("Please enter and confirm your new password.", "error");
                        return;
                    }
                    if (this.passwords.new !== this.passwords.retype) {
                        this.showToast("Passwords do not match.", "error");
                        return;
                    }
                    if (this.passwords.new.length < 8) {
                        this.showToast("Password must be at least 8 characters long.", "error");
                        return;
                    }

                    this.phase = 2;

                    // First time going to Phase 2: Show Tutorial Modal!
                    if (!this.hasSeenRulesModal) {
                        this.showRulesModal = true;
                        this.hasSeenRulesModal = true;
                    }
                },

                closeRulesModalAndStart() {
                    this.showRulesModal = false;
                    this.openScannerModal();
                },

                openScannerModal() {
                    this.showScannerModal = true;
                    this.$nextTick(async () => {
                        await this.startCamera();
                    });
                },

                closeScannerModal() {
                    this.stopCamera();
                    this.showScannerModal = false;
                },

                // ==========================================
                // PHASE 2: BIOMETRIC FACE LOGIC
                // ==========================================
                async loadModels() {
                    if (this.modelsLoaded || this.loadingModels) return;
                    this.loadingModels = true;
                    const MODEL_PATH = "/static/models";
                    const CDN_FALLBACK = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
                    try {
                        if (typeof faceapi !== 'undefined' && faceapi.nets) {
                            try {
                                await Promise.all([
                                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
                                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
                                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH)
                                ]);
                                this.modelsLoaded = true;
                            } catch(localErr) {
                                console.warn("Local models load warning, falling back to CDN:", localErr);
                                await Promise.all([
                                    faceapi.nets.tinyFaceDetector.loadFromUri(CDN_FALLBACK),
                                    faceapi.nets.faceLandmark68Net.loadFromUri(CDN_FALLBACK),
                                    faceapi.nets.faceRecognitionNet.loadFromUri(CDN_FALLBACK)
                                ]);
                                this.modelsLoaded = true;
                            }
                        }
                    } catch (err) {
                        console.warn("FaceAPI model background load warning:", err);
                    } finally {
                        this.loadingModels = false;
                    }
                },

                async startCamera() {
                    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                        this.showToast("Security: Camera requires HTTPS or localhost.", "error");
                        return;
                    }
                    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                        this.showToast("Camera access is not supported by your browser.", "error");
                        return;
                    }

                    try {
                        await this.loadModels();
                        const stream = await navigator.mediaDevices.getUserMedia({
                            video: {
                                facingMode: 'user',
                                width: { ideal: 640 },
                                height: { ideal: 640 }
                            }
                        });

                        this.videoStream = stream;
                        this.livenessDetector.reset();
                        this.isLiveVerified = false;
                        this.isStaticPhoto = false;
                        this.livenessMessage = 'ALIGN FACE IN CENTER';
                        if (this.$refs.video) {
                            this.$refs.video.srcObject = stream;
                            this.$refs.video.onloadedmetadata = () => {
                                this.$refs.video.play();
                                this.isCameraActive = true;
                                this.startQualityValidation();
                            };
                        }
                    } catch (err) {
                        if (err.name === 'NotAllowedError') {
                            this.showToast("Camera permission denied. Please allow camera access.", "error");
                        } else {
                            this.showToast("Camera Error: " + err.message, "error");
                        }
                    }
                },

                stopCamera() {
                    if (this.validationInterval) {
                        clearInterval(this.validationInterval);
                        this.validationInterval = null;
                    }
                    if (this.videoStream) {
                        this.videoStream.getTracks().forEach(track => track.stop());
                        this.videoStream = null;
                    }
                    this.isCameraActive = false;
                },

                startQualityValidation() {
                    if (this.validationInterval) clearInterval(this.validationInterval);
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    this.validationInterval = setInterval(async () => {
                        if (!this.isCameraActive || this.faceCaptured || !this.$refs.video) return;
                        const video = this.$refs.video;
                        if (video.videoWidth === 0 || video.videoHeight === 0) return;

                        // 1. Brightness Analysis
                        canvas.width = 64; canvas.height = 64;
                        ctx.drawImage(video, 0, 0, 64, 64);
                        const data = ctx.getImageData(0, 0, 64, 64).data;
                        let brightness = 0;
                        let glareCount = 0;
                        const total = 64 * 64;
                        for (let i = 0; i < data.length; i += 4) {
                            const r = data[i], g = data[i+1], bP = data[i+2];
                            brightness += (r + g + bP) / 3;
                            if (r > 248 && g > 248 && bP > 248) glareCount++;
                        }
                        const avgBrightness = brightness / total;
                        this.qualityStatus.tooDark = avgBrightness < 40;
                        this.qualityStatus.tooBright = avgBrightness > 230;
                        this.qualityStatus.glare = (glareCount / total) > 0.12;

                        // 2. Strict Human Face Detection with Anti-Spoofing & Liveness
                        try {
                            if (typeof faceapi !== 'undefined' && faceapi.detectAllFaces) {
                                const faces = await faceapi.detectAllFaces(
                                    video,
                                    new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.65 })
                                ).withFaceLandmarks();

                                this.qualityStatus.obstructed = (faces.length === 0);
                                this.qualityStatus.noFaceDetail = (faces.length > 1);

                                if (faces.length === 0) {
                                    this.livenessDetector.reset();
                                    this.qualityScore = 15;
                                    this.qualityStatus.isReady = false;
                                    this.isLiveVerified = false;
                                    this.isStaticPhoto = false;
                                    this.livenessMessage = 'ALIGN WHOLE FACE IN FRAME';
                                    return;
                                }

                                if (faces.length > 1) {
                                    this.livenessDetector.reset();
                                    this.qualityScore = 20;
                                    this.qualityStatus.isReady = false;
                                    this.isLiveVerified = false;
                                    this.isStaticPhoto = false;
                                    this.livenessMessage = 'MULTIPLE FACES DETECTED';
                                    return;
                                }

                                const face = faces[0];
                                const box = face.box || (face.detection && face.detection.box);

                                // Whole face visibility check (off-center allowed, must be fully in frame)
                                const isWholeFace = box.x >= 6 && box.y >= 6 && 
                                                    (box.x + box.width) <= (video.videoWidth - 6) && 
                                                    (box.y + box.height) <= (video.videoHeight - 6) &&
                                                    box.width >= 95;

                                const livenessRes = this.livenessDetector.processFrame(face, video.videoWidth, video.videoHeight);
                                this.livenessMessage = livenessRes.message;
                                this.isLiveVerified = livenessRes.isLive;
                                this.isStaticPhoto = (livenessRes.status === 'STATIC_PHOTO_DETECTED' || livenessRes.status === 'SPOOF_REJECTED');

                                if (this.qualityStatus.tooDark || this.qualityStatus.tooBright || this.qualityStatus.glare) {
                                    this.qualityScore = 40;
                                    this.qualityStatus.isReady = false;
                                } else if (!isWholeFace) {
                                    this.qualityScore = 65;
                                    this.qualityStatus.isReady = false;
                                } else if (this.isLiveVerified) {
                                    this.qualityScore = 100;
                                    this.qualityStatus.isReady = true;
                                } else {
                                    this.qualityScore = 75;
                                    this.qualityStatus.isReady = false;
                                }
                            }
                        } catch (err) {
                            console.error("Biometric detection cycle error:", err);
                        }
                    }, 150);
                },

                async captureFace() {
                    if (!this.isLiveVerified || !this.livenessDetector.isLive) {
                        this.showToast("Anti-Spoofing: Full live face verification required. Static photos and gallery images are strictly prohibited.", "error");
                        return;
                    }
                    if (!this.qualityStatus.isReady || this.qualityStatus.obstructed || this.qualityStatus.noFaceDetail || this.isCheckingDuplicate) {
                        this.showToast("Biometric verification failed. Please position a real face in the frame.", "error");
                        return;
                    }

                    const video = this.$refs.video;
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);

                    let detection = null;
                    try {
                        detection = await faceapi
                            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
                            .withFaceLandmarks()
                            .withFaceDescriptor();
                    } catch (err) {
                        console.warn("Face descriptor extraction error:", err);
                    }

                    if (!detection || !detection.descriptor) {
                        this.showToast("Face could not be clearly extracted. Please ensure good lighting.", "error");
                        return;
                    }

                    const descriptorJson = JSON.stringify(Array.from(detection.descriptor));

                    // 🟢 BIOMETRIC UNIQUENESS PRE-CHECK 🟢
                    this.isCheckingDuplicate = true;
                    try {
                        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
                        const tokenValue = csrfToken ? csrfToken.split('=')[1] : '';

                        const checkForm = new FormData();
                        checkForm.append('face_encoding', descriptorJson);

                        const checkResp = await fetch('/api/check-face-duplicate/', {
                            method: 'POST',
                            headers: { 'X-CSRFToken': tokenValue },
                            body: checkForm
                        });
                        const checkData = await checkResp.json();

                        if (checkData.is_duplicate) {
                            this.capturedFace = null;
                            this.capturedFaceDescriptor = null;
                            this.faceCaptured = false;
                            this.duplicateConflictModal = {
                                show: true,
                                message: checkData.message || "This facial biometric identity is already enrolled under an existing account."
                            };
                            this.showToast(checkData.message, "error");
                            return;
                        }
                    } catch (e) {
                        console.warn("Pre-check face duplicate error:", e);
                    } finally {
                        this.isCheckingDuplicate = false;
                    }

                    this.capturedFaceDescriptor = descriptorJson;
                    this.capturedFace = canvas.toDataURL('image/jpeg', 0.92);
                    this.faceCaptured = true;
                    this.stopCamera();
                    this.showScannerModal = false;
                    this.showToast("Biometric face successfully verified!", "success");
                },

                retakeFace() {
                    this.faceCaptured = false;
                    this.capturedFace = null;
                    this.capturedFaceDescriptor = null;
                    this.qualityScore = 0;
                    this.qualityStatus.isReady = false;
                    this.duplicateConflictModal = { show: false, message: '' };
                    this.openScannerModal();
                },

                closeDuplicateModalAndRetake() {
                    this.duplicateConflictModal = { show: false, message: '' };
                    this.openScannerModal();
                },

                goToPhase3() {
                    if (!this.capturedFace || !this.capturedFaceDescriptor) {
                        this.showToast("Please capture your face before proceeding to email verification.", "error");
                        return;
                    }
                    if (this.duplicateConflictModal && this.duplicateConflictModal.show) {
                        return;
                    }
                    this.stopCamera();
                    this.phase = 3;
                },

                // ==========================================
                // PHASE 3: EMAIL WITH OTP LOGIC
                // ==========================================
                moveOtp(index, event) {
                    if (event.key === 'Backspace' && index > 0 && !this.otp[index]) {
                        this.$refs.otpInputs[index - 1].focus();
                    } else if (this.otp[index] && index < 5) {
                        this.$refs.otpInputs[index + 1].focus();
                    }
                },

                handlePaste(e) {
                    e.preventDefault();
                    let pastedData = e.clipboardData.getData('text').slice(0, 6);
                    for (let i = 0; i < pastedData.length; i++) {
                        this.otp[i] = pastedData[i];
                    }
                    if (pastedData.length === 6) {
                        this.$refs.otpInputs[5].focus();
                    }
                },

                async sendOtp() {
                    if (!this.email) {
                        this.showToast("Please enter your email.", "error");
                        return;
                    }
                    this.isSending = true;
                    
                    const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
                    const tokenValue = csrfToken ? csrfToken.split('=')[1] : '';

                    const formData = new FormData();
                    formData.append('email', this.email);

                    try {
                        const targetRole = this.role || 'organizer';
                        const response = await fetch(`/${targetRole}/api/force-change-send-otp/`, {
                            method: 'POST',
                            headers: { 'X-CSRFToken': tokenValue },
                            body: formData
                        });
                        const data = await response.json();
                        if (data.status === 'success') {
                            this.showToast(data.message, "success");
                            this.countdown = 60;
                            if (this.timer) clearInterval(this.timer);
                            this.timer = setInterval(() => {
                                this.countdown--;
                                if (this.countdown <= 0) clearInterval(this.timer);
                            }, 1000);
                        } else {
                            this.showToast(data.message, "error");
                        }
                    } catch (error) {
                        this.showToast("Connection error.", "error");
                    } finally {
                        this.isSending = false;
                    }
                },

                async finalizePasswordChange() {
                    const otpCode = this.otp.join('');
                    if (otpCode.length < 6) {
                        this.showToast("Please enter the complete 6-digit OTP.", "error");
                        return;
                    }
                    if (!this.capturedFace) {
                        this.showToast("Face registration is required. Please go back to Phase 2.", "error");
                        return;
                    }

                    this.isVerifying = true;
                    
                    const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
                    const tokenValue = csrfToken ? csrfToken.split('=')[1] : '';

                    const formData = new FormData();
                    formData.append('password', this.passwords.new);
                    formData.append('otp', otpCode);
                    formData.append('face_encoding', this.capturedFaceDescriptor || this.capturedFace);
                    formData.append('face_image', this.capturedFace);
                    formData.append('is_live_verified', 'true');

                    try {
                        const targetRole = this.role || 'organizer';
                        const response = await fetch(`/${targetRole}/api/force-change-finalize/`, {
                            method: 'POST',
                            headers: { 'X-CSRFToken': tokenValue },
                            body: formData
                        });
                        const data = await response.json();
                        if (data.status === 'success') {
                            this.showToast(data.message, "success");
                            setTimeout(() => {
                                window.location.href = data.redirect_url;
                            }, 1200);
                        } else {
                            if (data.message && data.message.includes("Biometric")) {
                                this.duplicateConflictModal = {
                                    show: true,
                                    message: data.message
                                };
                            }
                            this.showToast(data.message, "error");
                        }
                    } catch (error) {
                        this.showToast("Connection error.", "error");
                    } finally {
                        this.isVerifying = false;
                    }
                }
            }
        }).mount('#app');
