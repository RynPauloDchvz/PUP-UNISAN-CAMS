// 🟢 Robust Data Extraction from head script tags 🟢
const EVENTS_DATA = JSON.parse(document.getElementById('events-data')?.textContent || '[]');
const STUDENT_DATA = JSON.parse(document.getElementById('student-data')?.textContent || '{}');
const DEFAULT_IMG = "/static/images/PUPLogo.png";

function initSchoolEventsLogic() {
    let stream = null; let map = null; let userLat = null; let userLng = null;
    let currentEvent = null; let isFaceVerified = false; let isLocationVerified = false;
    let modelsLoaded = false; let faceMatcher = null;
    const livenessDetector = new FaceLivenessDetector();
    let qualityStatus = { tooDark: false, tooBright: false, obstructed: false, noFaceDetail: false, isReady: false };
    let qualityScore = 0;
    let validationInterval = null;

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
            policyBodyEl.innerText = policyBody || "Your scanned face must match your registered student profile face. Proxy attendance or logging attendance on behalf of another student is strictly audited and prohibited.";
            btn.className = "w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center justify-center gap-2";
            btnIcon.className = "ph-bold ph-arrow-counter-clockwise";
            btnText.innerText = buttonText || "Rescan Face Biometrics";
        } else if (type === 'location') {
            iconContainer.className = "w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 transition-colors";
            icon.className = "ph-bold ph-map-pin-line text-3xl";
            policyBox.classList.remove('hidden');
            policyBox.className = "p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300 text-left mb-5 space-y-1";
            policyHeaderEl.innerHTML = `<i class="ph-fill ph-navigation-arrow"></i> ${policyHeader || 'Campus Geofence Policy:'}`;
            policyBodyEl.innerText = policyBody || "You must be physically present within the official PUP Unisan campus boundary to verify and record your event attendance.";
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

    const eventsGrid = document.getElementById('eventsGrid');
    const noResults = document.getElementById('noResults');
    const searchInput = document.getElementById('eventSearch');

    function renderEvents(query = '') {
        if (!eventsGrid) return;
        eventsGrid.innerHTML = '';
        const filtered = EVENTS_DATA.filter(e => e.title.toLowerCase().includes(query.toLowerCase()));
        if (filtered.length === 0) { if(noResults) noResults.style.display = 'block'; return; }
        if(noResults) noResults.style.display = 'none';

        filtered.forEach(e => {
            const card = document.createElement('div');
            card.className = "js-event-card bg-white dark:bg-pup-darkcard rounded-2xl sm:rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-row sm:flex-col cursor-pointer group shadow-sm hover:shadow-2xl transition-all duration-700 h-full relative";
            card.innerHTML = `
                <div class="w-24 h-24 sm:h-40 sm:w-full shrink-0 relative bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-r sm:border-r-0 sm:border-b border-gray-100 dark:border-gray-800 overflow-hidden">
                    <img src="${e.image}" class="event-card-img w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" onerror="this.src=DEFAULT_IMG; this.classList.remove('object-cover'); this.classList.add('object-contain', 'p-4 sm:p-6');">
                </div>
                <!-- 🟢 DUAL STATUS BADGES (TIME IN & TIME OUT) 🟢 -->
                <div class="absolute top-2 left-2 z-10 flex flex-col gap-1 max-w-[90%] pointer-events-none">
                    <span class="badge-time-in text-white text-[7px] sm:text-[9px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-lg flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md" data-event-id="${e.id}">
                        <i class="ph-bold ph-sign-in shrink-0"></i><span class="truncate">IN • --:--:--</span>
                    </span>
                    <span class="badge-time-out text-white text-[7px] sm:text-[9px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-lg flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md" data-event-id="${e.id}">
                        <i class="ph-bold ph-sign-out shrink-0"></i><span class="truncate">OUT • --:--:--</span>
                    </span>
                </div>
                <div class="p-3 sm:p-4 flex flex-col w-full min-w-0 flex-grow">
                    <div class="text-[7px] sm:text-[8px] font-black text-pup-maroon dark:text-pup-gold mb-0.5 sm:mb-1 truncate uppercase tracking-[0.2em]">${e.date_display}</div>
                    <h3 class="font-black text-xs sm:text-base text-gray-900 dark:text-white leading-tight mb-1 sm:mb-2 truncate uppercase tracking-tighter">${e.title}</h3>
                    <div class="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-50 dark:border-gray-800 mt-auto">
                        <p class="text-[7px] sm:text-[8px] text-gray-400 flex items-center gap-1 font-bold uppercase tracking-widest truncate"><i class="ph-fill ph-map-pin text-pup-maroon dark:text-pup-gold"></i> <span class="truncate">${e.venue}</span></p>
                        <div class="flex items-center gap-2">
                            ${e.has_timed_out ? '<i class="ph-fill ph-check-circle text-green-500 text-sm sm:text-base" title="Attendance Completed"></i>' : (e.already_attended ? '<i class="ph-bold ph-clock-countdown text-amber-500 text-sm sm:text-base" title="Time In Recorded"></i>' : '<i class="ph-bold ph-caret-right text-gray-300 group-hover:text-pup-maroon dark:group-hover:text-pup-gold transition-all group-hover:translate-x-1 text-sm sm:text-base"></i>')}
                        </div>
                    </div>
                </div>
            `;
            card.onclick = (clickEvent) => openModal(e, clickEvent);
            eventsGrid.appendChild(card);
        });
        updateAllCountdowns();
    }

    function updateAllCountdowns() {
        const now = new Date();

        // 1. UPDATE TIME IN BADGES (Start time + 1 hour grace)
        document.querySelectorAll('.badge-time-in').forEach(el => {
            const e = EVENTS_DATA.find(evt => evt.id == el.dataset.eventId);
            if (!e) return;
            const start = new Date(`${e.date}T${e.start_time_iso}`);
            const timeInClose = new Date(start.getTime() + (60 * 60 * 1000));

            if (e.already_attended) {
                el.innerHTML = `<i class="ph-fill ph-check-circle shrink-0"></i><span class="truncate">TIME IN SUCCESS</span>`;
                el.className = "badge-time-in text-white text-[7px] sm:text-[9px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-lg bg-green-600/90 border border-green-400/40 flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
            } else if (now < start) {
                const diffStart = start - now;
                el.innerHTML = `<i class="ph-bold ph-clock shrink-0"></i><span class="truncate">TIME IN • IN ${formatTimeDiff(diffStart)}</span>`;
                el.className = "badge-time-in text-white text-[7px] sm:text-[9px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-lg bg-black/60 border border-white/20 flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
            } else if (now <= timeInClose) {
                const diffClose = timeInClose - now;
                el.innerHTML = `<i class="ph-fill ph-broadcast animate-pulse text-green-300 shrink-0"></i><span class="truncate">TIME IN OPEN • ${formatTimeDiff(diffClose)}</span>`;
                el.className = "badge-time-in text-white text-[7px] sm:text-[9px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-lg bg-green-700/90 border border-green-400/50 animate-pulse flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
            } else {
                el.innerHTML = `<i class="ph-bold ph-x-circle text-red-300 shrink-0"></i><span class="truncate">TIME IN EXPIRED</span>`;
                el.className = "badge-time-in text-white text-[7px] sm:text-[9px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-lg bg-red-700/80 border border-red-400/40 flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
            }
        });

        // 2. UPDATE TIME OUT BADGES (15 mins before end time up to 1 hour after end time)
        document.querySelectorAll('.badge-time-out').forEach(el => {
            const e = EVENTS_DATA.find(evt => evt.id == el.dataset.eventId);
            if (!e) return;
            const start = new Date(`${e.date}T${e.start_time_iso}`);
            const end = e.end_time_iso ? new Date(`${e.date}T${e.end_time_iso}`) : new Date(start.getTime() + (4 * 3600000));
            const timeoutStart = new Date(end.getTime() - (15 * 60 * 1000));
            const timeoutExpiry = new Date(end.getTime() + (60 * 60 * 1000));

            if (e.has_timed_out) {
                el.innerHTML = `<i class="ph-fill ph-check-circle shrink-0"></i><span class="truncate">TIME OUT SUCCESS</span>`;
                el.className = "badge-time-out text-white text-[7px] sm:text-[9px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-lg bg-green-600/90 border border-green-400/40 flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
            } else if (now < timeoutStart) {
                const diffOutStart = timeoutStart - now;
                el.innerHTML = `<i class="ph-bold ph-hourglass shrink-0"></i><span class="truncate">TIME OUT • IN ${formatTimeDiff(diffOutStart)}</span>`;
                el.className = "badge-time-out text-white text-[7px] sm:text-[9px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-lg bg-black/60 border border-white/20 flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
            } else if (now <= timeoutExpiry) {
                const diffOutExpiry = timeoutExpiry - now;
                el.innerHTML = `<i class="ph-fill ph-broadcast animate-pulse text-green-300 shrink-0"></i><span class="truncate">TIME OUT OPEN • ${formatTimeDiff(diffOutExpiry)}</span>`;
                el.className = "badge-time-out text-white text-[7px] sm:text-[9px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-lg bg-emerald-700/90 border border-emerald-400/50 animate-pulse flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
            } else {
                el.innerHTML = `<i class="ph-bold ph-lock text-red-300 shrink-0"></i><span class="truncate">TIME OUT CLOSED</span>`;
                el.className = "badge-time-out text-white text-[7px] sm:text-[9px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-black uppercase tracking-wider shadow-lg bg-red-700/80 border border-red-400/40 flex items-center gap-1 whitespace-nowrap overflow-hidden backdrop-blur-md";
            }
        });

        // 3. UPDATE PARTICIPATION MODAL
        if (currentEvent) {
            const start = new Date(`${currentEvent.date}T${currentEvent.start_time_iso}`);
            const timeInClose = new Date(start.getTime() + (60 * 60 * 1000));
            const end = currentEvent.end_time_iso ? new Date(`${currentEvent.date}T${currentEvent.end_time_iso}`) : new Date(start.getTime() + (4 * 3600000));
            const timeoutStart = new Date(end.getTime() - (15 * 60 * 1000));
            const timeoutExpiry = new Date(end.getTime() + (60 * 60 * 1000));

            const modalCD = document.getElementById('modalCountdown');
            const label = document.getElementById('countdownLabel');
            const pBtn = document.getElementById('btnParticipateNow');

            if (currentEvent.has_timed_out) {
                label.innerText = "ATTENDANCE STATUS";
                modalCD.innerText = "ATTENDANCE COMPLETE";
                pBtn.disabled = true;
                pBtn.innerHTML = `<i class="ph-fill ph-check-circle text-xl"></i> Record Finalized`;
            } else if (now >= timeoutStart && now <= timeoutExpiry) {
                const diffOutExpiry = timeoutExpiry - now;
                label.innerText = "TIME OUT PORTAL OPEN";
                modalCD.innerText = `CLOSES IN ${formatTimeDiff(diffOutExpiry)}`;
                pBtn.disabled = false;
                pBtn.innerHTML = `<i class="ph-bold ph-sign-out text-xl"></i> Initialize Time Out`;
            } else if (now >= start && now <= timeInClose) {
                if (currentEvent.already_attended) {
                    const diffToOut = timeoutStart - now;
                    label.innerText = "TIME IN RECORDED";
                    modalCD.innerText = `TIME OUT IN ${formatTimeDiff(diffToOut)}`;
                    pBtn.disabled = true;
                    pBtn.innerHTML = `<i class="ph-fill ph-check-circle text-xl"></i> Time In Verified`;
                } else {
                    const diffInClose = timeInClose - now;
                    label.innerText = "TIME IN PORTAL OPEN";
                    modalCD.innerText = `CLOSES IN ${formatTimeDiff(diffInClose)}`;
                    pBtn.disabled = false;
                    pBtn.innerHTML = `<i class="ph-bold ph-scan text-xl"></i> Initialize Biometric Scanner`;
                }
            } else if (now < start) {
                const diffStart = start - now;
                label.innerText = "AUTHORIZING IN";
                modalCD.innerText = formatTimeDiff(diffStart);
                pBtn.disabled = true;
                pBtn.innerHTML = `<i class="ph-bold ph-lock-key text-xl"></i> UNLOCKS AT ${currentEvent.time}`;
            } else if (now > timeInClose && now < timeoutStart) {
                const diffToOut = timeoutStart - now;
                if (currentEvent.already_attended) {
                    label.innerText = "TIME IN RECORDED";
                    modalCD.innerText = `TIME OUT IN ${formatTimeDiff(diffToOut)}`;
                    pBtn.disabled = true;
                    pBtn.innerHTML = `<i class="ph-bold ph-timer text-xl"></i> TIME OUT AT ${formatClockTime(timeoutStart)}`;
                } else {
                    label.innerText = "TIME IN EXPIRED";
                    modalCD.innerText = `TIME OUT IN ${formatTimeDiff(diffToOut)}`;
                    pBtn.disabled = true;
                    pBtn.innerHTML = `<i class="ph-bold ph-timer text-xl"></i> TIME OUT AT ${formatClockTime(timeoutStart)}`;
                }
            } else {
                label.innerText = "ACTIVITY STATUS";
                modalCD.innerText = "PORTAL CLOSED";
                pBtn.disabled = true;
                pBtn.innerHTML = `<i class="ph-bold ph-lock-key text-xl"></i> Activity Concluded`;
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

    function formatClockTime(d) {
        if (!d) return '--:--';
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    setInterval(updateAllCountdowns, 1000);

    function openModal(e, clickEvent) {
        currentEvent = e;
        document.getElementById('modalImg').src = e.image;
        document.getElementById('modalTitle').innerText = e.title;
        document.getElementById('modalDateTime').innerText = `${e.date_display} @ ${e.time}`;
        document.getElementById('modalVenue').innerText = e.venue;
        document.getElementById('modalDesc').innerText = e.description || 'PUP Campus managed activity.';
        
        const modalOverlay = document.getElementById('participationModal');
        const modalDialog = document.getElementById('modalContentWrapper');
        const bgOverlay = document.getElementById('bgOverlayClose');
        
        modalDialog.classList.remove('ios-pop-wrapper-close');
        modalDialog.classList.add('ios-pop-wrapper');
        
        if (clickEvent && clickEvent.clientX) {
            modalDialog.style.setProperty('--click-x', clickEvent.clientX + 'px');
            modalDialog.style.setProperty('--click-y', clickEvent.clientY + 'px');
        } else {
            modalDialog.style.setProperty('--click-x', '50%');
            modalDialog.style.setProperty('--click-y', '50%');
        }
        
        bgOverlay.style.opacity = '1';
        
        modalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        switchView('viewDetails');
        updateAllCountdowns();
    }

    function switchView(id) {
        ['viewDetails', 'viewPermissions', 'viewScanner', 'viewSuccess'].forEach(v => {
            document.getElementById(v).style.display = 'none';
        });
        document.getElementById(id).style.display = 'flex';
    }

    function closeParticipationModal() {
        const modalDialog = document.getElementById('modalContentWrapper');
        const bgOverlay = document.getElementById('bgOverlayClose');

        modalDialog.classList.remove('ios-pop-wrapper');
        modalDialog.classList.add('ios-pop-wrapper-close');
        bgOverlay.style.opacity = '0';

        setTimeout(() => {
            document.getElementById('participationModal').style.display = 'none';
            document.body.style.overflow = '';
            if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
            if (validationInterval) { clearInterval(validationInterval); validationInterval = null; }
            currentEvent = null; isFaceVerified = isLocationVerified = false;
            document.getElementById('qualityMeter').classList.add('hidden');
        }, 350);
    }

    if(searchInput) searchInput.addEventListener('input', () => renderEvents(searchInput.value));

    document.getElementById('btnParticipateNow').addEventListener('click', () => switchView('viewPermissions'));
    document.getElementById('btnGrantPermission').addEventListener('click', startScanner);
    
    let autoSubmitted = false;
    async function startScanner() {
        switchView('viewScanner');
        autoSubmitted = false;
        const status = document.getElementById('scanStatus');
        status.innerText = "INITIALIZING SENSORS...";
        isLocationVerified = false;
        livenessDetector.reset();

        if (!modelsLoaded) {
            const MODEL_PATH = "/static/models";
            const CDN_FALLBACK = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH)
                ]);
            } catch(e) {
                console.warn("Loading models from local static failed, falling back to CDN:", e);
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(CDN_FALLBACK),
                    faceapi.nets.faceLandmark68Net.loadFromUri(CDN_FALLBACK),
                    faceapi.nets.faceRecognitionNet.loadFromUri(CDN_FALLBACK)
                ]);
            }
            modelsLoaded = true;
        }

        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user', 
                    width: { ideal: 640 }, 
                    height: { ideal: 640 }
                } 
            });
            const video = document.getElementById('videoFeed');
            video.srcObject = stream;
            video.onloadedmetadata = () => { video.play(); startQualityValidation(); startFastPoll(); };
        } catch (err) { 
            showBiometricModal({
                type: 'error',
                title: 'CAMERA ERROR',
                message: 'Unable to initialize device camera: ' + err.message,
                onConfirm: () => closeParticipationModal()
            });
            return; 
        }

        if (!map) {
            map = L.map('locationMap', {zoomControl: false, dragging: false, scrollWheelZoom: false}).setView([13.84615, 121.96955], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        }
        
        const isOutsideAllowed = currentEvent && (currentEvent.allow_outside_campus || currentEvent.attendance_scope === 'OUTSIDE_CAMPUS');

        if (isOutsideAllowed) {
            isLocationVerified = true;
            document.getElementById('locStatus').innerHTML = `<i class="ph-bold ph-check-circle text-green-500"></i> OUTSIDE CAMPUS ATTENDANCE ALLOWED`;
        }

        navigator.geolocation.watchPosition(pos => {
            userLat = pos.coords.latitude; userLng = pos.coords.longitude;
            map.setView([userLat, userLng], 17);
            L.marker([userLat, userLng]).addTo(map);
            
            if (isOutsideAllowed) {
                isLocationVerified = true;
                document.getElementById('locStatus').innerHTML = `<i class="ph-bold ph-check-circle text-green-500"></i> OUTSIDE CAMPUS ATTENDANCE ALLOWED`;
            } else {
                const target = L.latLng(13.84615, 121.96955);
                const dist = L.latLng(userLat, userLng).distanceTo(target);
                
                if (dist <= 300) {
                    isLocationVerified = true;
                    document.getElementById('locStatus').innerHTML = `<i class="ph-bold ph-check-circle text-green-500"></i> GEOFENCE VERIFIED (PUP UNISAN)`;
                } else {
                    isLocationVerified = false;
                    document.getElementById('locStatus').innerHTML = `<i class="ph-bold ph-warning text-amber-500"></i> OUTSIDE CAMPUS (${Math.round(dist)}m AWAY)`;
                }
            }
            checkAllVerified();
        }, null, { enableHighAccuracy: true });
    }

    function startQualityValidation() {
        if (validationInterval) clearInterval(validationInterval);
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const video = document.getElementById('videoFeed');
        document.getElementById('qualityMeter').classList.remove('hidden');
        validationInterval = setInterval(() => {
            if (!stream || !video || video.videoWidth === 0) return;
            canvas.width = 64; canvas.height = 64; ctx.drawImage(video, 0, 0, 64, 64);
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
            qualityScore = qualityStatus.isReady ? 100 : 40;

            document.getElementById('qualityBar').style.width = qualityScore + '%';
            if (isTooDark) {
                document.getElementById('qualityText').innerText = 'TOO DARK';
            } else if (isTooBright) {
                document.getElementById('qualityText').innerText = 'TOO BRIGHT';
            } else if (isGlare) {
                document.getElementById('qualityText').innerText = 'GLARE/SALAMIN';
            } else {
                document.getElementById('qualityText').innerText = 'OPTIMAL';
            }
        }, 200);
    }

    function startFastPoll() {
        const status = document.getElementById('scanStatus');
        const video = document.getElementById('videoFeed');
        const pollLoop = async () => {
            if (!stream || !currentEvent) return;
            
            try {
                const detections = await faceapi
                    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.65 }))
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
                    const livenessRes = livenessDetector.processFrame(detections[0], video.videoWidth, video.videoHeight);
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
            } catch(e) {
                console.warn("Liveness poll cycle error:", e);
            }
            
            checkAllVerified();
            setTimeout(pollLoop, 150);
        };
        pollLoop();
    }

    let isSubmitting = false;

    function checkAllVerified() {
        if (isSubmitting) return;
        const btn = document.getElementById('btnSubmitScan');
        const isLive = livenessDetector && livenessDetector.isLive;
        if (qualityStatus.isReady && isLocationVerified && isLive) {
            btn.disabled = false; btn.classList.add('bg-green-600');
            btn.innerHTML = `<i class="ph-bold ph-check-circle text-2xl"></i> Finalize Authorization`;
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
            btn.innerHTML = `<i class="ph-bold ph-scan text-2xl"></i> Detecting Full Face...`;
        } else {
            btn.disabled = true; btn.classList.remove('bg-green-600');
            btn.innerHTML = `<i class="ph-bold ph-bounding-box text-2xl"></i> Synchronizing Sensors...`;
        }
    }

    document.getElementById('btnSubmitScan').addEventListener('click', async () => {
        if (isSubmitting) return;
        if (!livenessDetector.isLive) {
            showBiometricModal({
                type: 'spoof',
                title: 'ANTI-SPOOFING VERIFICATION',
                message: 'Full live face verification is required. Static photos, printed images, and gallery screen projections are strictly prohibited.'
            });
            return;
        }
        isSubmitting = true;
        const btn = document.getElementById('btnSubmitScan');
        btn.disabled = true; btn.innerText = "COMMITTING TO SECURE LEDGER...";
        const canvas = document.createElement('canvas'); const video = document.getElementById('videoFeed');
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        canvas.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0);

        let detection = null;
        try {
            detection = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();
        } catch (err) {
            console.warn("Descriptor extraction error:", err);
        }

        if (!detection || !detection.descriptor) {
            showBiometricModal({
                type: 'warning',
                title: 'FACE NOT CLEARLY DETECTED',
                message: 'Face could not be clearly recognized. Please ensure good lighting and face the camera directly.'
            });
            isSubmitting = false;
            checkAllVerified();
            return;
        }

        const descriptorArray = Array.from(detection.descriptor);
        const fd = new FormData();
        fd.append('event_id', currentEvent.id);
        fd.append('face_descriptor', JSON.stringify(descriptorArray));
        fd.append('face_image', canvas.toDataURL('image/jpeg', 0.8));
        fd.append('latitude', userLat || ''); fd.append('longitude', userLng || '');
        fd.append('is_valid_location', isLocationVerified);
        fd.append('is_live_verified', 'true');
        const csrf = document.cookie.split('; ').find(r => r.startsWith('csrftoken=')).split('=')[1];
        try {
            const res = await fetch('/student/record-attendance', { method: 'POST', headers: { 'X-CSRFToken': csrf }, body: fd });
            const data = await res.json();
            if (data.status === 'success' || data.status === 'issue') {
                showBiometricToast("Attendance verified and securely logged!", "success");
                switchView('viewSuccess');
            } else { 
                const msg = data.message || "Attendance validation failed.";
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
                checkAllVerified();
            }
        } catch (e) { 
            showBiometricModal({
                type: 'error',
                title: 'INSTITUTIONAL SYNC ERROR',
                message: 'Unable to communicate with the campus attendance server. Please verify your connection and try again.'
            });
            isSubmitting = false; 
            checkAllVerified();
        }
    });

    document.getElementById('bgOverlayClose').onclick = closeParticipationModal;
    document.getElementById('btnTopClose').onclick = closeParticipationModal;
    document.getElementById('btnCancelPermission').onclick = closeParticipationModal;
    document.getElementById('btnSuccessClose').onclick = () => { currentEvent = null; closeParticipationModal(); location.reload(); };
    renderEvents();
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(initSchoolEventsLogic, 100); });
