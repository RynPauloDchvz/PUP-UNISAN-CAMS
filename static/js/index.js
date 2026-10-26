const { createApp } = Vue;

const appRoot = document.getElementById('app');

createApp({
    delimiters: ['[[', ']]'], 
    data() {
        return {
            isDark: false,
            currentView: 'login', 
            
            // LOCKOUT STATE
            isLocked: appRoot ? appRoot.dataset.isLocked === 'true' : false,
            lockoutTime: appRoot ? Number(appRoot.dataset.lockoutTime || 0) : 0,
            lockoutInterval: null,
            showAttemptModal: false,
            showWaitModal: false,
            showOrgSelectModal: false,
            orgChoices: [],
            
            modelsLoaded: false,
            attemptCount: 0,

            // LOGIN DATA
            showPassword: false,
            isLoggingIn: false,
            loginData: { username: '', password: '' },

            // REGISTER DATA
            registerStep: 1,
            accountType: '', // 'academic' or 'non-academic'
            profilePreview: null, coverPreview: null,
            capturedFace: null, capturedFaceDescriptor: null, faceCaptured: false,
            isCameraActive: false, videoStream: null,
            isSubmitting: false, isSendingOtp: false, 
            registerOtp: ['', '', '', '', '', ''],
            isVerifying: false, countdown: 0, timerInterval: null,
            
            // 🟢 ENHANCED QUALITY & LIVENESS STATE 🟢
            livenessDetector: typeof FaceLivenessDetector !== 'undefined' ? new FaceLivenessDetector() : null,
            livenessMessage: 'ALIGN FACE IN CENTER',
            isLiveVerified: false,
            isStaticPhoto: false,
            qualityStatus: { tooDark: false, tooBright: false, isCentered: false, obstructed: false, noFaceDetail: false, isReady: false },
            qualityScore: 0,
            validationInterval: null,
            
            formData: {
                full_name: '', student_number: '', birthdate: '',
                year_level: '', program: '', email_address: '', password: '',
            },
            toast: { show: false, message: '', type: 'success' }
        }
    },
    computed: {
        isModalActive() {
            return this.isLocked || this.showAttemptModal || this.showWaitModal || this.showOrgSelectModal;
        },
        // 🟢 DYNAMIC YEAR LEVEL LOGIC 🟢
        availableYears() {
            if (['DOMT', 'DIT'].includes(this.formData.program)) {
                return ['1st Year', '2nd Year', '3rd Year'];
            }
            return ['1st Year', '2nd Year', '3rd Year', '4th Year'];
        }
    },
    mounted() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') { this.isDark = true; document.documentElement.classList.add('dark'); }
        if (this.isLocked) { this.startLockoutCountdown(); }
    },
    methods: {
        showToast(message, type='success') {
            this.toast.message = message;
            this.toast.type = type;
            this.toast.show = true;
            setTimeout(() => { this.toast.show = false; }, 4000);
        },
        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        },
        startLockoutCountdown() {
            if (this.lockoutInterval) clearInterval(this.lockoutInterval);
            this.lockoutInterval = setInterval(() => {
                this.lockoutTime--;
                if (this.lockoutTime <= 0) {
                    clearInterval(this.lockoutInterval);
                    this.isLocked = false;
                    this.lockoutTime = 0;
                }
            }, 1000);
        },
        toggleTheme() {
            this.isDark = !this.isDark;
            document.documentElement.classList.toggle('dark', this.isDark);
            localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
        },
        stopCamera() {
            if (this.videoStream) {
                this.videoStream.getTracks().forEach(track => track.stop());
                this.videoStream = null;
            }
            this.isCameraActive = false;
            if (this.validationInterval) {
                clearInterval(this.validationInterval);
                this.validationInterval = null;
            }
        },
        switchView(view) {
            this.stopCamera(); 
            this.currentView = view;
            this.registerStep = 1;
            this.accountType = '';
            this.profilePreview = this.coverPreview = this.capturedFace = null;
            this.faceCaptured = this.isCameraActive = false;
            this.formData = { full_name: '', student_number: '', birthdate: '', year_level: '', program: '', email_address: '', password: '' };
        },

        // 🟢 AUTO RESET YEAR LEVEL KAPAG NAGPALIT NG PROGRAM 🟢
        handleProgramChange() {
            if (['DOMT', 'DIT'].includes(this.formData.program) && this.formData.year_level === '4th Year') {
                this.formData.year_level = '';
            }
        },

        async submitLogin() {
            if (!this.loginData.username || !this.loginData.password) {
                this.showToast("Please fill in both username and password.", "warning");
                return;
            }
            this.isLoggingIn = true;
            const formData = new FormData();
            formData.append('username', this.loginData.username);
            formData.append('password', this.loginData.password);
            const urlParams = new URLSearchParams(window.location.search);
            const nextParam = urlParams.get('next');
            if (nextParam) formData.append('next', nextParam);
            
            // Improved CSRF Token Retrieval
            let tokenValue = '';
            const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
            if (csrfToken) {
                tokenValue = csrfToken.split('=')[1];
            } else {
                const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
                if (csrfInput) tokenValue = csrfInput.value;
            }

            try {
                const response = await fetch('/portal/login/', { method: 'POST', headers: { 'X-CSRFToken': tokenValue }, body: formData });
                const data = await response.json();
                if (data.status === 'success') window.location.href = data.redirect_url;
                else if (data.status === 'select_org') {
                    this.orgChoices = data.organizations;
                    this.showOrgSelectModal = true;
                }
                else if (data.status === 'lockout') {
                    this.isLocked = true;
                    this.lockoutTime = data.remaining;
                    this.showAttemptModal = false;
                    this.startLockoutCountdown();
                }
                else {
                    if (data.status === 'pending_approval' || (data.message && data.message.includes('pending approval'))) {
                        this.showWaitModal = true;
                    } else if (data.message && data.message.includes('Attempt')) {
                        const match = data.message.match(/\d+/);
                        if (match) this.attemptCount = parseInt(match[0]);
                        this.showAttemptModal = true;
                    } else {
                        this.showToast(data.message || "Invalid credentials.", 'error');
                    }
                }
            } catch (error) { this.showToast("Connection error.", 'error'); }
            finally { this.isLoggingIn = false; }
        },
        async selectAndLoginOrg(orgCode) {
            this.isLoggingIn = true;
            const formData = new FormData();
            formData.append('username', this.loginData.username);
            formData.append('password', this.loginData.password);
            formData.append('selected_org', orgCode);
            const urlParams = new URLSearchParams(window.location.search);
            const nextParam = urlParams.get('next');
            if (nextParam) formData.append('next', nextParam);

            let tokenValue = '';
            const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
            if (csrfToken) tokenValue = csrfToken.split('=')[1];
            else {
                const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
                if (csrfInput) tokenValue = csrfInput.value;
            }

            try {
                const response = await fetch('/portal/login/', { method: 'POST', headers: { 'X-CSRFToken': tokenValue }, body: formData });
                const data = await response.json();
                if (data.status === 'success') {
                    window.location.href = data.redirect_url;
                } else {
                    this.showToast(data.message || 'Error selecting organization.', 'error');
                }
            } catch (error) {
                this.showToast('Connection error.', 'error');
            } finally {
                this.isLoggingIn = false;
            }
        },
        previewImage(event, type) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => { this[type === 'profile' ? 'profilePreview' : 'coverPreview'] = e.target.result; };
                reader.readAsDataURL(file);
                if(type === 'profile') this.formData.profile_file = file;
                if(type === 'cover') this.formData.cover_file = file;
            }
        },
        
        // 🟢 CAMERA PERMISSION ALERT & START 🟢
        async startCamera() {
            try {
                if (!window.isSecureContext && window.location.hostname !== 'localhost') {
                    this.showToast("Security Error: Camera access requires a secure connection (HTTPS). Please use HTTPS or access via localhost.", "error");
                    return;
                }

                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    this.showToast("Device Error: Your browser or device does not support camera access.", "error");
                    return;
                }

                this.isCameraActive = false; 
                if (this.livenessDetector) this.livenessDetector.reset();
                this.isLiveVerified = false;
                this.isStaticPhoto = false;
                this.livenessMessage = 'ALIGN FACE IN CENTER';
                
                if (!this.modelsLoaded) {
                    const el = document.getElementById('app');
                    const MODEL_PATH = el?.dataset.modelPath || '/static/models';
                    const CDN_FALLBACK = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
                    try {
                        await Promise.all([
                            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
                            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
                            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH)
                        ]);
                        this.modelsLoaded = true;
                    } catch(e) {
                        console.warn("Local static load failed, falling back to CDN:", e);
                        try {
                            await Promise.all([
                                faceapi.nets.tinyFaceDetector.loadFromUri(CDN_FALLBACK),
                                faceapi.nets.faceLandmark68Net.loadFromUri(CDN_FALLBACK),
                                faceapi.nets.faceRecognitionNet.loadFromUri(CDN_FALLBACK)
                            ]);
                            this.modelsLoaded = true;
                        } catch(err) {
                            console.error("FaceAPI models could not be loaded:", err);
                        }
                    }
                }

                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'user', 
                        width: { ideal: 640 }, 
                        height: { ideal: 640 } 
                    } 
                });
                this.videoStream = stream;
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
                    this.showToast("Permission Denied: Please allow camera access in your browser settings.", "error");
                } else {
                    this.showToast("Camera Error: " + err.message, "error");
                }
            }
        },

        // 🟢 REVOLUTIONIZED QUALITY & ANTI-SPOOFING VALIDATION 🟢
        startQualityValidation() {
            if (this.validationInterval) clearInterval(this.validationInterval);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            this.validationInterval = setInterval(async () => {
                if (!this.isCameraActive || this.faceCaptured || !this.$refs.video) return;
                
                const video = this.$refs.video;
                if (video.videoWidth === 0) return;

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
                const isTooDark = avgBrightness < 40; 
                const isTooBright = avgBrightness > 230; 
                const isGlare = (glareCount / total) > 0.12;
                
                this.qualityStatus.tooDark = isTooDark; 
                this.qualityStatus.tooBright = isTooBright; 
                this.qualityStatus.glare = isGlare;
                
                try {
                    const faces = await faceapi
                        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.65 }))
                        .withFaceLandmarks();

                    this.qualityStatus.obstructed = faces.length === 0;
                    this.qualityStatus.noFaceDetail = faces.length > 1;
                    
                    if (faces.length === 0) {
                        if (this.livenessDetector) this.livenessDetector.reset();
                        this.qualityScore = 0;
                        this.qualityStatus.isReady = false;
                        this.isLiveVerified = false;
                        this.isStaticPhoto = false;
                        this.livenessMessage = 'ALIGN WHOLE FACE IN FRAME';
                        return;
                    }
                    if (faces.length > 1) {
                        if (this.livenessDetector) this.livenessDetector.reset();
                        this.qualityScore = 10;
                        this.qualityStatus.isReady = false;
                        this.isLiveVerified = false;
                        this.isStaticPhoto = false;
                        this.livenessMessage = 'MULTIPLE FACES DETECTED';
                        return;
                    }

                    if (this.livenessDetector) {
                        const livenessRes = this.livenessDetector.processFrame(faces[0], video.videoWidth, video.videoHeight);
                        this.livenessMessage = livenessRes.message;
                        this.isLiveVerified = livenessRes.isLive;
                        this.isStaticPhoto = (livenessRes.status === 'STATIC_PHOTO_DETECTED' || livenessRes.status === 'SPOOF_REJECTED');
                    }

                    if (this.qualityStatus.tooDark || this.qualityStatus.tooBright) {
                        this.qualityScore = 30;
                        this.qualityStatus.isReady = false;
                    } else if (this.isLiveVerified) {
                        this.qualityScore = 100;
                        this.qualityStatus.isReady = true;
                    } else {
                        this.qualityScore = 60;
                        this.qualityStatus.isReady = false;
                    }
                } catch (err) {
                    console.warn("Registration liveness check error:", err);
                }
                
            }, 150);
        },

        async captureFace() {
            if (!this.isLiveVerified || (this.livenessDetector && !this.livenessDetector.isLive)) {
                this.showToast("Anti-Spoofing: Full live face verification required. Static photos and gallery images are strictly prohibited.", "error");
                return;
            }
            if (!this.qualityStatus.isReady || this.qualityStatus.obstructed || this.qualityStatus.noFaceDetail) {
                this.showToast("Biometric alignment failed. Please fix scanner issues.", "error");
                return;
            }

            const video = this.$refs.video;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);

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
                this.showToast("Face not clearly detected. Please ensure good lighting.", "error");
                return;
            }

            this.capturedFaceDescriptor = JSON.stringify(Array.from(detection.descriptor));
            this.capturedFace = canvas.toDataURL('image/jpeg');
            this.faceCaptured = true; this.stopCamera();
        },
        retakeFace() { this.faceCaptured = false; this.capturedFace = null; this.capturedFaceDescriptor = null; this.startCamera(); },
        startCountdown() {
            this.countdown = 60;
            if(this.timerInterval) clearInterval(this.timerInterval);
            this.timerInterval = setInterval(() => {
                this.countdown--;
                if(this.countdown <= 0) clearInterval(this.timerInterval);
            }, 1000);
        },
        moveRegisterOtp(index, event) {
            if (event.key === 'Backspace' && index > 0 && !this.registerOtp[index]) {
                this.$refs.registerOtpInputs[index - 1].focus();
            } else if (this.registerOtp[index] && index < 5) {
                this.$refs.registerOtpInputs[index + 1].focus();
            }
        },
        handleRegisterOtpPaste(e) {
            e.preventDefault();
            let pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            for (let i = 0; i < pastedData.length; i++) {
                this.registerOtp[i] = pastedData[i];
            }
            if (pastedData.length === 6) {
                this.$refs.registerOtpInputs[5].focus();
            }
        },
        async sendRegistrationOtp() {
            if (!this.formData.email_address) {
                this.showToast("Please provide your email address first.", "warning");
                return;
            }
            this.isSendingOtp = true;
            const formData = new FormData();
            formData.append('email', this.formData.email_address);
            const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
            const tokenValue = csrfToken ? csrfToken.split('=')[1] : '';
            try {
                const response = await fetch('/student/send-register-otp', { method: 'POST', headers: { 'X-CSRFToken': tokenValue }, body: formData });
                const data = await response.json();
                if(data.status === 'success') { this.showToast(data.message, 'success'); this.startCountdown(); }
                else this.showToast(data.message, 'error');
            } catch (error) { this.showToast("Failed to connect.", 'error'); }
            finally { this.isSendingOtp = false; }
        },
        async verifyAndProceed() {
            const otpCode = this.registerOtp.join('');
            if(otpCode.length < 6) { this.showToast("Please enter the complete 6-digit OTP.", "warning"); return; }
            if(!this.formData.password) { this.showToast("Password required.", "warning"); return; }
            this.isVerifying = true;
            const formData = new FormData();
            formData.append('otp', otpCode);
            const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
            const tokenValue = csrfToken ? csrfToken.split('=')[1] : '';
            try {
                const response = await fetch('/student/verify-register-otp', { method: 'POST', headers: { 'X-CSRFToken': tokenValue }, body: formData });
                const data = await response.json();
                if (data.status === 'success') {
                    this.showToast("Email verified successfully.", "success");
                    this.registerStep = 5; 
                } else {
                    this.showToast(data.message, "error"); 
                }
            } catch (error) { this.showToast("Verification error.", "error"); }
            finally { this.isVerifying = false; }
        },
        async submitFinalRegistration() {
            this.isSubmitting = true;
            
            const orgMapping = { 'BSIT': 'ITO', 'BSENT': 'YEO', 'BPA': 'PAS', 'BEED': 'FTO', 'DOMT': 'ITS', 'DIT': 'ITS' };
            let assignedOrg = '';
            let finalProgram = this.formData.program;

            if (this.accountType === 'academic') {
                assignedOrg = orgMapping[this.formData.program] || 'UNKNOWN';
            } else {
                assignedOrg = this.formData.program; // Value is CAO, NEWSETTE, etc.
                finalProgram = 'Non-Academic';
            }

            const formData = new FormData();
            Object.keys(this.formData).forEach(key => {
                if (key !== 'program') {
                    formData.append(key, this.formData[key]);
                }
            });
            
            formData.append('organization', assignedOrg); 
            formData.append('program', finalProgram);
            formData.append('facial_registration_data', this.capturedFaceDescriptor || this.capturedFace); 
            formData.append('face_image', this.capturedFace); 
            formData.append('is_live_verified', 'true');
            
            if (this.formData.profile_file) formData.append('profile_picture', this.formData.profile_file);
            if (this.formData.cover_file) formData.append('cover_photo', this.formData.cover_file);
            
            const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
            const tokenValue = csrfToken ? csrfToken.split('=')[1] : '';
            try {
                const response = await fetch('/student/register', { method: 'POST', headers: { 'X-CSRFToken': tokenValue }, body: formData });
                const data = await response.json();
                if (data.status === 'success') { this.showToast(data.message, 'success'); this.switchView('login'); }
                else this.showToast(data.message, 'error');
            } catch (error) { this.showToast("Error connecting to server.", 'error'); }
            finally { this.isSubmitting = false; }
        }
    }
}).mount('#app');
