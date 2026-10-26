function initHistoryLogic() {
    let historyData = [];
    try {
        const el = document.getElementById('history-json-data');
        if (el && el.textContent) {
            historyData = JSON.parse(el.textContent);
        }
    } catch(e) {
        console.error("Error parsing history data:", e);
    }

    const grid = document.getElementById('historyGrid');
    const searchInput = document.getElementById('historySearch');
    const noResults = document.getElementById('noResults');
    const modal = document.getElementById('historyModal');
    const modalContent = document.getElementById('modalContentBlock');

    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    const backBtn = document.getElementById('dynamicBackButton');
    const backText = document.getElementById('dynamicBackText');
    const filterWrapper = document.getElementById('customFilterWrapper');
    const pageDesc = document.getElementById('pageDesc');
    const pageTitle = document.getElementById('pageTitle');
    
    window.currentFilterVal = 'all';

    if (tabParam === 'attendance') {
        window.currentFilterVal = 'Attendance';
        const filterText = document.getElementById('selectedFilterText');
        if (filterText) filterText.innerText = 'Attendance';
        if (backBtn) {
            backBtn.href = "/student/school-events";
            backBtn.classList.remove('hidden');
            backBtn.classList.add('flex');
        }
        if (backText) backText.innerText = "Back to Participation";
        if (pageTitle) pageTitle.innerText = "Attendance History";
        if (pageDesc) pageDesc.innerText = "Review your verified participation and biometric attendance records.";
        if (filterWrapper) filterWrapper.classList.add('hidden');
    } else if (tabParam === 'evaluation') {
        window.currentFilterVal = 'Evaluation';
        const filterText = document.getElementById('selectedFilterText');
        if (filterText) filterText.innerText = 'Evaluations';
        if (backBtn) {
            backBtn.href = "/student/evaluation";
            backBtn.classList.remove('hidden');
            backBtn.classList.add('flex');
        }
        if (backText) backText.innerText = "Back to Evaluation";
        if (pageTitle) pageTitle.innerText = "Evaluation History";
        if (pageDesc) pageDesc.innerText = "Review your submitted feedback and synchronization scores.";
        if (filterWrapper) filterWrapper.classList.add('hidden');
    }

    window.toggleFilterDrawer = function() {
        const drawer = document.getElementById('filterOptions');
        const caret = document.getElementById('filterCaret');
        if (drawer.style.maxHeight && drawer.style.maxHeight !== '0px') {
            drawer.style.maxHeight = '0px';
            caret.style.transform = 'rotate(0deg)';
        } else {
            drawer.style.maxHeight = drawer.scrollHeight + 'px';
            caret.style.transform = 'rotate(180deg)';
        }
    };

    window.selectFilter = function(val, text) {
        window.currentFilterVal = val;
        document.getElementById('selectedFilterText').innerText = text;
        window.toggleFilterDrawer();
        applyFilters();
    };

    document.addEventListener('click', function(e) {
        const wrapper = document.getElementById('customFilterWrapper');
        if (wrapper && !wrapper.contains(e.target)) {
            const drawer = document.getElementById('filterOptions');
            const caret = document.getElementById('filterCaret');
            if (drawer && drawer.style.maxHeight && drawer.style.maxHeight !== '0px') {
                drawer.style.maxHeight = '0px';
                caret.style.transform = 'rotate(0deg)';
            }
        }
    });

    window.switchAttTab = function(tab) {
        const faceBtn = document.getElementById('tabAttFace');
        const locBtn = document.getElementById('tabAttLoc');
        const faceBlock = document.getElementById('attFaceBlock');
        const locBlock = document.getElementById('attLocBlock');

        if (tab === 'face') {
            faceBtn.className = "flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg bg-white dark:bg-[#333] shadow-sm text-pup-maroon dark:text-pup-gold transition-all";
            locBtn.className = "flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all";
            faceBlock.classList.remove('hidden');
            faceBlock.classList.add('flex');
            locBlock.classList.add('hidden');
            locBlock.classList.remove('flex');
        } else {
            locBtn.className = "flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg bg-white dark:bg-[#333] shadow-sm text-pup-maroon dark:text-pup-gold transition-all";
            faceBtn.className = "flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all";
            locBlock.classList.remove('hidden');
            locBlock.classList.add('flex');
            faceBlock.classList.add('hidden');
            faceBlock.classList.remove('flex');
        }
    };

    window.switchEvalTab = function(tab) {
        const scoreBtn = document.getElementById('tabEvalScore');
        const fbBtn = document.getElementById('tabEvalFeedback');
        const scoreBlock = document.getElementById('evalScoreBlock');
        const fbBlock = document.getElementById('evalFeedbackBlock');

        if (tab === 'score') {
            scoreBtn.className = "flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg bg-white dark:bg-[#333] shadow-sm text-pup-maroon dark:text-pup-gold transition-all";
            fbBtn.className = "flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all";
            scoreBlock.classList.remove('hidden');
            scoreBlock.classList.add('flex');
            fbBlock.classList.add('hidden');
            fbBlock.classList.remove('flex');
        } else {
            fbBtn.className = "flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg bg-white dark:bg-[#333] shadow-sm text-pup-maroon dark:text-pup-gold transition-all";
            scoreBtn.className = "flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all";
            fbBlock.classList.remove('hidden');
            fbBlock.classList.add('flex');
            scoreBlock.classList.add('hidden');
            scoreBlock.classList.remove('flex');
        }
    };

    function renderHistory(dataToRender) {
        if (!grid) return;
        grid.innerHTML = '';
        
        if (dataToRender.length === 0) {
            noResults.classList.remove('hidden');
            return;
        }
        noResults.classList.add('hidden');

        dataToRender.forEach(item => {
            const isAttendance = item.type === 'Attendance' || item.type === 'Time In' || item.type === 'Time Out';
            const badgeClass = isAttendance ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            const icon = isAttendance ? 'ph-user-focus' : 'ph-clipboard-text';
            
            const html = `
                <div class="bg-white dark:bg-pup-darkcard rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-row sm:flex-col cursor-pointer group shadow-sm hover:border-pup-maroon dark:hover:border-pup-gold transition-all relative" onclick="openHistoryModal('${item.id}', event)">
                    <div class="w-24 sm:w-full h-24 sm:h-32 shrink-0 relative bg-gray-100 dark:bg-[#0a0a0a] border-r sm:border-r-0 sm:border-b border-gray-200 dark:border-gray-800">
                        <img src="${item.img}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" onerror="this.src='/static/images/PUPLogo.png'; this.classList.remove('object-cover'); this.classList.add('object-contain', 'p-2');">
                    </div>
                    <div class="absolute top-2 left-2 sm:right-2 sm:left-auto z-10">
                        <span class="text-[7px] sm:text-[0.65rem] font-black px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg uppercase ${badgeClass} shadow-md whitespace-nowrap backdrop-blur-sm tracking-widest flex items-center gap-0.5 sm:gap-1 max-w-[5.5rem] sm:max-w-none overflow-hidden"><i class="ph-fill ${icon} shrink-0"></i> <span class="truncate">${item.type}</span></span>
                    </div>
                    <div class="p-3 sm:p-4 flex flex-col justify-center flex-grow min-w-0">
                        <div class="flex justify-between items-start mb-1 mt-1 sm:mt-0">
                            <div class="text-[10px] sm:text-[0.65rem] font-bold text-pup-maroon dark:text-pup-gold truncate uppercase tracking-widest">${item.date}</div>
                        </div>
                        <h3 class="font-black text-sm sm:text-base text-gray-900 dark:text-white leading-tight mb-1 truncate uppercase">${item.title}</h3>
                        <p class="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate uppercase tracking-widest"><i class="ph-fill ph-map-pin text-pup-maroon dark:text-pup-gold shrink-0"></i> <span class="truncate">${item.venue}</span></p>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', html);
        });
    }

    window.openHistoryModal = function(id, jsEvent) {
        if(window.switchAttTab) window.switchAttTab('face');
        if(window.switchEvalTab) window.switchEvalTab('score');
        
        const item = historyData.find(i => i.id === id);
        if(!item) return;

        document.getElementById('modalTitle').innerText = item.title;
        document.getElementById('modalType').innerText = item.type + " Record";
        document.getElementById('modalDateTime').innerHTML = `<i class="ph-fill ph-calendar text-pup-maroon dark:text-pup-gold text-lg"></i> ${item.date} • ${item.time}`;
        document.getElementById('modalVenue').innerHTML = `<i class="ph-fill ph-map-pin text-pup-maroon dark:text-pup-gold text-lg"></i> ${item.venue}`;
        
        if(item.type === 'Attendance' || item.type === 'Time In' || item.type === 'Time Out') {
            document.getElementById('viewAttendanceProof').classList.remove('hidden');
            document.getElementById('viewEvaluationProof').classList.add('hidden');
            
            const proofTypeStr = (item.type === 'Time In' || item.type === 'Time Out') ? `${item.type} Log` : 'Timestamp Log';
            document.getElementById('modalProofType').innerText = proofTypeStr.toUpperCase();
            document.getElementById('proofTime').innerText = item.details.timestamp;
            
            // 🟢 Show Capture Image
            const faceContainer = document.querySelector('#viewAttendanceProof .aspect-\\[3\\/4\\]');
            if (item.details.capture_url) {
                faceContainer.innerHTML = `<img src="${item.details.capture_url}" class="w-full h-full object-cover">`;
            } else {
                faceContainer.innerHTML = `<i class="ph-fill ph-user text-6xl text-gray-400"></i>`;
            }

            // Handle location signature with Reverse Geocoding
            const locSig = document.getElementById('modalLocationText');
            const mapOverlay = document.getElementById('modalMapOverlay');
            
            const coords = item.details.coords || "N/A";
            const colorClass = item.details.is_valid_location ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
            let locText = item.details.is_valid_location ? "Verified inside designated location" : "Outside designated event geofence";
            
            locSig.innerHTML = `<span class="text-gray-500 text-xs italic"><i class="ph ph-spinner animate-spin"></i> Fetching address...</span><br><span class="text-[10px] text-gray-400 font-mono uppercase tracking-tighter mt-1 block">GPS: ${coords}</span>`;

            if (coords !== "N/A" && coords.includes(',')) {
                mapOverlay.classList.remove('opacity-0', 'pointer-events-none');
                mapOverlay.classList.add('flex');

                const [lat, lng] = coords.split(',').map(s => s.trim());
                const latNum = parseFloat(lat);
                const lngNum = parseFloat(lng);

                if (window._historyLeafletMap) {
                    window._historyLeafletMap.remove();
                    window._historyLeafletMap = null;
                }

                let markerRef = null;

                setTimeout(() => {
                    const mapEl = document.getElementById('modalLeafletMap');
                    if (!mapEl) return;
                    const map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false }).setView([latNum, lngNum], 16);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap contributors',
                        maxZoom: 19
                    }).addTo(map);

                    const pinColor = item.details.is_valid_location ? '#22c55e' : '#ef4444';
                    const markerIcon = L.divIcon({
                        html: `<div style="background:${pinColor};width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
                        className: '',
                        iconSize: [18, 18],
                        iconAnchor: [9, 9]
                    });

                    markerRef = L.marker([latNum, lngNum], { icon: markerIcon }).addTo(map)
                        .bindPopup(`<span style="font-size:10px;font-family:inherit;color:#666;">Fetching address...</span>`)
                        .openPopup();

                    map.invalidateSize();
                    window._historyLeafletMap = map;
                    window._historyLeafletMarker = markerRef;
                    mapOverlay.classList.add('opacity-0', 'pointer-events-none');
                }, 100);

                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                    .then(r => r.json())
                    .then(data => {
                        if (data && data.display_name) {
                            const address = data.display_name.split(',').slice(0, 3).join(',');
                            locSig.innerHTML = `<span class="${colorClass} leading-tight">${address}</span><br><span class="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">GPS: ${coords}</span>`;
                            if (window._historyLeafletMarker) {
                                window._historyLeafletMarker.setPopupContent(`<span style="font-size:10px;font-family:inherit;line-height:1.4;display:block;max-width:180px;">${address}</span>`);
                            }
                        } else {
                            locSig.innerHTML = `<span class="${colorClass}">${locText}</span><br><span class="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">GPS: ${coords}</span>`;
                            if (window._historyLeafletMarker) {
                                window._historyLeafletMarker.setPopupContent(`<span style="font-size:10px;font-family:inherit;">${locText}</span>`);
                            }
                        }
                    })
                    .catch(e => {
                        locSig.innerHTML = `<span class="${colorClass}">${locText}</span><br><span class="text-[10px] text-gray-400 font-mono uppercase tracking-tighter mt-1 block">GPS: ${coords}</span>`;
                    });
            } else {
                mapOverlay.classList.remove('opacity-0', 'pointer-events-none');
                mapOverlay.innerHTML = `<span class="text-[10px] font-bold uppercase tracking-widest text-gray-500">Map Unavailable</span>`;
                if (window._historyLeafletMap) {
                    window._historyLeafletMap.remove();
                    window._historyLeafletMap = null;
                }
                const colorClass = item.details.is_valid_location ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
                locSig.innerHTML = `<span class="${colorClass}">${locText}</span><br><span class="text-[10px] text-gray-400 font-mono uppercase tracking-tighter mt-1 block">GPS: ${coords}</span>`;
            }

            const faceBadge = document.querySelector('#viewAttendanceProof .text-green-600, #viewAttendanceProof .text-red-600, #viewAttendanceProof .bg-green-100, #viewAttendanceProof .bg-red-100');
            if (faceBadge) {
                if (item.details.face_matched) {
                    faceBadge.innerHTML = '<i class="ph-fill ph-check-circle"></i> MATCHED';
                    faceBadge.className = 'text-[10px] font-black px-3 py-1 rounded-md w-full text-center border border-green-200 bg-green-50 text-green-600 uppercase tracking-widest';
                } else {
                    faceBadge.innerHTML = '<i class="ph-fill ph-x-circle"></i> MISMATCH';
                    faceBadge.className = 'text-[10px] font-black px-3 py-1 rounded-md w-full text-center border border-red-200 bg-red-50 text-red-600 uppercase tracking-widest';
                }
            }

        } else {
            document.getElementById('viewAttendanceProof').classList.add('hidden');
            document.getElementById('viewEvaluationProof').classList.remove('hidden');
            
            const rawScore = parseInt(item.details.total_raw_score) || 0;
            const avgRating = (rawScore / 25).toFixed(1);
            const percent = Math.round((rawScore / 125) * 100);
            
            const starsContainer = document.getElementById('modalEvalStars');
            let starsHtml = '';
            const r = parseFloat(avgRating);
            for(let i=1; i<=5; i++) {
                if (i <= Math.floor(r)) starsHtml += '<i class="ph-fill ph-star"></i>';
                else if (i === Math.ceil(r) && r % 1 !== 0) starsHtml += '<i class="ph-fill ph-star-half"></i>';
                else starsHtml += '<i class="ph ph-star text-gray-200 dark:text-gray-800"></i>';
            }
            starsContainer.innerHTML = starsHtml;
            document.getElementById('modalEvalAvgLabel').innerText = `${avgRating} / 5.0`;
            document.getElementById('modalEvalPercent').innerText = `${percent}%`;
            
            const emojiEl = document.getElementById('modalEvalEmoji');
            const gradeEl = document.getElementById('modalEvalGrade');
            if (percent >= 90) { emojiEl.innerText = '🤩'; gradeEl.innerText = 'Outstanding'; gradeEl.className = 'text-[0.65rem] font-black text-green-600 dark:text-green-400 mt-1 uppercase tracking-tighter'; }
            else if (percent >= 75) { emojiEl.innerText = '😊'; gradeEl.innerText = 'Satisfactory'; gradeEl.className = 'text-[0.65rem] font-black text-blue-600 dark:text-blue-400 mt-1 uppercase tracking-tighter'; }
            else if (percent >= 50) { emojiEl.innerText = '😐'; gradeEl.innerText = 'Average'; gradeEl.className = 'text-[0.65rem] font-black text-yellow-600 dark:text-yellow-400 mt-1 uppercase tracking-tighter'; }
            else { emojiEl.innerText = '😡'; gradeEl.innerText = 'Needs Improvement'; gradeEl.className = 'text-[0.65rem] font-black text-red-600 dark:text-red-400 mt-1 uppercase tracking-tighter'; }

            const feedback = item.details.feedback || "No feedback provided.";
            document.getElementById('modalEvalComment').innerText = `"${feedback}"`;
            
            const sentiment = item.details.sentiment;
            const badge = document.getElementById('modalSentimentBadge');
            
            if (sentiment && sentiment.label) {
                const label = sentiment.label.toUpperCase();
                let colorClass = "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
                let icon = "ph-smiley";
                
                if (label === 'POSITIVE') {
                    colorClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                    icon = "ph-smiley";
                } else if (label === 'NEGATIVE') {
                    colorClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                    icon = "ph-smiley-sad";
                } else if (label === 'NEUTRAL') {
                    colorClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
                    icon = "ph-smiley-meh";
                }
                
                badge.className = `px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${colorClass}`;
                badge.innerHTML = `<i class="ph-fill ${icon}"></i> ${label} (AI)`;
            } else {
                badge.className = "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
                badge.innerHTML = `<i class="ph-fill ph-meh"></i> ANALYZED`;
            }
        }

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        modalContent.classList.remove('ios-pop-wrapper-close');
        modalContent.classList.add('ios-pop-wrapper');
        if (jsEvent && jsEvent.clientX) {
            modalContent.style.setProperty('--click-x', jsEvent.clientX + 'px');
            modalContent.style.setProperty('--click-y', jsEvent.clientY + 'px');
        } else {
            modalContent.style.setProperty('--click-x', '50%');
            modalContent.style.setProperty('--click-y', '50%');
        }
    };

    window.closeHistoryModal = function() {
        modalContent.classList.remove('ios-pop-wrapper');
        modalContent.classList.add('ios-pop-wrapper-close');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 350);
    };

    function applyFilters() {
        const query = searchInput.value.toLowerCase();
        const selectedType = window.currentFilterVal || 'all';
        
        const filtered = historyData.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(query) || item.venue.toLowerCase().includes(query);
            const matchesType = selectedType === 'all' || 
                                (selectedType === 'Attendance' && (item.type === 'Time In' || item.type === 'Time Out' || item.type === 'Attendance')) || 
                                item.type === selectedType;
            return matchesSearch && matchesType;
        });
        renderHistory(filtered);
    }

    if(searchInput) searchInput.addEventListener('input', applyFilters);

    ['bgOverlayClose', 'btnTopClose'].forEach(id => {
        const btn = document.getElementById(id);
        if(btn) btn.addEventListener('click', window.closeHistoryModal);
    });

    applyFilters();
}

window.addEventListener('load', () => {
    const checkInterval = setInterval(() => {
        if (window.VUE_APP_MOUNTED) {
            clearInterval(checkInterval);
            initHistoryLogic();
        }
    }, 100);
});
