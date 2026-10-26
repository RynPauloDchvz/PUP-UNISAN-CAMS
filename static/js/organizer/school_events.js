const eventsText = document.getElementById('events-data').textContent;
    const EVENTS_DATA = eventsText ? JSON.parse(eventsText) : [];
    
    const organizerText = document.getElementById('organizer-data').textContent;
    const ORGANIZER_DATA = organizerText ? JSON.parse(organizerText) : { face_encoding: null };
    
    const DEFAULT_IMG = "/static/images/PUPLogo.png";
    const CAMPUS_COORDS = [13.84615, 121.96955];

    function initSchoolEventsLogic() {
        const eventsGrid = document.getElementById('eventsGrid');
        const noResults = document.getElementById('noResults');
        const searchInput = document.getElementById('eventSearch');
        const modalOverlay = document.getElementById('modalOverlay');
        const participationModal = document.getElementById('participationModal');
        const btnParticipate = document.getElementById('btnParticipate');
        
        let currentEvent = null;
        let videoStream = null;
        let scanInterval = null;
        let faceMatcher = null;
        let isFaceVerified = false;
        let isLocationVerified = false;
        let userLat = null;
        let userLng = null;
        let modelsLoaded = false;
        const livenessDetector = new FaceLivenessDetector();

        let qualityStatus = { tooDark: false, tooBright: false, obstructed: false, noFaceDetail: false, isReady: false };
        let qualityScore = 0;
        let validationInterval = null;

        function renderEvents(query = '') {
            if (!eventsGrid) return;
            eventsGrid.innerHTML = '';
            const filtered = EVENTS_DATA.filter(e => e.title.toLowerCase().includes(query.toLowerCase()));
            if (filtered.length === 0) { if(noResults) noResults.style.display = 'block'; return; }
            if(noResults) noResults.style.display = 'none';

            filtered.forEach(e => {
                const card = document.createElement('div');
                card.className = "bg-white dark:bg-pup-darkcard rounded-2xl sm:rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-row sm:flex-col cursor-pointer group shadow-sm hover:shadow-2xl transition-all duration-700 h-full relative";
                card.innerHTML = `
                    <div class="w-24 h-24 sm:h-40 sm:w-full shrink-0 relative overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-r sm:border-r-0 sm:border-b border-gray-100 dark:border-gray-800">
                        <img src="${e.image}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" onerror="this.src=DEFAULT_IMG; this.classList.remove('object-cover'); this.classList.add('object-contain', 'p-6 sm:p-8');">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent hidden sm:block"></div>
                    </div>
                    <!-- 🟢 DUAL STATUS BADGES (TIME IN & TIME OUT) 🟢 -->
                    <div class="absolute top-2 left-2 z-10 flex flex-col gap-1 max-w-[90%] pointer-events-none">
                        <span class="badge-time-in text-white text-[6px] sm:text-[8px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-md flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md" data-event-id="${e.id}">
                            <i class="ph-bold ph-sign-in shrink-0"></i><span class="truncate">IN • --:--:--</span>
                        </span>
                        <span class="badge-time-out text-white text-[6px] sm:text-[8px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-md flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md" data-event-id="${e.id}">
                            <i class="ph-bold ph-sign-out shrink-0"></i><span class="truncate">OUT • --:--:--</span>
                        </span>
                    </div>
                    <div class="p-3 sm:p-5 flex flex-col flex-grow min-w-0">
                        <div class="text-[7px] sm:text-[8px] font-black text-pup-maroon dark:text-pup-gold mb-0.5 sm:mb-1 uppercase tracking-[0.2em]">${e.date_display}</div>
                        <h3 class="font-black text-xs sm:text-base text-gray-900 dark:text-white leading-tight mb-1 sm:mb-3 uppercase tracking-tighter truncate">${e.title}</h3>
                        <div class="flex items-center justify-between pt-2 sm:pt-4 border-t border-gray-50 dark:border-gray-800 mt-auto">
                             <div class="flex items-center gap-1 sm:gap-1.5 text-gray-400 font-bold text-[7px] sm:text-[8px] uppercase tracking-widest truncate">
                                <i class="ph-fill ph-map-pin text-pup-maroon dark:text-pup-gold"></i> <span class="truncate">${e.venue}</span>
                             </div>
                             <div class="flex items-center gap-2">
                                ${e.has_timed_out ? '<i class="ph-fill ph-check-circle text-green-500 text-xs sm:text-base" title="Attendance Completed"></i>' : (e.already_attended ? '<i class="ph-bold ph-clock-countdown text-amber-500 text-xs sm:text-base" title="Time In Recorded"></i>' : '<i class="ph-bold ph-arrow-right text-gray-200 group-hover:text-pup-maroon dark:group-hover:text-pup-gold transition-all group-hover:translate-x-1 text-xs sm:text-base"></i>')}
                             </div>
                        </div>
                    </div>
                `;
                card.addEventListener('click', (event) => openModal(e, event));
                eventsGrid.appendChild(card);
            });
            updateAllCountdowns();
        }

        function updateAllCountdowns() {
            const now = new Date();

            // 1. UPDATE TIME IN BADGES (Start time + 1 hour grace)
            document.querySelectorAll('.badge-time-in').forEach(el => {
                const e = EVENTS_DATA.find(evt => evt && evt.id == el.dataset.eventId);
                if (!e) return;
                const start = new Date(`${e.date}T${e.start_time_iso}`);
                const timeInClose = new Date(start.getTime() + (60 * 60 * 1000));

                if (e.already_attended) {
                    el.innerHTML = `<i class="ph-fill ph-check-circle shrink-0"></i><span class="truncate">TIME IN SUCCESS</span>`;
                    el.className = "badge-time-in text-white text-[6px] sm:text-[8px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-md bg-green-600/90 border border-green-400/40 flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
                } else if (now < start) {
                    const diffStart = start - now;
                    el.innerHTML = `<i class="ph-bold ph-clock shrink-0"></i><span class="truncate">TIME IN • IN ${formatTimeDiff(diffStart)}</span>`;
                    el.className = "badge-time-in text-white text-[6px] sm:text-[8px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-md bg-black/60 border border-white/20 flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
                } else if (now <= timeInClose) {
                    const diffClose = timeInClose - now;
                    el.innerHTML = `<i class="ph-fill ph-broadcast animate-pulse text-green-300 shrink-0"></i><span class="truncate">TIME IN OPEN • ${formatTimeDiff(diffClose)}</span>`;
                    el.className = "badge-time-in text-white text-[6px] sm:text-[8px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-md bg-green-700/90 border border-green-400/50 animate-pulse flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
                } else {
                    el.innerHTML = `<i class="ph-bold ph-x-circle text-red-300 shrink-0"></i><span class="truncate">TIME IN EXPIRED</span>`;
                    el.className = "badge-time-in text-white text-[6px] sm:text-[8px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-md bg-red-700/80 border border-red-400/40 flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
                }
            });

            // 2. UPDATE TIME OUT BADGES (15 mins before end time up to 1 hour after end time)
            document.querySelectorAll('.badge-time-out').forEach(el => {
                const e = EVENTS_DATA.find(evt => evt && evt.id == el.dataset.eventId);
                if (!e) return;
                const start = new Date(`${e.date}T${e.start_time_iso}`);
                const end = e.end_time_iso ? new Date(`${e.date}T${e.end_time_iso}`) : new Date(start.getTime() + (4 * 3600000));
                const timeoutStart = new Date(end.getTime() - (15 * 60 * 1000));
                const timeoutExpiry = new Date(end.getTime() + (60 * 60 * 1000));

                if (e.has_timed_out) {
                    el.innerHTML = `<i class="ph-fill ph-check-circle shrink-0"></i><span class="truncate">TIME OUT SUCCESS</span>`;
                    el.className = "badge-time-out text-white text-[6px] sm:text-[8px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-md bg-green-600/90 border border-green-400/40 flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
                } else if (now < timeoutStart) {
                    const diffOutStart = timeoutStart - now;
                    el.innerHTML = `<i class="ph-bold ph-hourglass shrink-0"></i><span class="truncate">TIME OUT • IN ${formatTimeDiff(diffOutStart)}</span>`;
                    el.className = "badge-time-out text-white text-[6px] sm:text-[8px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-md bg-black/60 border border-white/20 flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
                } else if (now <= timeoutExpiry) {
                    const diffOutExpiry = timeoutExpiry - now;
                    el.innerHTML = `<i class="ph-fill ph-broadcast animate-pulse text-green-300 shrink-0"></i><span class="truncate">TIME OUT OPEN • ${formatTimeDiff(diffOutExpiry)}</span>`;
                    el.className = "badge-time-out text-white text-[6px] sm:text-[8px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-md bg-emerald-700/90 border border-emerald-400/50 animate-pulse flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
                } else {
                    el.innerHTML = `<i class="ph-bold ph-lock text-red-300 shrink-0"></i><span class="truncate">TIME OUT CLOSED</span>`;
                    el.className = "badge-time-out text-white text-[6px] sm:text-[8px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-md bg-red-700/80 border border-red-400/40 flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
                }
            });

            // 3. UPDATE MODAL STATE
            if (currentEvent) {
                const start = new Date(`${currentEvent.date}T${currentEvent.start_time_iso}`);
                const timeInClose = new Date(start.getTime() + (60 * 60 * 1000));
                const end = currentEvent.end_time_iso ? new Date(`${currentEvent.date}T${currentEvent.end_time_iso}`) : new Date(start.getTime() + (4 * 3600000));
                const timeoutStart = new Date(end.getTime() - (15 * 60 * 1000));
                const timeoutExpiry = new Date(end.getTime() + (60 * 60 * 1000));

                const cdContainer = document.getElementById('countdownContainer');
                const endedStatus = document.getElementById('endedStatus');
                const btnWrapper = document.getElementById('btnParticipateWrapper');
                const modalCD = document.getElementById('modalCountdown');
                const btnPart = document.getElementById('btnParticipate');

                if (currentEvent.has_timed_out) {
                    cdContainer.classList.add('hidden');
                    endedStatus.classList.remove('hidden');
                    btnWrapper.classList.add('hidden');
                    endedStatus.querySelector('span').innerText = "ATTENDANCE STATUS";
                    endedStatus.querySelector('div').innerText = "RECORD FINALIZED";
                } else if (now >= timeoutStart && now <= timeoutExpiry) {
                    // Time Out Window Active
                    cdContainer.classList.remove('hidden');
                    endedStatus.classList.add('hidden');
                    btnWrapper.classList.remove('hidden');
                    cdContainer.querySelector('span').innerText = "TIME OUT PORTAL OPEN";
                    modalCD.innerText = formatTimeDiff(timeoutExpiry - now);
                    if (btnPart) btnPart.innerHTML = `<i class="ph-bold ph-sign-out text-xl"></i> Initialize Time Out`;
                } else if (now >= start && now <= timeInClose) {
                    // Time In Window Active
                    if (currentEvent.already_attended) {
                        cdContainer.classList.remove('hidden');
                        endedStatus.classList.add('hidden');
                        btnWrapper.classList.add('hidden');
                        cdContainer.querySelector('span').innerText = "TIME IN RECORDED";
                        modalCD.innerText = `TIME OUT IN ${formatTimeDiff(timeoutStart - now)}`;
                    } else {
                        cdContainer.classList.remove('hidden');
                        endedStatus.classList.add('hidden');
                        btnWrapper.classList.remove('hidden');
                        cdContainer.querySelector('span').innerText = "TIME IN PORTAL OPEN";
                        modalCD.innerText = formatTimeDiff(timeInClose - now);
                        if (btnPart) btnPart.innerHTML = `<i class="ph-bold ph-scan text-xl"></i> Initialize Biometric Scanner`;
                    }
                } else if (now < start) {
                    // Before event starts
                    cdContainer.classList.remove('hidden');
                    endedStatus.classList.add('hidden');
                    btnWrapper.classList.add('hidden');
                    cdContainer.querySelector('span').innerText = "TIME IN OPENS IN";
                    modalCD.innerText = formatTimeDiff(start - now);
                } else if (now > timeInClose && now < timeoutStart) {
                    // Between time in and time out
                    cdContainer.classList.remove('hidden');
                    endedStatus.classList.add('hidden');
                    btnWrapper.classList.add('hidden');
                    cdContainer.querySelector('span').innerText = currentEvent.already_attended ? "WAITING FOR TIME OUT" : "TIME IN EXPIRED";
                    modalCD.innerText = `TIME OUT IN ${formatTimeDiff(timeoutStart - now)}`;
                } else {
                    // After timeoutExpiry
                    cdContainer.classList.add('hidden');
                    endedStatus.classList.remove('hidden');
                    btnWrapper.classList.add('hidden');
                    endedStatus.querySelector('span').innerText = "ACTIVITY CONCLUDED";
                    endedStatus.querySelector('div').innerText = "PORTAL CLOSED";
                }
            }
        }

        function formatTimeDiff(ms) {
            if (ms <= 0) return '00:00:00';
            const totalSecs = Math.floor(ms / 1000);
            const d = Math.floor(totalSecs / 86400);
            const h = Math.floor((totalSecs % 86400) / 3600);
            const m = Math.floor((totalSecs % 3600) / 60);
            const s = totalSecs % 60;
            if (d > 0) {
                return `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
            }
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        setInterval(updateAllCountdowns, 1000);

        function openModal(e, clickEvent) {
            const wrapper = document.getElementById('eventModal');
            if (wrapper && clickEvent) {
                wrapper.style.transformOrigin = `${clickEvent.clientX}px ${clickEvent.clientY}px`;
                wrapper.classList.remove('ios-pop-wrapper-close');
                wrapper.classList.add('ios-pop-wrapper');
            }
            currentEvent = e;
            document.getElementById('modalImg').src = e.image;
            document.getElementById('modalTitle').innerText = e.title;
            document.getElementById('modalDate').innerText = e.date_display;
            document.getElementById('modalVenue').innerText = e.venue;
            document.getElementById('modalTime').innerText = `${e.date_display} @ ${e.time}`;
            document.getElementById('modalDesc').innerText = e.description || "No description provided.";
            updateAllCountdowns();
            modalOverlay.style.display = 'flex';
        }

        function closeEventDetailsModal() { 
            const wrapper = document.getElementById('eventModal');
            if (wrapper) {
                wrapper.classList.add('ios-pop-wrapper-close');
                setTimeout(() => {
                    modalOverlay.style.display = 'none';
                    wrapper.classList.remove('ios-pop-wrapper');
                    wrapper.classList.remove('ios-pop-wrapper-close');
                }, 350);
            } else {
                modalOverlay.style.display = 'none'; 
            }
        }
        function resetCurrentEvent() { currentEvent = null; }

        if (btnParticipate) {
            btnParticipate.addEventListener('click', () => { 
                closeEventDetailsModal(); 
                startParticipationScanner(); 
            });
        }
        // --- BIOMETRIC MODAL & TOAST SYSTEM (FORCE-CHANGE UI STYLE) ---
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
                policyHeaderEl.innerHTML = `<i class="ph-fill ph-prohibit"></i> ${policyHeader || 'Biometric Security Policy:'}`;
                policyBodyEl.innerText = policyBody || "Your scanned face must match your registered account face profile. Proxy attendance or logging attendance on behalf of another individual is strictly audited and prohibited.";
                btn.className = "w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center justify-center gap-2";
                btnIcon.className = "ph-bold ph-arrow-counter-clockwise";
                btnText.innerText = buttonText || "Rescan Face Biometrics";
            } else if (type === 'location') {
                iconContainer.className = "w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 transition-colors";
                icon.className = "ph-bold ph-map-pin-line text-3xl";
                policyBox.classList.remove('hidden');
                policyBox.className = "p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300 text-left mb-5 space-y-1";
                policyHeaderEl.innerHTML = `<i class="ph-fill ph-navigation-arrow"></i> ${policyHeader || 'Campus Geofence Policy:'}`;
                policyBodyEl.innerText = policyBody || "You must be physically present within the official PUP Unisan campus boundary to verify and record event attendance.";
                btn.className = "w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-600/30 transition-all active:scale-95 flex items-center justify-center gap-2";
                btnIcon.className = "ph-bold ph-map-pin";
                btnText.innerText = buttonText || "Understood";
            } else if (type === 'spoof') {
                iconContainer.className = "w-16 h-16 mx-auto rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 transition-colors";
                icon.className = "ph-bold ph-user-focus text-3xl";
                policyBox.classList.remove('hidden');
                policyBox.className = "p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-[11px] text-red-900 dark:text-red-300 text-left mb-5 space-y-1";
                policyHeaderEl.innerHTML = `<i class="ph-fill ph-shield-check"></i> ${policyHeader || 'Live Face Verification Policy:'}`;
                policyBodyEl.innerText = policyBody || "Real live human presence is strictly required. Static photos, printed pictures, screens, masks, and spoof attempts are strictly prohibited and audited.";
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

        const btnCancelScan = document.getElementById('btnCancelScan');
        if (btnCancelScan) {
            btnCancelScan.addEventListener('click', () => { 
                participationModal.style.display = 'none'; 
                stopScanner(); 
                resetCurrentEvent(); 
            });
        }

        async function loadModels() {
            if (typeof faceapi === 'undefined' || !faceapi.nets) {
                console.warn("faceapi library is not loaded yet.");
                return;
            }
            const MODEL_PATH = "/static/models";
            const CDN_FALLBACK = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH)
                ]);
                modelsLoaded = true;
            } catch (err) {
                console.warn("Local static load warning, falling back to CDN:", err);
                try {
                    await Promise.all([
                        faceapi.nets.tinyFaceDetector.loadFromUri(CDN_FALLBACK),
                        faceapi.nets.faceLandmark68Net.loadFromUri(CDN_FALLBACK),
                        faceapi.nets.faceRecognitionNet.loadFromUri(CDN_FALLBACK)
                    ]);
                    modelsLoaded = true;
                } catch(e) {
                    console.error("FaceAPI model load error:", e);
                }
            }
        }

        if (typeof faceapi !== 'undefined') {
            loadModels().then(() => {
                if (ORGANIZER_DATA.face_encoding) console.log("Organizer Biometrics loaded.");
            }).catch(e => console.warn(e));
        }


        function switchParticipationView(viewId) {
            document.getElementById('viewScanner').style.display = 'none';
            document.getElementById('viewSuccess').style.display = 'none';
            document.getElementById(viewId).style.display = 'flex';
        }

        let autoSubmitted = false;
        function startQualityValidation(v) {
            if (validationInterval) clearInterval(validationInterval);
            const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d', { willReadFrequently: true });
            validationInterval = setInterval(() => {
                if (!videoStream || !v || v.videoWidth === 0) return;
                canvas.width = 64; canvas.height = 64; ctx.drawImage(v, 0, 0, 64, 64);
                const data = ctx.getImageData(0, 0, 64, 64).data;
                let b = 0;
                let glareCount = 0;
                const total = 64 * 64;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i+1], bP = data[i+2];
                    b += (r + g + bP) / 3;
                    if (r > 248 && g > 248 && bP > 248) glareCount++;
                }
                const avg = b / total;
                const isTooDark = avg < 40;
                const isTooBright = avg > 230;
                const isGlare = (glareCount / total) > 0.12;

                qualityStatus.tooDark = isTooDark;
                qualityStatus.tooBright = isTooBright;
                qualityStatus.glare = isGlare;
                qualityStatus.isReady = !isTooDark && !isTooBright && !isGlare;
            }, 200);
        }

        async function startParticipationScanner() {
            participationModal.style.display = 'flex';
            switchParticipationView('viewScanner');
            autoSubmitted = false;
            const status = document.getElementById('scanStatus');
            status.innerText = "AUTHENTICATING SENSORS...";
            isFaceVerified = false; 
            isLocationVerified = false;
            updateSubmitButton();

            try {
                livenessDetector.reset();
                videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } } });
                const v = document.getElementById('video');
                v.srcObject = videoStream;
                v.onloadedmetadata = () => {
                    v.play();
                    startQualityValidation(v);
                    startGeofenceWatch();
                    const partScanLoop = async () => {
                        if (!videoStream) return;
                        
                        try {
                            const detections = await faceapi
                                .detectAllFaces(v, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.65 }))
                                .withFaceLandmarks();

                            if (!qualityStatus.isReady) { 
                                livenessDetector.reset();
                                status.innerText = "OPTIMIZING SENSOR QUALITY..."; 
                                status.className = "absolute top-6 left-6 right-6 bg-amber-600/90 backdrop-blur-2xl px-4 py-3 rounded-full text-white text-[9px] font-black uppercase tracking-[0.25em] text-center shadow-2xl animate-pulse";
                            } else if (detections.length === 0) {
                                livenessDetector.reset();
                                status.innerText = "NO FACE DETECTED"; 
                                status.className = "absolute top-6 left-6 right-6 bg-amber-600/90 backdrop-blur-2xl px-4 py-3 rounded-full text-white text-[9px] font-black uppercase tracking-[0.25em] text-center shadow-2xl animate-pulse";
                            } else if (detections.length > 1) {
                                livenessDetector.reset();
                                status.innerText = "MULTIPLE FACES DETECTED — SINGLE PERSON ONLY"; 
                                status.className = "absolute top-6 left-6 right-6 bg-red-600/90 backdrop-blur-2xl px-4 py-3 rounded-full text-white text-[9px] font-black uppercase tracking-[0.25em] text-center shadow-2xl animate-pulse";
                            } else {
                                const livenessRes = livenessDetector.processFrame(detections[0], v.videoWidth, v.videoHeight);
                                status.innerText = livenessRes.message;
                                if (livenessRes.isLive) {
                                    status.className = "absolute top-6 left-6 right-6 bg-green-600/90 backdrop-blur-2xl px-4 py-3 rounded-full text-white text-[9px] font-black uppercase tracking-[0.25em] text-center shadow-2xl border border-green-400/50 shadow-green-500/30";
                                } else if (livenessRes.status === 'STATIC_PHOTO_DETECTED') {
                                    status.className = "absolute top-6 left-6 right-6 bg-red-700/95 backdrop-blur-2xl px-4 py-3 rounded-full text-white text-[9px] font-black uppercase tracking-[0.25em] text-center shadow-2xl animate-bounce border border-red-400";
                                } else if (livenessRes.status === 'SPOOF_REJECTED') {
                                    status.className = "absolute top-6 left-6 right-6 bg-red-800/95 backdrop-blur-2xl px-4 py-3 rounded-full text-white text-[9px] font-black uppercase tracking-[0.25em] text-center shadow-2xl border border-red-500";
                                } else {
                                    status.className = "absolute top-6 left-6 right-6 bg-cyan-700/90 backdrop-blur-2xl px-4 py-3 rounded-full text-white text-[9px] font-black uppercase tracking-[0.25em] text-center shadow-2xl animate-pulse border border-cyan-400/40";
                                }
                            }
                        } catch (err) {
                            console.warn("Organizer liveness tick error:", err);
                        }

                        updateSubmitButton();

                        if (videoStream) scanInterval = setTimeout(partScanLoop, 150);
                    };
                    partScanLoop();
                };
            } catch (e) { 
                showBiometricModal({
                    type: 'error',
                    title: 'CAMERA INITIALIZATION ERROR',
                    message: "Camera Error: " + e.message,
                    onConfirm: () => { participationModal.style.display = 'none'; }
                });
            }
        }

        function startGeofenceWatch() {
            const isOutsideAllowed = currentEvent && (currentEvent.allow_outside_campus || currentEvent.attendance_scope === 'OUTSIDE_CAMPUS');
            
            if (isOutsideAllowed) {
                isLocationVerified = true; 
                document.getElementById('locStatus').innerHTML = `<i class="ph-bold ph-check-circle text-green-500 text-lg"></i> OUTSIDE CAMPUS ALLOWED`;
                updateSubmitButton();
            }

            navigator.geolocation.watchPosition((pos) => {
                userLat = pos.coords.latitude; userLng = pos.coords.longitude;
                
                if (isOutsideAllowed) {
                    isLocationVerified = true; 
                    document.getElementById('locStatus').innerHTML = `<i class="ph-bold ph-check-circle text-green-500 text-lg"></i> OUTSIDE CAMPUS ALLOWED`;
                } else {
                    const targetLat = currentEvent && currentEvent.target_lat ? currentEvent.target_lat : CAMPUS_COORDS[0];
                    const targetLng = currentEvent && currentEvent.target_lng ? currentEvent.target_lng : CAMPUS_COORDS[1];
                    const dist = calculateDistance(userLat, userLng, targetLat, targetLng);
                    if (dist <= 300) {
                        isLocationVerified = true; 
                        document.getElementById('locStatus').innerHTML = `<i class="ph-bold ph-check-circle text-green-500 text-lg"></i> GEOFENCE VERIFIED`;
                    } else {
                        isLocationVerified = false; 
                        document.getElementById('locStatus').innerHTML = `<i class="ph-bold ph-warning text-red-500 text-lg"></i> OUTSIDE (${Math.round(dist)}m)`;
                    }
                }
                updateSubmitButton();
            }, null, { enableHighAccuracy: true });
        }

        function calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371e3;
            const φ1 = lat1 * Math.PI/180; const φ2 = lat2 * Math.PI/180;
            const Δφ = (lat2-lat1) * Math.PI/180; const Δλ = (lon2-lon1) * Math.PI/180;
            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        }

        let isSubmitting = false;

        function updateSubmitButton() {
            if (isSubmitting) return;
            const btn = document.getElementById('btnSubmitScan');
            if (!btn) return;
            const isLive = livenessDetector && livenessDetector.isLive;
            if (qualityStatus.isReady && isLocationVerified && isLive) {
                btn.disabled = false; btn.classList.add('bg-green-600');
                btn.innerHTML = `<i class="ph-bold ph-check-circle text-xl"></i> Finalize Entry`;
                // 🟢 AUTOMATIC INSTANT ATTENDANCE MATCH 🟢
                if (!autoSubmitted) {
                    autoSubmitted = true;
                    setTimeout(() => {
                        if (!isSubmitting && livenessDetector && livenessDetector.isLive) {
                            btn.click();
                        }
                    }, 350);
                }
            } else if (!isLive && qualityStatus.isReady) {
                btn.disabled = true; btn.classList.remove('bg-green-600');
                btn.innerHTML = `<i class="ph-bold ph-scan text-xl"></i> Detecting Full Face...`;
            } else {
                btn.disabled = true; btn.classList.remove('bg-green-600');
                btn.innerHTML = `<i class="ph-bold ph-bounding-box text-xl"></i> Syncing Sensors...`;
            }
        }

        const btnSubmitScan = document.getElementById('btnSubmitScan');
        if (btnSubmitScan) {
            btnSubmitScan.addEventListener('click', async () => {
                if (isSubmitting) return;
                if (!livenessDetector.isLive) {
                    showBiometricModal({
                        type: 'spoof',
                        title: 'ANTI-SPOOFING VERIFICATION',
                        message: 'Full live face verification is required. Static photos, printed images, and screen projections are strictly prohibited.'
                    });
                    return;
                }
                isSubmitting = true;
                
                // ADD LOADING STATE TO BUTTON
                const originalText = btnSubmitScan.innerHTML;
                btnSubmitScan.innerHTML = `<i class="ph-bold ph-spinner animate-spin text-xl"></i> VERIFYING IDENTITY...`;
                btnSubmitScan.classList.add('opacity-80', 'cursor-not-allowed');

                try {
                    const v = document.getElementById('video');
                    const canvas = document.createElement('canvas');
                    // Downscale to max 640px to prevent payload issues
                    const MAX_WIDTH = 640;
                    const scale = Math.min(1, MAX_WIDTH / v.videoWidth);
                    canvas.width = v.videoWidth * scale;
                    canvas.height = v.videoHeight * scale;
                    canvas.getContext('2d', { willReadFrequently: true }).drawImage(v, 0, 0, canvas.width, canvas.height);
                    const faceImage = canvas.toDataURL('image/jpeg', 0.8);
                    
                    let detection = null;
                    try {
                        detection = await faceapi
                            .detectSingleFace(v, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
                            .withFaceLandmarks()
                            .withFaceDescriptor();
                    } catch (err) {
                        console.warn("Attendance detection error:", err);
                    }

                    if (!detection || !detection.descriptor) {
                        showBiometricModal({
                            type: 'warning',
                            title: 'FACE NOT CLEARLY DETECTED',
                            message: 'Face not clearly detected. Please align your face inside the frame in good lighting.'
                        });
                        isSubmitting = false; 
                        btnSubmitScan.innerHTML = originalText;
                        btnSubmitScan.classList.remove('opacity-80', 'cursor-not-allowed');
                        return;
                    }

                    const descriptorArray = Array.from(detection.descriptor);
                    const fd = new FormData();
                    fd.append('event_id', currentEvent.id);
                    fd.append('face_descriptor', JSON.stringify(descriptorArray));
                    fd.append('face_image', faceImage);
                    fd.append('is_valid_location', isLocationVerified);
                    fd.append('is_live_verified', 'true');
                    fd.append('latitude', userLat || '');
                    fd.append('longitude', userLng || '');
                    
                    let csrf = '';
                    const csrfMatch = document.cookie.match(/csrftoken=([^;]+)/);
                    if (csrfMatch) csrf = csrfMatch[1];
                    
                    const res = await fetch('/record-attendance/', { method: 'POST', headers: { 'X-CSRFToken': csrf }, body: fd });
                    if (!res.ok) throw new Error("Server returned " + res.status);
                    const data = await res.json();
                    if (data.status === 'success' || data.status === 'issue') {
                        showBiometricToast("Attendance verified and securely logged!", "success");
                        switchParticipationView('viewSuccess');
                    } else { 
                        const msg = data.message || "Attendance verification failed.";
                        const isMismatch = msg.includes("does not match") || msg.includes("Biometric") || msg.includes("mismatch");
                        const isLocation = msg.includes("geofence") || msg.includes("outside") || msg.includes("premises") || msg.includes("campus");
                        const isSpoof = msg.includes("spoof") || msg.includes("Live") || msg.includes("Static");
                        const isNotice = msg.includes("already") || msg.includes("expired") || msg.includes("timed out") || msg.includes("closed");

                        showBiometricModal({
                            type: isMismatch ? 'conflict' : (isLocation ? 'location' : (isSpoof ? 'spoof' : (isNotice ? 'warning' : 'error'))),
                            title: isMismatch ? 'BIOMETRIC MISMATCH' : (isLocation ? 'GEOFENCE PERIMETER RESTRICTION' : (isSpoof ? 'ANTI-SPOOFING ALERT' : (isNotice ? 'ATTENDANCE NOTICE' : 'VERIFICATION FAILED'))),
                            message: msg
                        });
                        isSubmitting = false; 
                        btnSubmitScan.innerHTML = originalText;
                        btnSubmitScan.classList.remove('opacity-80', 'cursor-not-allowed');
                    }
                } catch (e) { 
                    showBiometricModal({
                        type: 'error',
                        title: 'INSTITUTIONAL SYNC ERROR',
                        message: "Submission failed: " + e.message
                    });
                    isSubmitting = false; 
                    btnSubmitScan.innerHTML = originalText;
                    btnSubmitScan.classList.remove('opacity-80', 'cursor-not-allowed');
                }
            });
        }
        document.getElementById('btnSuccessClose').addEventListener('click', () => {
            location.reload();
        });

        function stopScanner() {
            if (videoStream) { videoStream.getTracks().forEach(track => track.stop()); videoStream = null; }
            if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
            if (validationInterval) { clearInterval(validationInterval); validationInterval = null; }
            const qMeter = document.getElementById('qualityMeter');
            if (qMeter) qMeter.classList.add('hidden');
        }

        function startQualityValidation(video) {
            if (validationInterval) clearInterval(validationInterval);
            const canvas = document.createElement('canvas'); 
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const meter = document.getElementById('qualityMeter');
            if (meter) meter.classList.remove('hidden');
            validationInterval = setInterval(() => {
                if (!videoStream || !video || video.videoWidth === 0) return;
                canvas.width = 64; canvas.height = 64; ctx.drawImage(video, 0, 0, 64, 64);
                const data = ctx.getImageData(0, 0, 64, 64).data;
                let brightness = 0;
                for (let i = 0; i < data.length; i += 4) brightness += (data[i] + data[i+1] + data[i+2]) / 3;
                const avg = brightness / (64 * 64);
                qualityStatus.isReady = avg > 40 && avg < 230;
                const bar = document.getElementById('qualityBar');
                const text = document.getElementById('qualityText');
                if (bar && text) {
                    if (qualityStatus.isReady) {
                        bar.style.width = '100%'; bar.className = "h-full bg-green-500 transition-all";
                        text.innerText = "OPTIMIZED"; text.className = "text-[10px] font-bold text-green-500 uppercase";
                    } else {
                        bar.style.width = '30%'; bar.className = "h-full bg-amber-500 transition-all";
                        text.innerText = "ADJUSTING..."; text.className = "text-[10px] font-bold text-amber-500 uppercase";
                    }
                }
            }, 200);
        }

        if(searchInput) searchInput.addEventListener('input', () => renderEvents(searchInput.value));
        const overlay = document.getElementById('modalOverlay');
        if(overlay) overlay.addEventListener('click', (e) => { 
            if (e.target === overlay) {
                closeEventDetailsModal(); 
                resetCurrentEvent(); 
            }
        });
        const closeBtn = document.getElementById('btnClose');
        if(closeBtn) closeBtn.addEventListener('click', () => { closeEventDetailsModal(); resetCurrentEvent(); });

        renderEvents();
        setInterval(updateAllCountdowns, 1000);
    }

    document.addEventListener('DOMContentLoaded', () => { setTimeout(initSchoolEventsLogic, 100); });
