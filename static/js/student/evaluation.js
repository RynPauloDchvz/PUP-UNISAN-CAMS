const eventsText = document.getElementById('events-data')?.textContent;
const historyText = document.getElementById('history-data')?.textContent;

const EVENTS_DATA = eventsText ? JSON.parse(eventsText) : [];
const HISTORY_DATA = historyText ? JSON.parse(historyText) : [];
const DEFAULT_IMG = "/static/images/PUPLogo.png";

function initEvaluationHubLogic() {
    const activeGrid = document.getElementById('activeEvaluationsGrid');
    const noActive = document.getElementById('noActiveEvaluations');
    const openSearch = document.getElementById('openSearch');
    let currentSession = null;

    function renderActive(query = '') {
        if (!activeGrid) return;
        activeGrid.innerHTML = '';
        const now = new Date();
        
        const activeEvents = EVENTS_DATA.filter(e => {
            const matchesSearch = e.title.toLowerCase().includes(query.toLowerCase());
            if (!matchesSearch) return false;

            const evalCloseTime = e.eval_expiry_iso ? new Date(e.eval_expiry_iso) : null;
            const isToday = e.date === now.toISOString().split('T')[0];
            const inWindow = evalCloseTime && now <= evalCloseTime;
            
            return e.already_evaluated || inWindow || isToday || !e.has_timed_out || e.is_eligible;
        });

        if (activeEvents.length === 0) {
            if(noActive) noActive.style.display = 'block';
            return;
        }
        if(noActive) noActive.style.display = 'none';

        activeEvents.forEach(e => {
            const card = document.createElement('div');
            card.className = "evaluation-card bg-white dark:bg-pup-darkcard rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 group shadow-sm hover:shadow-xl transition-all flex flex-row sm:flex-col cursor-pointer";
            
            const evalCloseTime = e.eval_expiry_iso ? new Date(e.eval_expiry_iso) : null;
            const isOpen = e.has_timed_out && evalCloseTime && now <= evalCloseTime && !e.already_evaluated;
            const isExpired = e.has_timed_out && evalCloseTime && now > evalCloseTime && !e.already_evaluated;
            
            let btnHtml = "";
            let statusLabel = "";
            let statusClass = "bg-black/60 backdrop-blur-xl border-white/10";
            
            if (e.already_evaluated) {
                statusLabel = `<i class="ph-fill ph-check-circle"></i> COMPLETED`;
                statusClass = "bg-green-600 border-green-500 shadow-lg shadow-green-500/30";
                btnHtml = `<button type="button" class="btn-eval pointer-events-none mt-auto w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 font-black text-[7px] sm:text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 border border-green-200 dark:border-green-800">
                    <i class="ph-fill ph-check-circle text-xs sm:text-sm"></i> Evaluated
                  </button>`; 
            } else if (!e.has_timed_out) {
                statusLabel = `<i class="ph-bold ph-lock-key"></i> TIME OUT REQUIRED`;
                btnHtml = `<button type="button" class="btn-eval pointer-events-none mt-auto w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 font-black text-[7px] sm:text-[10px] uppercase tracking-[0.2em] flex flex-col items-center justify-center gap-0.5 sm:gap-1">
                    <span class="flex items-center gap-2"><i class="ph-bold ph-lock-key"></i> ${e.att_status}</span>
                    <span class="text-[6px] sm:text-[7px] opacity-60">TIME OUT REQUIRED FIRST</span>
                  </button>`;
            } else if (isOpen) {
                const diff = Math.max(0, evalCloseTime - now);
                statusLabel = `<i class="ph-fill ph-broadcast animate-pulse"></i> ACTIVE • <span class="eval-countdown font-mono" data-expiry="${e.eval_expiry_iso}">${formatTimeDiffFull(diff)}</span>`;
                statusClass = "bg-green-600/90 border-green-500 animate-pulse shadow-lg shadow-green-600/30";
                btnHtml = `<button type="button" class="btn-eval btn-eval-action mt-auto w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-pup-maroon text-white dark:bg-pup-gold dark:text-black font-black text-[7px] sm:text-[10px] uppercase tracking-[0.2em] shadow-xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <i class="ph-bold ph-pencil-simple text-xs sm:text-sm"></i> Evaluate Now
                  </button>`;
            } else if (isExpired) {
                statusLabel = `<i class="ph-bold ph-clock-counter-clockwise"></i> EXPIRED`;
                statusClass = "bg-red-700/80 border-red-500/40";
                btnHtml = `<button type="button" class="btn-eval pointer-events-none mt-auto w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 font-black text-[7px] sm:text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                    <i class="ph-bold ph-x-circle text-red-500 text-xs sm:text-lg"></i> Closed (Expired)
                  </button>`;
            } else {
                statusLabel = `<i class="ph-bold ph-lock-key"></i> RESTRICTED`;
                btnHtml = `<button type="button" class="btn-eval pointer-events-none mt-auto w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 font-black text-[7px] sm:text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                    <i class="ph-bold ph-x-circle text-red-500 text-xs sm:text-lg"></i> Closed
                  </button>`;
            }

            card.innerHTML = `
                <div class="card-image-container w-28 sm:h-44 sm:w-full relative overflow-hidden bg-gray-900 shrink-0 border-r sm:border-r-0 sm:border-b border-gray-100 dark:border-gray-800">
                    <img src="${e.image}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80" onerror="this.src=DEFAULT_IMG; this.classList.remove('object-cover'); this.classList.add('object-contain', 'p-4 sm:p-6');">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                    <div class="absolute top-2 left-2 sm:top-4 sm:left-4">
                        <span class="${statusClass} border text-white text-[6px] sm:text-[8px] px-2 py-1 sm:px-3 sm:py-1.5 rounded-full font-black uppercase tracking-widest">${statusLabel}</span>
                    </div>
                </div>
                <div class="card-content-container p-3 sm:p-6 flex-grow flex flex-col bg-white dark:bg-pup-darkcard min-w-0">
                    <div class="text-[7px] sm:text-[8px] font-black text-pup-maroon dark:text-pup-gold mb-0.5 sm:mb-6 uppercase tracking-[0.2em] flex justify-between items-center">
                        <span>${e.date_display || e.date}</span>
                        <span class="sm:hidden text-gray-400">${e.time}</span>
                    </div>
                    
                    <h3 class="text-gray-900 dark:text-white font-black text-xs sm:text-lg leading-tight uppercase tracking-tighter truncate mb-2 sm:mb-0">${e.title}</h3>
                    
                    <div class="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-50 dark:border-gray-800 mt-auto">
                        <p class="text-[7px] sm:text-[8px] text-gray-400 flex items-center gap-1 font-bold uppercase tracking-widest truncate">
                            <i class="ph-fill ph-map-pin text-pup-maroon dark:text-pup-gold"></i> 
                            <span class="truncate">${e.venue}</span>
                        </p>
                        <div class="flex items-center gap-2">
                            ${e.already_evaluated ? '<i class="ph-fill ph-check-circle text-green-500 text-sm sm:text-base"></i>' : '<i class="ph-bold ph-caret-right text-gray-300 group-hover:text-pup-maroon dark:group-hover:text-pup-gold transition-all group-hover:translate-x-1 text-sm sm:text-base"></i>'}
                        </div>
                    </div>
                    
                    <div class="hidden sm:block mt-4">
                        ${btnHtml}
                    </div>
                </div>
            `;

            card.onclick = (jsEvent) => openSessionModal(e, jsEvent);

            const actionBtn = card.querySelector('.btn-eval-action');
            if (actionBtn) {
                actionBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    startEvaluation(e.id, e.title, e.image);
                });
            }

            activeGrid.appendChild(card);
        });
    }

    function formatTimeDiffShort(ms) {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        if (h > 0) return `${h}H ${m}M`;
        return `${m}M ${s}S`;
    }

    function formatTimeDiffFull(ms) {
        if (ms <= 0) return '00:00:00';
        const s = Math.floor(ms / 1000);
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (d > 0) return `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }

    function formatClockTime(date) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    window.openSessionModal = (e, jsEvent) => {
        currentSession = e;
        const now = new Date();
        const evalCloseTime = e.eval_expiry_iso ? new Date(e.eval_expiry_iso) : null;
        const isOpen = e.has_timed_out && evalCloseTime && now <= evalCloseTime && !e.already_evaluated;
        const isExpired = e.has_timed_out && evalCloseTime && now > evalCloseTime && !e.already_evaluated;
        
        document.getElementById('modalS_Img').src = e.image;
        document.getElementById('modalS_Title').innerText = e.title;
        document.getElementById('modalS_DateTime').innerText = `${e.date_display || e.date} @ ${e.time}`;
        document.getElementById('modalS_Venue').innerText = e.venue;
        document.getElementById('modalS_Desc').innerText = e.cleaned_description || e.description || 'Your feedback is vital for institutional record synchronization and activity optimization.';
        
        const btnContainer = document.getElementById('evalBtnContainer');
        const noticeContainer = document.getElementById('evalStatusNotice');
        const noticeContent = document.getElementById('evalStatusNoticeContent');

        if (e.already_evaluated) {
            if (btnContainer) btnContainer.classList.add('hidden');
            if (noticeContainer) noticeContainer.classList.remove('hidden');
            if (noticeContent) {
                noticeContent.className = 'p-4 rounded-2xl text-center font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800';
                noticeContent.innerHTML = '<i class="ph-fill ph-check-circle text-lg"></i> Evaluation Already Submitted';
            }
        } else if (!e.has_timed_out) {
            if (btnContainer) btnContainer.classList.add('hidden');
            if (noticeContainer) noticeContainer.classList.remove('hidden');
            if (noticeContent) {
                noticeContent.className = 'p-4 rounded-2xl text-center font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
                noticeContent.innerHTML = '<i class="ph-bold ph-lock-key text-lg"></i> Time Out Required From Event First';
            }
        } else if (isExpired) {
            if (btnContainer) btnContainer.classList.add('hidden');
            if (noticeContainer) noticeContainer.classList.remove('hidden');
            if (noticeContent) {
                noticeContent.className = 'p-4 rounded-2xl text-center font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800';
                noticeContent.innerHTML = '<i class="ph-bold ph-clock-counter-clockwise text-lg"></i> Evaluation Window Has Expired';
            }
        } else if (isOpen) {
            if (btnContainer) btnContainer.classList.remove('hidden');
            if (noticeContainer) noticeContainer.classList.add('hidden');
        } else {
            if (btnContainer) btnContainer.classList.add('hidden');
            if (noticeContainer) noticeContainer.classList.remove('hidden');
            if (noticeContent) {
                noticeContent.className = 'p-4 rounded-2xl text-center font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700';
                noticeContent.innerHTML = '<i class="ph-bold ph-lock-key text-lg"></i> Evaluation Currently Unavailable';
            }
        }

        const modal = document.getElementById('sessionDetailModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        
        const wrapper = modal.querySelector('.ios-pop-wrapper');
        if (wrapper) {
            wrapper.classList.remove('ios-pop-wrapper-close');
            if (jsEvent && jsEvent.clientX) {
                wrapper.style.setProperty('--click-x', jsEvent.clientX + 'px');
                wrapper.style.setProperty('--click-y', jsEvent.clientY + 'px');
            } else {
                wrapper.style.setProperty('--click-x', '50%');
                wrapper.style.setProperty('--click-y', '50%');
            }
        }
    };

    window.closeSessionModal = () => {
        const modal = document.getElementById('sessionDetailModal');
        const wrapper = modal.querySelector('.ios-pop-wrapper');
        
        const finishClose = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
            currentSession = null;
        };

        if (wrapper) {
            wrapper.classList.add('ios-pop-wrapper-close');
            setTimeout(finishClose, 350);
        } else {
            finishClose();
        }
    };

    window.triggerStartEval = () => {
        if (currentSession) {
            startEvaluation(currentSession.id, currentSession.title, currentSession.image);
        }
    };

    const btnEval = document.getElementById('btnEvaluateNow');
    if (btnEval) {
        btnEval.addEventListener('click', window.triggerStartEval);
    }

    function analyzeSentiment(text, vaderResult = null) {
        if (vaderResult && vaderResult.label) {
            const label = vaderResult.label.charAt(0).toUpperCase() + vaderResult.label.slice(1);
            if (label === 'Positive') return { label: 'Positive', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: 'ph-smiley' };
            if (label === 'Negative') return { label: 'Negative', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: 'ph-smiley-sad' };
            return { label: 'Neutral', class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: 'ph-meh' };
        }

        if (!text || text.toLowerCase() === 'no feedback provided.') return { label: 'Neutral', class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: 'ph-meh' };
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'helpful', 'informative', 'learned', 'well', 'organized', 'maganda', 'mahusay', 'sulit', 'maraming natutunan', 'salamat', 'thank', 'nice', 'ayos', 'the best'];
        const negativeWords = ['bad', 'poor', 'boring', 'waste', 'disorganized', 'late', 'rude', 'confusing', 'pangit', 'sayang', 'mabagal', 'maingay', 'gulo', 'hindi maganda', 'failed'];
        const lowerText = text.toLowerCase();
        let score = 0;
        positiveWords.forEach(word => { if (lowerText.includes(word)) score++; });
        negativeWords.forEach(word => { if (lowerText.includes(word)) score--; });
        if (score > 0) return { label: 'Positive', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: 'ph-smiley' };
        if (score < 0) return { label: 'Negative', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: 'ph-smiley-sad' };
        return { label: 'Neutral', class: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: 'ph-meh' };
    }

    window.openHistoryModal = (record, jsEvent) => {
        document.getElementById('modalH_Title').innerText = record.title;
        document.getElementById('modalH_Date').innerText = `Submitted on ${record.date}`;
        document.getElementById('modalH_Time').innerText = record.time || '--:--';
        document.getElementById('modalH_Rating').innerText = parseFloat(record.rating).toFixed(1);
        document.getElementById('modalH_Feedback').innerText = record.feedback || 'No comments provided.';
        
        let starsHtml = '';
        const r = parseFloat(record.rating);
        for(let i=1; i<=5; i++) {
            if(i <= Math.floor(r)) starsHtml += '<i class="ph-fill ph-star"></i>';
            else if(i === Math.ceil(r) && r % 1 !== 0) starsHtml += '<i class="ph-fill ph-star-half"></i>';
            else starsHtml += '<i class="ph-fill ph-star text-gray-200 dark:text-gray-800"></i>';
        }
        document.getElementById('modalH_Stars').innerHTML = starsHtml;

        const ratingVal = parseFloat(record.rating);
        const feedbackText = record.feedback || '';
        const sentiment = analyzeSentiment(feedbackText, record.sentiment);
        
        const badge = document.getElementById('modalH_SentimentBadge');
        const sPctEl = document.getElementById('modalH_SentimentPct');
        const sLabelEl = document.getElementById('modalH_SentimentLabel');
        const sIconEl = document.getElementById('modalH_SentimentIcon');

        // Update Badge
        badge.className = `px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 border border-current opacity-90 transition-all duration-300 ${sentiment.class}`;
        badge.innerHTML = `<i class="ph-fill ${sentiment.icon}"></i> ${sentiment.label} (AI)`;

        // Update Main Sentiment Display
        sPctEl.innerText = `${Math.round((ratingVal / 5) * 100)}% Match`;
        sLabelEl.innerText = sentiment.label.toUpperCase();
        
        if (sentiment.label === 'Positive') {
            sPctEl.className = "text-green-500 font-black text-sm transition-all duration-500";
            sIconEl.className = "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-green-50 text-green-500 dark:bg-green-900/20 shrink-0 transition-all duration-500";
            sIconEl.innerHTML = '<i class="ph-fill ph-smiley"></i>';
        } else if (sentiment.label === 'Neutral') {
            sPctEl.className = "text-amber-500 font-black text-sm transition-all duration-500";
            sIconEl.className = "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-amber-50 text-amber-500 dark:bg-amber-900/20 shrink-0 transition-all duration-500";
            sIconEl.innerHTML = '<i class="ph-fill ph-smiley-meh"></i>';
        } else {
            sPctEl.className = "text-red-500 font-black text-sm transition-all duration-500";
            sIconEl.className = "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-red-50 text-red-500 dark:bg-red-900/20 shrink-0 transition-all duration-500";
            sIconEl.innerHTML = '<i class="ph-fill ph-smiley-sad"></i>';
        }

        const modal = document.getElementById('historyDetailModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        
        const wrapper = modal.querySelector('.ios-pop-wrapper');
        if (wrapper) {
            wrapper.classList.remove('ios-pop-wrapper-close');
            if (jsEvent && jsEvent.clientX) {
                wrapper.style.setProperty('--click-x', jsEvent.clientX + 'px');
                wrapper.style.setProperty('--click-y', jsEvent.clientY + 'px');
            } else {
                wrapper.style.setProperty('--click-x', '50%');
                wrapper.style.setProperty('--click-y', '50%');
            }
        }
    };

    window.closeHistoryModal = () => {
        const modal = document.getElementById('historyDetailModal');
        const wrapper = modal.querySelector('.ios-pop-wrapper');
        
        const finishClose = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
        };

        if (wrapper) {
            wrapper.classList.add('ios-pop-wrapper-close');
            setTimeout(finishClose, 350);
        } else {
            finishClose();
        }
    };

    window.startEvaluation = (id, title, img) => {
        sessionStorage.setItem('eval_event_id', id);
        sessionStorage.setItem('eval_event_title', title || '');
        sessionStorage.setItem('eval_event_img', img || '');
        window.location.href = "/student/evaluation-form?event_id=" + encodeURIComponent(id) + "&event_title=" + encodeURIComponent(title || '') + "&event_img=" + encodeURIComponent(img || '');
    };

    if (openSearch) {
        openSearch.addEventListener('input', () => {
            renderActive(openSearch.value);
        });
    }

    renderActive();

    function updateCountdowns() {
        const now = new Date();
        const countdownEls = document.querySelectorAll('.eval-countdown');
        countdownEls.forEach(el => {
            const expiryStr = el.getAttribute('data-expiry');
            if (!expiryStr) return;
            const expiry = new Date(expiryStr);
            const diff = expiry - now;
            if (diff <= 0) {
                el.innerText = '00:00:00';
                if (!el.dataset.expiredFlag) {
                    el.dataset.expiredFlag = 'true';
                    renderActive(openSearch ? openSearch.value : '');
                }
            } else {
                el.innerText = formatTimeDiffFull(diff);
            }
        });
    }
    setInterval(updateCountdowns, 1000); 
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initEvaluationHubLogic, 100);
});
