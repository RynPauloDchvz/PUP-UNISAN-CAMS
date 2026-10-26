    const generatePasswordUrl = "/student/generate-password";
const updatePasswordUrl = "/student/update-password";

    // --- FACE UPDATE SCANNER LOGIC ---
    let updateStream = null;
    let updateInterval = null;
    let modelsLoaded = false;
    let capturedDescriptor = null;
    const livenessDetector = new FaceLivenessDetector();

    window.openFaceUpdateModal = function() {
        document.getElementById('faceUpdateModal').classList.remove('hidden');
        document.getElementById('settingsModal').classList.add('hidden');
        startFaceUpdateScanner();
    }

    window.closeFaceUpdateModal = function() {
        if (updateStream) { updateStream.getTracks().forEach(t => t.stop()); updateStream = null; }
        if (updateInterval) clearInterval(updateInterval);
        document.getElementById('faceUpdateModal').classList.add('hidden');
        document.getElementById('settingsModal').classList.remove('hidden');
    }

    async function loadUpdateModels() {
        const MODEL_PATH = "/static/models";
        const CDN_FALLBACK = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH)
            ]);
            modelsLoaded = true;
        } catch(e) {
            console.warn("Loading models from local static failed, falling back to CDN:", e);
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(CDN_FALLBACK),
                    faceapi.nets.faceLandmark68Net.loadFromUri(CDN_FALLBACK),
                    faceapi.nets.faceRecognitionNet.loadFromUri(CDN_FALLBACK)
                ]);
                modelsLoaded = true;
            } catch(err) {
                console.error("FaceAPI models could not be loaded:", err);
            }
        }
    }

    async function startFaceUpdateScanner() {
        const status = document.getElementById('faceUpdateStatus');
        const video = document.getElementById('faceUpdateVideo');
        const btn = document.getElementById('btnConfirmUpdateFace');
        const qualityMeter = document.getElementById('updateQualityMeter');

        livenessDetector.reset();
        status.innerText = "INITIALIZING AI CORE...";
        if (!modelsLoaded) await loadUpdateModels();

        try {
            updateStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } } 
            });
            video.srcObject = updateStream;
            
            video.onloadedmetadata = () => {
                video.play();
                
                status.innerText = "SEARCHING FOR FACE...";
                qualityMeter.classList.remove('opacity-0');

                const detectUpdateLoop = async () => {
                    if (!updateStream) return;
                    if (video.videoWidth === 0) {
                        setTimeout(detectUpdateLoop, 100);
                        return;
                    }
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = 64; canvas.height = 64;
                    const ctx = canvas.getContext('2d', {willReadFrequently: true});
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
                    const isGlare = (glareCount / total) > 0.12;
                    const isValidLighting = avgBrightness > 40 && avgBrightness < 230 && !isGlare;

                    try {
                        const detections = await faceapi
                            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.65 }))
                            .withFaceLandmarks();

                        if (!isValidLighting) {
                            livenessDetector.reset();
                            btn.disabled = true;
                            status.innerText = "ADJUSTING LIGHTING...";
                            status.className = "absolute top-4 left-4 right-4 bg-amber-600/90 backdrop-blur-2xl px-3 py-2 rounded-full text-white text-[8px] font-black uppercase tracking-[0.2em] text-center shadow-2xl z-20";
                            updateQuality(false);
                        } else if (detections.length === 0) {
                            livenessDetector.reset();
                            btn.disabled = true;
                            status.innerText = "NO FACE DETECTED";
                            status.className = "absolute top-4 left-4 right-4 bg-amber-600/90 backdrop-blur-2xl px-3 py-2 rounded-full text-white text-[8px] font-black uppercase tracking-[0.2em] text-center shadow-2xl z-20";
                            updateQuality(false);
                        } else if (detections.length > 1) {
                            livenessDetector.reset();
                            btn.disabled = true;
                            status.innerText = "MULTIPLE FACES DETECTED — SINGLE PERSON ONLY";
                            status.className = "absolute top-4 left-4 right-4 bg-red-600/90 backdrop-blur-2xl px-3 py-2 rounded-full text-white text-[8px] font-black uppercase tracking-[0.2em] text-center shadow-2xl z-20";
                            updateQuality(false);
                        } else {
                            const livenessRes = livenessDetector.processFrame(detections[0], video.videoWidth, video.videoHeight);
                            status.innerText = livenessRes.message;
                            if (livenessRes.isLive) {
                                btn.disabled = false;
                                status.className = "absolute top-4 left-4 right-4 bg-green-600/90 backdrop-blur-2xl px-3 py-2 rounded-full text-white text-[8px] font-black uppercase tracking-[0.2em] text-center shadow-2xl z-20 border border-green-400/50 shadow-green-500/30";
                                updateQuality(true);
                            } else if (livenessRes.status === 'STATIC_PHOTO_DETECTED') {
                                btn.disabled = true;
                                status.className = "absolute top-4 left-4 right-4 bg-red-700/95 backdrop-blur-2xl px-3 py-2 rounded-full text-white text-[8px] font-black uppercase tracking-[0.2em] text-center shadow-2xl z-20 animate-bounce border border-red-400";
                                updateQuality(false);
                            } else if (livenessRes.status === 'SPOOF_REJECTED') {
                                btn.disabled = true;
                                status.className = "absolute top-4 left-4 right-4 bg-red-800/95 backdrop-blur-2xl px-3 py-2 rounded-full text-white text-[8px] font-black uppercase tracking-[0.2em] text-center shadow-2xl z-20 border border-red-500";
                                updateQuality(false);
                            } else {
                                btn.disabled = true;
                                status.className = "absolute top-4 left-4 right-4 bg-cyan-700/90 backdrop-blur-2xl px-3 py-2 rounded-full text-white text-[8px] font-black uppercase tracking-[0.2em] text-center shadow-2xl z-20 animate-pulse border border-cyan-400/40";
                                updateQuality(false);
                            }
                        }
                    } catch (err) {
                        console.warn("Profile liveness error:", err);
                    }

                    if (updateStream) setTimeout(detectUpdateLoop, 150);
                };

                detectUpdateLoop();
            };

            btn.onclick = async () => {
                if (!livenessDetector.isLive) {
                    alert("Anti-Spoofing: Full live face verification required. Static photos and gallery images are strictly prohibited.");
                    return;
                }
                btn.disabled = true;
                btn.innerHTML = `<i class="ph-bold ph-spinner animate-spin"></i> SAVING...`;

                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth; 
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                const capturedImage = canvas.toDataURL('image/jpeg', 0.9);

                let detection = null;
                try {
                    detection = await faceapi
                        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
                        .withFaceLandmarks()
                        .withFaceDescriptor();
                } catch (err) {
                    console.warn("Face biometric extraction error:", err);
                }

                if (!detection || !detection.descriptor) {
                    alert("Face not clearly detected. Please face the camera directly in good lighting.");
                    btn.disabled = false;
                    btn.innerHTML = `<i class="ph-bold ph-fingerprint"></i> Confirm New Identity`;
                    return;
                }

                const descriptorArray = Array.from(detection.descriptor);
                const fd = new FormData();
                fd.append('face_encoding', JSON.stringify(descriptorArray));
                fd.append('face_image', capturedImage);
                fd.append('is_live_verified', 'true');
                
                try {
                    const resp = await fetch("/student/update-face", {
                        method: 'POST',
                        headers: { 'X-CSRFToken': getCsrfToken() },
                        body: fd
                    });
                    const data = await resp.json();
                    if (data.status === 'success') {
                        alert("Biometric identity updated successfully!");
                        closeFaceUpdateModal();
                        location.reload();
                    } else {
                        alert(data.message);
                        btn.disabled = false;
                        btn.innerHTML = `<i class="ph-bold ph-fingerprint"></i> Confirm New Identity`;
                    }
                } catch(e) {
                    alert("Network error.");
                    btn.disabled = false;
                }
            };

        } catch (err) {
            alert("Camera Error: " + err.message);
            closeFaceUpdateModal();
        }
    }

    function updateQuality(isGood) {
        const label = document.getElementById('updateQualityLabel');
        const b1 = document.getElementById('bar1');
        const b2 = document.getElementById('bar2');
        const b3 = document.getElementById('bar3');

        if (isGood) {
            label.innerText = "OPTIMIZED";
            label.className = "text-[8px] font-black text-green-500 uppercase tracking-widest leading-none";
            [b1, b2, b3].forEach(b => {
                b.classList.remove('bg-white/20');
                b.classList.add('bg-green-500');
            });
            b1.style.height = '40%'; b2.style.height = '70%'; b3.style.height = '100%';
        } else {
            label.innerText = "SCANNING...";
            label.className = "text-[8px] font-black text-white uppercase tracking-widest leading-none";
            [b1, b2, b3].forEach(b => {
                b.classList.remove('bg-green-500');
                b.classList.add('bg-white/20');
                b.style.height = '20%';
            });
        }
    }



    const notificationsText = document.getElementById('notifications-data').textContent;
    const parsedNotifications = notificationsText.trim() ? JSON.parse(notificationsText) : [];

    window.VUE_APP_DATA = {
        allNotifs: parsedNotifications
    };

    function getCsrfToken() {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; csrftoken=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    }

let cropper = null;
    let currentCroppingType = null;
    let croppedProfileBlob = null;
    let croppedCoverBlob = null;

    function previewImage(event, imgId) {
        const file = event.target.files[0];
        if (!file) return;
        
        currentCroppingType = imgId === 'profileImage' ? 'profile' : 'cover';
        
        const cropperImage = document.getElementById('cropperImage');
        cropperImage.src = URL.createObjectURL(file);
        document.getElementById('cropperModal').classList.remove('hidden');
        
        if (cropper) cropper.destroy();
        cropper = new Cropper(cropperImage, {
            aspectRatio: currentCroppingType === 'profile' ? 1 : 16/9,
            viewMode: 1,
            autoCropArea: 1,
        });
        
        event.target.value = ''; 
    }

    function confirmCrop() {
        if (!cropper) return;
        cropper.getCroppedCanvas({
            width: currentCroppingType === 'profile' ? 512 : 1280,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        }).toBlob(blob => {
            const imgEl = document.getElementById(currentCroppingType === 'profile' ? 'profileImage' : 'coverImage');
            imgEl.src = URL.createObjectURL(blob);
            
            if (currentCroppingType === 'profile') croppedProfileBlob = blob;
            else croppedCoverBlob = blob;
            
            closeCropperModal();
        }, 'image/jpeg', 0.9);
    }

    function closeCropperModal() {
        document.getElementById('cropperModal').classList.add('hidden');
        if (cropper) { cropper.destroy(); cropper = null; }
    }

    let isEditMode = false;
    async function toggleStudentProfileEdit() {
        const btn = document.getElementById('editBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        const btnText = document.getElementById('editBtnText');
        const btnMobile = document.getElementById('editBtnMobile');
        const nameDisplay = document.getElementById('profileFullNameDisplay');
        const nameInputContainer = document.getElementById('nameEditContainer');
        const inputEditName = document.getElementById('inputEditName');
        const yearDisplay = document.getElementById('yearDisplay');
        const yearSelect = document.getElementById('yearSelect');
        const profileOverlay = document.getElementById('profileEditOverlay');
        const coverOverlay = document.getElementById('coverEditOverlay');

        if (!isEditMode) {
            isEditMode = true;
            cancelBtn.classList.remove('hidden');
            settingsBtn.classList.add('hidden');
            btn.classList.replace('bg-[#800000]', 'bg-green-600');
            btn.classList.replace('dark:bg-[#D4AF37]', 'dark:bg-green-500');
            btn.classList.replace('dark:text-black', 'dark:text-white');
            btnText.innerText = "Save Changes";
            btnMobile.innerText = "Save";
            btn.querySelector('i').classList.replace('ph-pencil-simple', 'ph-floppy-disk');
            
            nameDisplay.style.display = 'none';
            nameInputContainer.style.display = 'flex';
            yearDisplay.classList.add('opacity-50');
            yearSelect.classList.remove('hidden');
            document.getElementById('yearChevron').classList.remove('hidden');
            profileOverlay.style.display = 'flex';
            coverOverlay.style.display = 'flex';

            // Remove uppercase from input to see actual casing
            inputEditName.classList.remove('uppercase');
            
            // Add Caps Lock Detector
            inputEditName.addEventListener('keyup', function(event) {
                if (event.getModifierState('CapsLock')) {
                    inputEditName.classList.add('border-amber-500');
                    inputEditName.title = "Warning: Caps Lock is ON";
                } else {
                    inputEditName.classList.remove('border-amber-500');
                    inputEditName.title = "";
                }
            });
        } else {
            btnText.innerText = "Saving...";
            btn.disabled = true;
            cancelBtn.classList.add('hidden');
            document.getElementById('yearChevron').classList.add('hidden');

            const formData = new FormData();
            formData.append('full_name', inputEditName.value);
            formData.append('year_level', yearSelect.value);
            // birthdate is now fixed, but we keep it in formData for API compatibility
            formData.append('birthdate', document.getElementById('birthInput').value);
            
            const profileFile = document.getElementById('profileFileInput').files[0];
            const coverFile = document.getElementById('coverFileInput').files[0];
            if (croppedProfileBlob) formData.append('profile_picture', croppedProfileBlob, 'profile.jpg');
            else if (profileFile) formData.append('profile_picture', profileFile);
            
            if (croppedCoverBlob) formData.append('cover_photo', croppedCoverBlob, 'cover.jpg');
            else if (coverFile) formData.append('cover_photo', coverFile);

            try {
                const response = await fetch("/student/update-profile", {
                    method: 'POST',
                    headers: { 'X-CSRFToken': getCsrfToken() },
                    body: formData
                });
                const data = await response.json();

                if(data.status === 'success') {
                    window.location.reload();
                } else { 
                    alert("Error: " + data.message); 
                    btnText.innerText = "Save Changes";
                    btnMobile.innerText = "Save";
                    cancelBtn.classList.remove('hidden');
                }
            } catch (error) { 
                alert("Server connection error."); 
                btnText.innerText = "Save Changes";
                btnMobile.innerText = "Save";
                cancelBtn.classList.remove('hidden');
            } 
            finally { btn.disabled = false; }
        }
    }

    function openSettingsModal() { document.getElementById('settingsModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
    function closeSettingsModal() { document.getElementById('settingsModal').classList.add('hidden'); document.body.style.overflow = ''; }
    
    function showPwToast(message, type='success') {
        const toast = document.createElement('div');
        toast.className = `fixed top-5 right-5 z-[9999] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all transform translate-x-full ${type === 'success' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' : 'bg-red-100 text-red-800 border-l-4 border-red-500'}`;
        toast.innerHTML = `
            <i class="ph-fill ${type === 'success' ? 'ph-check-circle' : 'ph-warning-circle'} text-2xl"></i>
            <span class="font-bold text-sm">${message}</span>
        `;
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full');
        });
        
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function openPasswordModal() { 
        document.getElementById('passwordModal').classList.remove('hidden'); 
        goToPhase1();
    }
    
    function closePasswordModal() {
        document.getElementById('passwordModal').classList.add('hidden');
    }

    function goToPhase2() {
        const newPw = document.getElementById('newPw').value;
        const retypePw = document.getElementById('retypePw').value;
        
        if (!newPw || !retypePw) {
            showPwToast("Please fill in both password fields.", 'error');
            return;
        }
        if (newPw !== retypePw) {
            showPwToast("Passwords do not match.", 'error');
            return;
        }
        if (newPw.length < 8) {
            showPwToast("Password must be at least 8 characters long.", 'error');
            return;
        }

        const phase1 = document.getElementById('pwPhase1');
        const phase2 = document.getElementById('pwPhase2');
        
        phase1.classList.add('opacity-0');
        setTimeout(() => {
            phase1.classList.add('hidden');
            phase1.classList.remove('flex');
            
            phase2.classList.remove('hidden');
            phase2.classList.add('flex');
            
            // Allow display:flex to apply before transitioning opacity
            requestAnimationFrame(() => {
                phase2.classList.remove('opacity-0');
            });
        }, 300);
        
        document.getElementById('pwProgressBar').style.width = '100%';
    }

    function goToPhase1() {
        const phase1 = document.getElementById('pwPhase1');
        const phase2 = document.getElementById('pwPhase2');

        phase2.classList.add('opacity-0');
        setTimeout(() => {
            phase2.classList.add('hidden');
            phase2.classList.remove('flex');
            
            phase1.classList.remove('hidden');
            phase1.classList.add('flex');
            
            requestAnimationFrame(() => {
                phase1.classList.remove('opacity-0');
            });
        }, 300);
        
        document.getElementById('pwProgressBar').style.width = '50%';
    }

    function moveOtpNext(input, index) {
        if (input.value.length === 1 && index < 6) {
            document.querySelectorAll('.otp-box')[index].focus();
        }
    }
    function moveOtpPrev(event, input, index) {
        if (event.key === 'Backspace' && input.value === '' && index > 0) {
            document.querySelectorAll('.otp-box')[index - 1].focus();
        }
    }
    function handleOtpPaste(event) {
        event.preventDefault();
        const paste = (event.clipboardData || window.clipboardData).getData('text');
        const pastedData = paste.replace(/[^0-9]/g, '').slice(0, 6).split('');
        const inputs = document.querySelectorAll('.otp-box');
        for (let i = 0; i < 6; i++) {
            if (pastedData[i]) {
                inputs[i].value = pastedData[i];
            }
        }
        if (pastedData.length > 0) {
            inputs[Math.min(pastedData.length, 6) - 1].focus();
        }
    }

    let otpCountdown = 0;
    let otpTimer = null;

    async function sendPasswordResetCode() {
        if (otpCountdown > 0) return;
        
        const btn = document.getElementById('btnGetCodeProfile');
        const btnText = document.getElementById('btnGetCodeText');
        
        btn.disabled = true;
        btnText.innerText = 'Sending...';
        
        const formData = new FormData();
        const emailVal = document.getElementById('emailDisplay').value;
        formData.append('email_address', emailVal);
        
        try {
            const resp = await fetch(generatePasswordUrl, { method: 'POST', headers: { 'X-CSRFToken': getCsrfToken() }, body: formData });
            const data = await resp.json();
            
            if (data.status === 'success') {
                showPwToast("Verification code sent to your email.");
                otpCountdown = 60;
                btnText.innerText = `Wait ${otpCountdown}s`;
                otpTimer = setInterval(() => {
                    otpCountdown--;
                    if (otpCountdown <= 0) {
                        clearInterval(otpTimer);
                        btn.disabled = false;
                        btnText.innerText = 'Send OTP';
                    } else {
                        btnText.innerText = `Wait ${otpCountdown}s`;
                    }
                }, 1000);
            } else {
                showPwToast(data.message, 'error');
                btn.disabled = false;
                btnText.innerText = 'Send OTP';
            }
        } catch (e) {
            showPwToast("Error sending code.", 'error');
            btn.disabled = false;
            btnText.innerText = 'Send OTP';
        }
    }

    function togglePasswordVisibility(inputId, eyeIconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(eyeIconId);
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('ph-eye', 'ph-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('ph-eye-slash', 'ph-eye');
        }
    }

    async function submitPasswordChange() {
        const newPw = document.getElementById('newPw').value;
        const retypePw = document.getElementById('retypePw').value;
        
        if (!newPw || !retypePw) {
            showPwToast("Please fill in both password fields.", 'error');
            return;
        }
        if (newPw !== retypePw) {
            showPwToast("Passwords do not match.", 'error');
            return;
        }
        if (newPw.length < 8) {
            showPwToast("Password must be at least 8 characters long.", 'error');
            return;
        }
        
        let otpCode = '';
        document.querySelectorAll('.otp-box').forEach(input => {
            otpCode += input.value;
        });
        
        if (otpCode.length !== 6) {
            showPwToast("Please enter the complete 6-digit OTP.", 'error');
            return;
        }

        const formData = new FormData();
        formData.append('code', otpCode);
        formData.append('new_password', newPw);
        
        const btn = document.getElementById('btnSubmitPassword');
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Updating...';
        
        try {
            const resp = await fetch(updatePasswordUrl, { method: 'POST', headers: { 'X-CSRFToken': getCsrfToken() }, body: formData });
            const data = await resp.json();
            if (data.status === 'success') {
                showPwToast("Password updated successfully!");
                setTimeout(() => location.reload(), 1500);
            } else {
                showPwToast(data.message, 'error');
                btn.disabled = false;
                btn.innerHTML = 'Update';
            }
        } catch (e) {
            showPwToast("Error updating password.", 'error');
            btn.disabled = false;
            btn.innerHTML = 'Update';
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        ['bgOverlayClose', 'btnTopClose'].forEach(id => {
            const btn = document.getElementById(id);
            if(btn) btn.addEventListener('click', window.closeHistoryModal);
        });
    });
