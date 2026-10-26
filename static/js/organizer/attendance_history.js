function initHistoryLogic() {
    const APP_STATIC_URL = "/static/images/";
    const DEFAULT_IMG = "/static/images/PUPLogo.png";

    const historyDataText = document.getElementById('history-data').textContent;
    const historyData = historyDataText ? JSON.parse(historyDataText) : [];

    function renderHistory() {
        const grid = document.getElementById('historyGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const query = document.getElementById('historySearch').value.toLowerCase();
        
        const filtered = historyData.filter(item => (item.title || "").toLowerCase().includes(query));

        if (filtered.length === 0) {
            document.getElementById('noResults').classList.remove('hidden');
        } else {
            document.getElementById('noResults').classList.add('hidden');
        }

        filtered.forEach(item => {
            const isVerified = item.details ? (item.details.face_matched && item.details.is_valid_location) : item.matched;
            const badgeClass = isVerified ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            const icon = isVerified ? 'ph-check-circle' : 'ph-x-circle';
            const statusText = isVerified ? 'Verified' : 'Unmatched';
            
            const html = `
                <div class="bg-white dark:bg-pup-darkcard rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-row sm:flex-col cursor-pointer group shadow-sm hover:border-pup-maroon dark:hover:border-pup-gold transition-all" onclick="openHistoryModal('${item.id}', event)">
                    <div class="w-24 sm:w-full h-24 sm:h-32 shrink-0 relative bg-gray-100 dark:bg-[#0a0a0a] border-r sm:border-r-0 sm:border-b border-gray-200 dark:border-gray-800">
                        <img src="${item.img}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" onerror="this.src=DEFAULT_IMG; this.classList.remove('object-cover'); this.classList.add('object-contain', 'p-2');">
                        <div class="absolute top-1 left-1 sm:top-2 sm:right-2 sm:left-auto">
                            <span class="text-[0.55rem] sm:text-[0.65rem] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md uppercase whitespace-nowrap ${badgeClass} shadow-sm"><i class="ph-fill ${icon}"></i> ${item.type}</span>
                        </div>
                    </div>
                    <div class="p-3 sm:p-4 flex flex-col justify-center flex-grow min-w-0">
                        <div class="flex justify-between items-start mb-1">
                            <div class="text-[0.65rem] font-bold text-pup-maroon dark:text-pup-gold truncate">${item.date}</div>
                        </div>
                        <h3 class="font-bold text-sm sm:text-base text-gray-900 dark:text-white leading-tight mb-1 truncate">${item.title}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate"><i class="ph-fill ph-map-pin text-pup-maroon dark:text-pup-gold shrink-0"></i> <span class="truncate">${item.venue}</span></p>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', html);
        });
    }

    window.openHistoryModal = function(id, e) {
        const item = historyData.find(i => String(i.id) === String(id));
        if(!item) return;

        document.getElementById('modalTitle').innerText = item.title;
        document.getElementById('modalType').innerText = item.type + " Record";
        document.getElementById('modalDateTime').innerHTML = `<i class="ph-fill ph-calendar text-pup-maroon dark:text-pup-gold text-lg"></i> ${item.date} • ${item.time}`;
        document.getElementById('modalVenue').innerHTML = `<i class="ph-fill ph-map-pin text-pup-maroon dark:text-pup-gold text-lg"></i> ${item.venue}`;
        document.getElementById('proofTime').innerText = item.details ? item.details.timestamp : (item.date + " at " + item.time);
        
        const captureImg = document.getElementById('captureImg');
        const capturePlaceholder = document.getElementById('capturePlaceholder');
        const imgUrl = item.details && item.details.capture_url ? item.details.capture_url : item.capture_img;
        if (imgUrl && !imgUrl.includes('PUPLogo')) {
            captureImg.src = imgUrl;
            captureImg.classList.remove('hidden');
            capturePlaceholder.classList.add('hidden');
        } else {
            captureImg.classList.add('hidden');
            capturePlaceholder.classList.remove('hidden');
        }
        
        const matchStatus = document.getElementById('matchStatus');
        const isVerified = item.details ? (item.details.face_matched && item.details.is_valid_location) : item.matched;
        if (isVerified) {
            matchStatus.className = "text-xs font-bold text-green-600 dark:text-green-500 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-md w-full text-center border border-green-200 dark:border-green-800/50";
            matchStatus.innerHTML = '<i class="ph-fill ph-check-circle"></i> Matched';
        } else {
            matchStatus.className = "text-xs font-bold text-red-600 dark:text-red-500 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-md w-full text-center border border-red-200 dark:border-red-800/50";
            matchStatus.innerHTML = '<i class="ph-fill ph-warning-circle"></i> Unmatched';
        }
        
        const locSig = document.getElementById('locSignature');
        const coords = item.details && item.details.coords ? item.details.coords : "N/A";
        let locText = item.details ? (item.details.location_zone || "Verified inside PUP Campus Perimeter.") : (item.location || "Verified inside PUP Campus Perimeter.");
        
        locSig.innerHTML = `<span class="text-gray-500 text-xs italic"><i class="ph ph-spinner animate-spin"></i> Fetching address...</span><br><span class="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">GPS: ${coords}</span>`;

        if (coords !== "N/A" && coords.includes(',')) {
            const [lat, lng] = coords.split(',').map(s => s.trim());
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                .then(r => r.json())
                .then(data => {
                    if (data && data.display_name) {
                        const address = data.display_name.split(',').slice(0, 3).join(',');
                        locSig.innerHTML = `<span class="text-gray-900 dark:text-white leading-snug">${address}</span><br><span class="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">GPS: ${coords}</span>`;
                    } else {
                        locSig.innerHTML = `<span class="text-gray-900 dark:text-white leading-snug">${locText}</span><br><span class="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">GPS: ${coords}</span>`;
                    }
                })
                .catch(e => {
                    locSig.innerHTML = `<span class="text-gray-900 dark:text-white leading-snug">${locText}</span><br><span class="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">GPS: ${coords}</span>`;
                });
        } else {
            locSig.innerHTML = `<span class="text-gray-900 dark:text-white leading-snug">${locText}</span><br><span class="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">GPS: ${coords}</span>`;
        }
        document.getElementById('viewAttendanceProof').classList.remove('hidden');

        const modal = document.getElementById('historyModal');
        const modalContent = document.getElementById('modalContentBlock');
        if (e && modalContent) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX || (rect.left + rect.width / 2);
            const clickY = e.clientY || (rect.top + rect.height / 2);
            modalContent.style.setProperty('--click-x', clickX + 'px');
            modalContent.style.setProperty('--click-y', clickY + 'px');
            modalContent.classList.remove('ios-pop-wrapper-close');
            modalContent.classList.add('ios-pop-wrapper');
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    }

    window.closeHistoryModal = function() {
        const modal = document.getElementById('historyModal');
        const modalContent = document.getElementById('modalContentBlock');
        if (modalContent) {
            modalContent.classList.remove('ios-pop-wrapper');
            modalContent.classList.add('ios-pop-wrapper-close');
        }
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
        }, 300);
    }

    const searchInput = document.getElementById('historySearch');
    if (searchInput) searchInput.addEventListener('input', renderHistory);
    
    // Initial render
    renderHistory();
}

window.addEventListener('load', () => {
    const checkInterval = setInterval(() => {
        if (window.VUE_APP_MOUNTED) {
            clearInterval(checkInterval);
            initHistoryLogic();
        }
    }, 100);
});
