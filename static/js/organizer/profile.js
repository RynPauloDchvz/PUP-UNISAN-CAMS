window.DEFAULT_LOGO = "/static/images/PUPLogo.png";
    let profileDistChartInstance = null;

    let profileOrgData = { readNotifs: [], notifSettingEnabled: false };
try {
    const el = document.getElementById('profile-organizer-data');
    if (el && el.textContent) profileOrgData = JSON.parse(el.textContent);
} catch(e) {}
let readNotifs = profileOrgData.readNotifs || [];
    let notifSettingEnabled = !!profileOrgData.notifSettingEnabled;

    function syncReadNotifications() {
        const formData = new FormData();
        formData.append('notif_ids', readNotifs.join(','));
        fetch("/organizer/api/mark-notifs-read/", {
            method: 'POST',
            headers: { 'X-CSRFToken': (document.querySelector('[name=csrfmiddlewaretoken]') ? document.querySelector('[name=csrfmiddlewaretoken]').value : '') },
            body: formData
        });
    }

    function initNotifications() {
        const notifItems = document.querySelectorAll('.notif-item');
        let unreadCount = 0;
        
        notifItems.forEach(item => {
            let notifId = "";
            if(item.hasAttribute('data-id')) { notifId = item.getAttribute('data-id'); }
            else if(item.hasAttribute('data-notif-id')) { notifId = item.getAttribute('data-notif-id'); }

            if(readNotifs.includes(notifId)) {
                item.classList.add('notif-read');
            } else {
                item.classList.remove('notif-read');
                unreadCount++;
            }
        });

        const toggle = document.getElementById('notifToggle');
        if (toggle) toggle.checked = notifSettingEnabled;
    }

    // 🟢 BINAGO ANG NOTIFICATION MESSAGES PARA SA 2-STEP APPROVAL 🟢
    function openEventMessage(element) {
        const notifId = element.dataset.id;
        const title = element.dataset.title;
        const status = element.dataset.status;
        const remarks = element.dataset.remarks;

        if(notifId && !readNotifs.includes(notifId)) {
            readNotifs.push(notifId);
            syncReadNotifications();
            initNotifications();
        }

        const modal = document.getElementById('eventMessageModal');
        const icon = document.getElementById('evtMsgIcon');
        const titleEl = document.getElementById('evtMsgTitle');
        const bodyEl = document.getElementById('evtMsgBody');
        const reasonBox = document.getElementById('evtMsgReasonContainer');
        const reasonText = document.getElementById('evtMsgReasonText');

        if(status === 'Approved') {
            icon.className = "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 border-4 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 text-green-500 text-4xl";
            icon.innerHTML = '<i class="ph-fill ph-check-circle"></i>';
            titleEl.innerText = "Event Officially Published!";
            titleEl.className = "text-xl sm:text-2xl font-black text-green-600 dark:text-green-500 mb-2 uppercase tracking-wide";
            
            if (title.toLowerCase().includes('flag raising')) {
                bodyEl.innerHTML = `This Global Event was published directly! Your event <strong>"${title}"</strong> is now live and attendance/evaluation is open for students globally.`;
            } else {
                bodyEl.innerHTML = `Congratulations! The Administration has verified your signed documents. Your event <strong>"${title}"</strong> is now fully approved and published in the system. The countdown timer is now active for the students!`;
            }
            reasonBox.classList.add('hidden');
        } 
        else if(status === 'Admin Approved' || status === 'Adviser Approved') {
            icon.className = "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 border-4 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-500 text-4xl";
            icon.innerHTML = '<i class="ph-fill ph-file-signature"></i>';
            titleEl.innerText = "Initial Approval Granted!";
            titleEl.className = "text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-500 mb-2 uppercase tracking-wide";
            bodyEl.innerHTML = `Great news! Your event proposal for <strong>"${title}"</strong> has received initial approval from your Adviser.<br><br><span class="text-pup-maroon dark:text-pup-gold font-bold">ACTION REQUIRED:</span> Please print the documents, secure all necessary manual signatures, and upload both the <strong class="text-gray-900 dark:text-white">Signed Request Letter</strong> and <strong class="text-gray-900 dark:text-white">Permit to Conduct Activity</strong> in your Document Vault to finalize the publication.`;
            reasonBox.classList.add('hidden');
        }
        else if (status === 'Permit Verification') {
            icon.className = "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 border-4 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 text-purple-500 text-4xl";
            icon.innerHTML = '<i class="ph-fill ph-file-search"></i>';
            titleEl.innerText = "Requirements Verification";
            titleEl.className = "text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-500 mb-2 uppercase tracking-wide";
            bodyEl.innerHTML = `Your uploaded signed documents for <strong>"${title}"</strong> are currently being verified by your Organization Adviser. Once verified, it will proceed to the Admin for final clearance.`;
            reasonBox.classList.add('hidden');
        }
        else if (status === 'Final Admin Review') {
            icon.className = "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 border-4 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 text-4xl";
            icon.innerHTML = '<i class="ph-fill ph-stamp"></i>';
            titleEl.innerText = "Final Admin Clearance";
            titleEl.className = "text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-500 mb-2 uppercase tracking-wide";
            bodyEl.innerHTML = `Your verified documents for <strong>"${title}"</strong> are now in the Admin Office (OSAS) for final clearance and publication.`;
            reasonBox.classList.add('hidden');
        }
        else if (status === 'Rejected') {
            icon.className = "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 border-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-500 text-4xl";
            icon.innerHTML = '<i class="ph-fill ph-x-circle"></i>';
            titleEl.innerText = "Event Rejected";
            titleEl.className = "text-xl sm:text-2xl font-black text-red-600 dark:text-red-500 mb-2 uppercase tracking-wide";
            bodyEl.innerHTML = `Unfortunately, your event proposal for <strong>"${title}"</strong> was rejected. Please review the reason below.`;
            reasonBox.classList.remove('hidden');
            reasonText.innerText = remarks && remarks.trim() !== 'None' ? remarks : "No specific reason provided.";
        } 
        else {
            icon.className = "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 border-4 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-500 text-4xl";
            icon.innerHTML = '<i class="ph-fill ph-clock"></i>';
            titleEl.innerText = "Event Pending";
            titleEl.className = "text-xl sm:text-2xl font-black text-yellow-600 dark:text-yellow-500 mb-2 uppercase tracking-wide";
            bodyEl.innerHTML = `Your event proposal for <strong>"${title}"</strong> is currently being reviewed. Please wait for further updates.`;
            reasonBox.classList.add('hidden');
        }

        const rect = element.getBoundingClientRect();
        const clickX = rect.left + rect.width / 2;
        const clickY = rect.top + rect.height / 2;
        
        const box = document.getElementById('eventMessageModalBox');
        box.style.setProperty('--click-x', clickX + 'px');
        box.style.setProperty('--click-y', clickY + 'px');
        box.classList.remove('ios-pop-wrapper-close');
        box.classList.add('ios-pop-wrapper');

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function openAnalyticsModal(element) {
        const title = element.dataset.title;
        const rating = element.dataset.rating;
        const sentiment = element.dataset.sentiment;
        const distStr = element.dataset.dist;
        
        document.getElementById('analyticsModalTitle').innerText = title;
        document.getElementById('analyticsModalRating').innerText = rating;
        document.getElementById('analyticsModalSentiment').innerText = sentiment + '%';
        
        const rect = element.getBoundingClientRect();
        const clickX = rect.left + rect.width / 2;
        const clickY = rect.top + rect.height / 2;
        
        const box = document.getElementById('analyticsModalBox');
        box.style.setProperty('--click-x', clickX + 'px');
        box.style.setProperty('--click-y', clickY + 'px');
        box.classList.remove('ios-pop-wrapper-close');
        box.classList.add('ios-pop-wrapper');
        
        document.getElementById('analyticsModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        if (distStr) {
            setTimeout(() => renderProfileSmoothChart(JSON.parse(distStr)), 10);
        }
    }
    
    function closeAnalyticsModal() {
        const box = document.getElementById('analyticsModalBox');
        box.classList.remove('ios-pop-wrapper');
        box.classList.add('ios-pop-wrapper-close');
        setTimeout(() => {
            document.getElementById('analyticsModal').classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }

    function renderProfileSmoothChart(dataArray) {
        const canvas = document.getElementById('profileDistChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        let gradient = ctx.createLinearGradient(0, 0, 0, 150);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.5)'); 
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

        if (profileDistChartInstance) { profileDistChartInstance.destroy(); }

        profileDistChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1★', '2★', '3★', '4★', '5★'],
                datasets: [{
                    data: dataArray,
                    borderColor: '#3b82f6', 
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4, 
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { display: false, beginAtZero: true, max: Math.max(...dataArray) + 5 }, 
                    x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { weight: 'bold', size: 10 } }, border: { display: false } }
                }
            }
        });
    }

    function markAllAsRead() {
        const notifItems = document.querySelectorAll('.notif-item');
        let hasNew = false;
        notifItems.forEach(item => {
            let notifId = "";
            if(item.hasAttribute('data-id')) { notifId = item.getAttribute('data-id'); }
            else if(item.hasAttribute('data-notif-id')) { notifId = item.getAttribute('data-notif-id'); }

            if(notifId && !readNotifs.includes(notifId)) {
                readNotifs.push(notifId);
                hasNew = true;
            }
        });
        if(hasNew) {
            syncReadNotifications();
            initNotifications();
        }
    }

    function toggleNotifSetting() {
        const toggle = document.getElementById('notifToggle');
        if (toggle) {
            notifSettingEnabled = toggle.checked;
            const formData = new FormData();
            formData.append('email_notifications', notifSettingEnabled);
            fetch("/organizer/api/update-notif-preference/", {
                method: 'POST',
                headers: { 'X-CSRFToken': (document.querySelector('[name=csrfmiddlewaretoken]') ? document.querySelector('[name=csrfmiddlewaretoken]').value : '') },
                body: formData
            });
            initNotifications();
        }
    }

    window.addEventListener('load', initNotifications);

    let cropper = null;
    let currentCroppingType = null;
    let croppedProfileBlob = null;
    let croppedCoverBlob = null;
    let originalProfileSrc = '';
    let originalCoverSrc = '';

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

    function closeEventMessage() {
        const box = document.getElementById('eventMessageModalBox');
        box.classList.remove('ios-pop-wrapper');
        box.classList.add('ios-pop-wrapper-close');
        setTimeout(() => {
            document.getElementById('eventMessageModal').classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }

    let isOrgEditMode = false;
    
    async function toggleOrgProfileEdit(isCancel = false) {
        const btn = document.getElementById('editBtn');
        const btnCancel = document.getElementById('cancelEditBtn');
        const btnText = document.getElementById('editBtnText');
        const btnMobile = document.getElementById('editBtnMobile');
        const nameDisplay = document.getElementById('profileFullNameDisplay');
        const nameInputContainer = document.getElementById('nameEditContainer');
        const inputEditName = document.getElementById('inputEditName');
        const profileOverlay = document.getElementById('profileEditOverlay');
        const coverOverlay = document.getElementById('coverEditOverlay');

        if (isCancel && isOrgEditMode) {
            isOrgEditMode = false;
            btnCancel.classList.add('hidden');
            btnCancel.classList.remove('flex');
            btn.classList.replace('bg-green-600', 'bg-[#800000]');
            btn.classList.replace('dark:bg-green-500', 'dark:bg-[#D4AF37]');
            btn.classList.replace('dark:text-white', 'dark:text-black');
            btnText.innerText = "Edit Profile";
            btnMobile.innerText = "Edit";
            btn.querySelector('i').classList.replace('ph-floppy-disk', 'ph-pencil-simple');
            
            nameInputContainer.style.display = 'none';
            nameDisplay.style.display = 'inline-block';
            profileOverlay.style.display = 'none';
            coverOverlay.style.display = 'none';
            inputEditName.value = nameDisplay.innerText.trim();

            if (originalProfileSrc) document.getElementById('profileImage').src = originalProfileSrc;
            if (originalCoverSrc) document.getElementById('coverImage').src = originalCoverSrc;
            croppedProfileBlob = null;
            croppedCoverBlob = null;
            const pInput = document.getElementById('profileFileInput');
            const cInput = document.getElementById('coverFileInput');
            if (pInput) pInput.value = '';
            if (cInput) cInput.value = '';
            return;
        }

        if (!isOrgEditMode) {
            isOrgEditMode = true;
            originalProfileSrc = document.getElementById('profileImage') ? document.getElementById('profileImage').src : '';
            originalCoverSrc = document.getElementById('coverImage') ? document.getElementById('coverImage').src : '';
            btnCancel.classList.remove('hidden');
            btnCancel.classList.add('flex');
            btn.classList.replace('bg-[#800000]', 'bg-green-600');
            btn.classList.replace('dark:bg-[#D4AF37]', 'dark:bg-green-500');
            btn.classList.replace('dark:text-black', 'dark:text-white');
            btnText.innerText = "Save Changes";
            btnMobile.innerText = "Save";
            btn.querySelector('i').classList.replace('ph-pencil-simple', 'ph-floppy-disk');
            
            nameDisplay.style.display = 'none';
            nameInputContainer.style.display = 'flex';
            profileOverlay.style.display = 'flex';
            coverOverlay.style.display = 'flex';

        } else {
            btnText.innerText = "Saving...";
            btn.disabled = true;

            const formData = new FormData();
            formData.append('full_name', inputEditName.value.trim());
            
            const pInputEl = document.getElementById('profileFileInput');
            const cInputEl = document.getElementById('coverFileInput');
            const profileFile = pInputEl && pInputEl.files ? pInputEl.files[0] : null;
            const coverFile = cInputEl && cInputEl.files ? cInputEl.files[0] : null;
            
            if (croppedProfileBlob) formData.append('profile_picture', croppedProfileBlob, 'profile.jpg');
            else if (profileFile) formData.append('profile_picture', profileFile);
            
            if (croppedCoverBlob) formData.append('cover_photo', croppedCoverBlob, 'cover.jpg');
            else if (coverFile) formData.append('cover_photo', coverFile);

            try {
                const response = await fetch("/organizer/api/update-profile/", {
                    method: 'POST',
                    headers: { 'X-CSRFToken': (document.querySelector('[name=csrfmiddlewaretoken]') ? document.querySelector('[name=csrfmiddlewaretoken]').value : '') },
                    body: formData
                });
                const data = await response.json();

                if(data.status === 'success') {
                    nameDisplay.innerText = inputEditName.value.trim();
                    isOrgEditMode = false;
                    btn.classList.replace('bg-green-600', 'bg-[#800000]');
                    btn.classList.replace('dark:bg-green-500', 'dark:bg-[#D4AF37]');
                    btn.classList.replace('dark:text-white', 'dark:text-black');
                    btnText.innerText = "Edit Profile";
                    btnMobile.innerText = "Edit";
                    btn.querySelector('i').classList.replace('ph-floppy-disk', 'ph-pencil-simple');
                    
                    nameInputContainer.style.display = 'none';
                    nameDisplay.style.display = 'inline-block';
                    profileOverlay.style.display = 'none';
                    coverOverlay.style.display = 'none';
                    alert("Profile successfully updated!");
                    location.reload(); // Reload to update header and images everywhere
                } else { 
                    alert("Error saving profile: " + data.message); 
                    btnText.innerText = "Save Changes"; 
                    btnMobile.innerText = "Save";
                }
            } catch (error) { 
                alert("Something went wrong connecting to the server."); 
                btnText.innerText = "Save Changes"; 
                btnMobile.innerText = "Save";
            } 
            finally {
                btn.disabled = false;
            }
        }
    }

    window.openLogoutModal = function() { document.getElementById('logoutModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; };
    window.closeLogoutModal = function() { document.getElementById('logoutModal').classList.add('hidden'); document.body.style.overflow = ''; };
    window.openSettingsModal = function() { document.getElementById('settingsModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; };
    window.closeSettingsModal = function() { document.getElementById('settingsModal').classList.add('hidden'); document.body.style.overflow = ''; };
    window.toggleOrgProfileEdit = toggleOrgProfileEdit;
    window.markAllAsRead = markAllAsRead;
    window.openEventMessage = openEventMessage;
    window.closeEventMessage = closeEventMessage;
    window.openAnalyticsModal = openAnalyticsModal;
    window.closeAnalyticsModal = closeAnalyticsModal;

const generatePasswordUrl = "/organizer/api/profile-generate-password/";
    const updatePasswordUrl = "/organizer/api/profile-update-password/";

    
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

    window.openPasswordModal = function() { 
        document.getElementById('settingsModal').classList.add('hidden');
        document.getElementById('passwordModal').classList.remove('hidden'); 
        document.body.style.overflow = 'hidden';
        goToPhase1();
    };
    
    window.closePasswordModal = function() {
        document.getElementById('passwordModal').classList.add('hidden');
        document.body.style.overflow = '';
    };

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

    function getCsrfToken() {
        const input = document.querySelector('[name=csrfmiddlewaretoken]');
        if (input) return input.value;
        const cookie = document.cookie.split('; ').find(r => r.startsWith('csrftoken='));
        return cookie ? cookie.split('=')[1] : '';
    }

    // --- BIOMETRIC MODAL & TOAST SYSTEM ---
    function showBiometricModal({
        type = 'error',
        title = '',
        message = '',
        policyHeader = '',
        policyBody = '',
        buttonText = 'Understood',
        onConfirm = null
    } = {}) {
        const modal = document.getElementById('biometricFeedbackModal');
        if (!modal) {
            alert(message);
            return;
        }

        const iconContainer = document.getElementById('bioModalIconContainer');
        const icon = document.getElementById('bioModalIcon');
        const titleEl = document.getElementById('bioModalTitle');
        const msgEl = document.getElementById('bioModalMessage');
        const policyBox = document.getElementById('bioModalPolicyBox');
        const policyHeaderEl = document.getElementById('bioModalPolicyHeader');
        const policyBodyEl = document.getElementById('bioModalPolicyBody');
        const btn = document.getElementById('bioModalBtn');
        const btnIcon = document.getElementById('bioModalBtnIcon');
        const btnText = document.getElementById('bioModalBtnText');

        titleEl.innerText = title;
        msgEl.innerText = message;

        if (type === 'conflict') {
            iconContainer.className = "w-16 h-16 mx-auto rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 transition-colors";
            icon.className = "ph-bold ph-shield-warning text-3xl";
            policyBox.classList.remove('hidden');
            policyBox.className = "p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-[11px] text-red-900 dark:text-red-300 text-left mb-5 space-y-1";
            policyHeaderEl.innerHTML = `<i class="ph-fill ph-prohibit"></i> ${policyHeader || 'Anti-Proxy Identity Policy:'}`;
            policyBodyEl.innerText = policyBody || "Only one (1) account is permitted per person. Registering the same biometric face across multiple accounts is strictly prohibited.";
            btn.className = "w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center justify-center gap-2";
            btnIcon.className = "ph-bold ph-arrow-counter-clockwise";
            btnText.innerText = buttonText || "Rescan Face Biometrics";
        } else if (type === 'spoof') {
            iconContainer.className = "w-16 h-16 mx-auto rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 transition-colors";
            icon.className = "ph-bold ph-user-focus text-3xl";
            policyBox.classList.remove('hidden');
            policyBox.className = "p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-[11px] text-red-900 dark:text-red-300 text-left mb-5 space-y-1";
            policyHeaderEl.innerHTML = `<i class="ph-fill ph-shield-check"></i> ${policyHeader || 'Live Face Verification Policy:'}`;
            policyBodyEl.innerText = policyBody || "Real live human presence is strictly required. Static photos, printed pictures, screens, masks, and spoof attempts are strictly prohibited.";
            btn.className = "w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center justify-center gap-2";
            btnIcon.className = "ph-bold ph-arrow-counter-clockwise";
            btnText.innerText = buttonText || "Try Again (Live Face)";
        } else if (type === 'warning') {
            iconContainer.className = "w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 transition-colors";
            icon.className = "ph-bold ph-warning-circle text-3xl";
            policyBox.classList.add('hidden');
            btn.className = "w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-600/30 transition-all active:scale-95 flex items-center justify-center gap-2";
            btnIcon.className = "ph-bold ph-arrow-counter-clockwise";
            btnText.innerText = buttonText || "Adjust & Try Again";
        } else if (type === 'success') {
            iconContainer.className = "w-16 h-16 mx-auto rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center mb-4 transition-colors";
            icon.className = "ph-bold ph-check-circle text-3xl";
            policyBox.classList.add('hidden');
            btn.className = "w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-green-600/30 transition-all active:scale-95 flex items-center justify-center gap-2";
            btnIcon.className = "ph-bold ph-check";
            btnText.innerText = buttonText || "Done";
        } else {
            iconContainer.className = "w-16 h-16 mx-auto rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 transition-colors";
            icon.className = "ph-bold ph-x-circle text-3xl";
            policyBox.classList.add('hidden');
            btn.className = "w-full py-3.5 rounded-xl bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2";
            btnIcon.className = "ph-bold ph-x";
            btnText.innerText = buttonText || "Close";
        }

        modal.classList.remove('hidden');

        btn.onclick = () => {
            modal.classList.add('hidden');
            if (typeof onConfirm === 'function') onConfirm();
        };
    }

    function showBiometricToast(message, type='info') {
        const toast = document.getElementById('biometricToast');
        if (!toast) return;
        const icon = document.getElementById('bioToastIcon');
        const text = document.getElementById('bioToastText');
        
        text.innerText = message;
        if (type === 'error') {
            toast.className = "fixed left-1/2 -translate-x-1/2 px-5 py-3 rounded-[50px] font-bold text-[0.85rem] shadow-[0_6px_25px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out z-[10003] flex items-center justify-center gap-2.5 w-max max-w-[85%] text-center break-words bg-red-600 text-white bottom-[30px]";
            icon.className = "ph-bold ph-warning-circle text-lg";
        } else if (type === 'warning') {
            toast.className = "fixed left-1/2 -translate-x-1/2 px-5 py-3 rounded-[50px] font-bold text-[0.85rem] shadow-[0_6px_25px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out z-[10003] flex items-center justify-center gap-2.5 w-max max-w-[85%] text-center break-words bg-amber-600 text-white bottom-[30px]";
            icon.className = "ph-bold ph-info text-lg";
        } else {
            toast.className = "fixed left-1/2 -translate-x-1/2 px-5 py-3 rounded-[50px] font-bold text-[0.85rem] shadow-[0_6px_25px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out z-[10003] flex items-center justify-center gap-2.5 w-max max-w-[85%] text-center break-words bg-emerald-600 text-white bottom-[30px]";
            icon.className = "ph-bold ph-check-circle text-lg";
        }
        
        setTimeout(() => {
            toast.classList.remove('bottom-[30px]');
            toast.classList.add('-bottom-[100px]');
        }, 3500);
    }

    // --- BIOMETRIC FACE SCANNER & PROGRESS ---
    let updateStream = null;
    let updateInterval = null;
    let modelsLoaded = false;
    const livenessDetector = (typeof FaceLivenessDetector !== 'undefined') ? new FaceLivenessDetector() : null;

    function setFaceProgress(percent, isSuccess = false) {
        const circle = document.getElementById('scanProgressCircle');
        if (!circle) return;
        const circumference = 276.46;
        const p = Math.min(Math.max(percent, 0), 100);
        circle.style.strokeDashoffset = circumference * (1 - p / 100);
        const dot = document.getElementById('scanCenterDot');
        if (isSuccess) {
            circle.classList.remove('stroke-[#800000]', 'dark:stroke-[#D4AF37]');
            circle.classList.add('stroke-green-500', 'dark:stroke-green-400');
            if (dot) {
                dot.classList.remove('bg-[#800000]', 'dark:bg-[#D4AF37]', 'animate-ping');
                dot.classList.add('bg-green-500', 'scale-125');
            }
        } else {
            circle.classList.remove('stroke-green-500', 'dark:stroke-green-400');
            circle.classList.add('stroke-[#800000]', 'dark:stroke-[#D4AF37]');
            if (dot) {
                dot.classList.remove('bg-green-500', 'scale-125');
                dot.classList.add('bg-[#800000]', 'dark:bg-[#D4AF37]', 'animate-ping');
            }
        }
    }

    window.openFaceUpdateModal = function() {
        document.getElementById('settingsModal').classList.add('hidden');
        document.getElementById('faceUpdateModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        setFaceProgress(0);
        startFaceUpdateScanner();
    };

    window.closeFaceUpdateModal = function() {
        if (updateStream) { 
            updateStream.getTracks().forEach(t => t.stop()); 
            updateStream = null; 
        }
        const video = document.getElementById('faceUpdateVideo');
        if (video) video.srcObject = null;
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
        setFaceProgress(0);
        document.getElementById('faceUpdateModal').classList.add('hidden');
        document.body.style.overflow = '';
    };

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

        if (livenessDetector) livenessDetector.reset();
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
                            if (livenessDetector) livenessDetector.reset();
                            btn.disabled = true;
                            setFaceProgress(0);
                            status.innerText = "ADJUSTING LIGHTING...";
                            status.className = "absolute top-4 left-4 right-4 bg-amber-600/90 backdrop-blur-2xl px-3 py-2 rounded-full text-white text-[8px] font-black uppercase tracking-[0.2em] text-center shadow-2xl z-20";
                            updateQuality(false);
                        } else if (detections.length === 0) {
                            if (livenessDetector) livenessDetector.reset();
                            btn.disabled = true;
                            setFaceProgress(0);
                            status.innerText = "NO FACE DETECTED";
                            status.className = "absolute top-4 left-4 right-4 bg-amber-600/90 backdrop-blur-2xl px-3 py-2 rounded-full text-white text-[8px] font-black uppercase tracking-[0.2em] text-center shadow-2xl z-20";
                            updateQuality(false);
                        } else if (detections.length > 1) {
                            if (livenessDetector) livenessDetector.reset();
                            btn.disabled = true;
                            setFaceProgress(0);
                            status.innerText = "MULTIPLE FACES DETECTED — SINGLE PERSON ONLY";
                            status.className = "absolute top-4 left-4 right-4 bg-red-600/90 backdrop-blur-2xl px-3 py-2 rounded-full text-white text-[8px] font-black uppercase tracking-[0.2em] text-center shadow-2xl z-20";
                            updateQuality(false);
                        } else {
                            const livenessRes = livenessDetector ? livenessDetector.processFrame(detections[0], video.videoWidth, video.videoHeight) : { isLive: true, message: 'FACE VERIFIED' };
                            status.innerText = livenessRes.message;
                            if (livenessRes.isLive) {
                                btn.disabled = false;
                                setFaceProgress(50);
                                status.className = "absolute top-4 left-4 right-4 bg-green-600/90 backdrop-blur-2xl px-3 py-2 rounded-full text-white text-[8px] font-black uppercase tracking-[0.2em] text-center shadow-2xl z-20 border border-green-400/50 shadow-green-500/30";
                                updateQuality(true);
                            } else if (livenessRes.status === 'STATIC_PHOTO_DETECTED') {
                                btn.disabled = true;
                                setFaceProgress(0);
                                status.className = "absolute top-4 left-4 right-4 bg-red-700/95 backdrop-blur-2xl px-3 py-2 rounded-full text-white text-[8px] font-black uppercase tracking-[0.2em] text-center shadow-2xl z-20 animate-bounce border border-red-400";
                                updateQuality(false);
                            } else if (livenessRes.status === 'SPOOF_REJECTED') {
                                btn.disabled = true;
                                setFaceProgress(0);
                                status.className = "absolute top-4 left-4 right-4 bg-red-800/95 backdrop-blur-2xl px-3 py-2 rounded-full text-white text-[8px] font-black uppercase tracking-[0.2em] text-center shadow-2xl z-20 border border-red-500";
                                updateQuality(false);
                            } else {
                                btn.disabled = true;
                                setFaceProgress(Math.min((livenessDetector ? livenessDetector.stableFrames : 1) * 15, 40));
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
                if (livenessDetector && !livenessDetector.isLive) {
                    showBiometricModal({
                        type: 'spoof',
                        title: 'ANTI-SPOOFING VERIFICATION',
                        message: 'Anti-Spoofing: Full live face verification required. Static photos and gallery images are strictly prohibited.'
                    });
                    return;
                }
                btn.disabled = true;
                btn.innerHTML = `<i class="ph-bold ph-spinner animate-spin"></i> SAVING RECORD...`;
                
                // Animate progress on the scan circle while saving
                setFaceProgress(65);
                let currentProgress = 65;
                const progressTimer = setInterval(() => {
                    if (currentProgress < 92) {
                        currentProgress += 5;
                        setFaceProgress(currentProgress);
                    }
                }, 200);

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
                    clearInterval(progressTimer);
                    setFaceProgress(0);
                    showBiometricModal({
                        type: 'warning',
                        title: 'FACE NOT RECOGNIZED',
                        message: 'Face not clearly detected. Please face the camera directly in good lighting.'
                    });
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
                    const resp = await fetch("/organizer/register-face/", {
                        method: 'POST',
                        headers: { 'X-CSRFToken': getCsrfToken() },
                        body: fd
                    });
                    const data = await resp.json();
                    clearInterval(progressTimer);
                    
                    if (data.status === 'success') {
                        setFaceProgress(100, true);
                        showBiometricToast("Biometric identity updated successfully!", "success");
                        showBiometricModal({
                            type: 'success',
                            title: 'IDENTITY UPDATED',
                            message: 'Your facial biometric profile and official picture have been updated successfully.',
                            buttonText: 'Done',
                            onConfirm: () => {
                                closeFaceUpdateModal();
                                location.reload();
                            }
                        });
                    } else {
                        setFaceProgress(0);
                        const isConflict = data.message && (data.message.includes('Conflict') || data.message.includes('already registered') || data.message.includes('already enrolled'));
                        const isSpoof = data.message && (data.message.includes('spoof') || data.message.includes('Live'));
                        showBiometricModal({
                            type: isConflict ? 'conflict' : (isSpoof ? 'spoof' : 'error'),
                            title: isConflict ? 'BIOMETRIC IDENTITY CONFLICT' : (isSpoof ? 'ANTI-SPOOFING ALERT' : 'UPDATE FAILED'),
                            message: data.message || "Failed to update face biometric."
                        });
                        btn.disabled = false;
                        btn.innerHTML = `<i class="ph-bold ph-fingerprint"></i> Confirm New Identity`;
                    }
                } catch(e) {
                    clearInterval(progressTimer);
                    setFaceProgress(0);
                    showBiometricModal({
                        type: 'error',
                        title: 'NETWORK ERROR',
                        message: 'A network error occurred while communicating with the campus server. Please try again.'
                    });
                    btn.disabled = false;
                    btn.innerHTML = `<i class="ph-bold ph-fingerprint"></i> Confirm New Identity`;
                }
            };

        } catch (err) {
            showBiometricModal({
                type: 'error',
                title: 'CAMERA ERROR',
                message: "Camera Error: " + err.message,
                onConfirm: () => closeFaceUpdateModal()
            });
        }
    }

    function updateQuality(isGood) {
        const label = document.getElementById('updateQualityLabel');
        const b1 = document.getElementById('bar1');
        const b2 = document.getElementById('bar2');
        const b3 = document.getElementById('bar3');
        if (!label || !b1) return;

        if (isGood) {
            label.innerText = "OPTIMAL";
            label.className = "text-[8px] font-black text-green-500 uppercase tracking-widest leading-none";
            b1.className = "w-1 bg-green-500 rounded-full transition-all duration-300"; b1.style.height = "100%";
            b2.className = "w-1 bg-green-500 rounded-full transition-all duration-300"; b2.style.height = "100%";
            b3.className = "w-1 bg-green-500 rounded-full transition-all duration-300"; b3.style.height = "100%";
        } else {
            label.innerText = "ADJUSTING...";
            label.className = "text-[8px] font-black text-amber-500 uppercase tracking-widest leading-none";
            b1.className = "w-1 bg-amber-500 rounded-full transition-all duration-300"; b1.style.height = "40%";
            b2.className = "w-1 bg-amber-500 rounded-full transition-all duration-300"; b2.style.height = "20%";
            b3.className = "w-1 bg-gray-300 dark:bg-white/20 rounded-full transition-all duration-300"; b3.style.height = "20%";
        }
    }
