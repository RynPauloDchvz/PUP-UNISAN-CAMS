let allDocuments = [];
    let map = null;

    // 🟢 WAIT FOR VUE & DOM TO BE FULLY READY 🟢
    window.addEventListener('load', () => {
        const dataEl = document.getElementById('django-docs-data');
        if (!dataEl) return;
        const rawData = dataEl.value;
        try {
            allDocuments = JSON.parse(rawData);
            renderTrackingDocs(allDocuments);
        } catch (e) {
            console.error("Error parsing documents data:", e);
        }
    });

    // Custom Dropdown Logic
    function toggleStatusFilter() {
        const menuWrapper = document.getElementById('statusFilterMenuWrapper');
        const icon = document.getElementById('statusFilterIcon');
        if (!menuWrapper) return;
        
        const isOpen = !menuWrapper.classList.contains('grid-rows-[0fr]');
        if (isOpen) {
            menuWrapper.classList.remove('grid-rows-[1fr]', 'opacity-100');
            menuWrapper.classList.add('grid-rows-[0fr]', 'opacity-0');
            if(icon) icon.classList.remove('rotate-180');
        } else {
            menuWrapper.classList.remove('grid-rows-[0fr]', 'opacity-0');
            menuWrapper.classList.add('grid-rows-[1fr]', 'opacity-100');
            if(icon) icon.classList.add('rotate-180');
        }
    }

    function selectStatusFilter(value, label) {
        document.getElementById('trackStatusFilter').value = value;
        document.getElementById('statusFilterLabel').innerText = label;
        toggleStatusFilter();
        filterTrackingDocs();
    }

    // Close custom dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const btn = document.getElementById('statusFilterBtn');
        const menu = document.getElementById('statusFilterMenuWrapper');
        if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.remove('grid-rows-[1fr]', 'opacity-100');
            menu.classList.add('grid-rows-[0fr]', 'opacity-0');
            const icon = document.getElementById('statusFilterIcon');
            if(icon) icon.classList.remove('rotate-180');
        }
    });

    window.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('statusFilterBtn');
        if(btn) btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStatusFilter();
        });
    });

    function renderTrackingDocs(docs) {
        const grid = document.getElementById('trackingGrid');
        const noResults = document.getElementById('noResults');
        if (!grid) return;
        grid.innerHTML = '';

        if (!docs || docs.length === 0) {
            noResults.classList.remove('hidden');
            return;
        } else {
            noResults.classList.add('hidden');
        }

        docs.forEach(doc => {
            const statusColor = getStatusColor(doc.status);
            const card = document.createElement('div');
            card.className = 'doc-card bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer relative overflow-hidden group';
            card.setAttribute('data-id', doc.id);
            card.onclick = (e) => {
                const rect = card.getBoundingClientRect();
                const clickX = e.clientX || (rect.left + rect.width / 2);
                const clickY = e.clientY || (rect.top + rect.height / 2);
                document.documentElement.style.setProperty('--click-x', `${clickX}px`);
                document.documentElement.style.setProperty('--click-y', `${clickY}px`);
                openTrackingModal(doc);
            };
            
            card.innerHTML = `
                <div class="flex items-center justify-between mb-4 relative z-10">
                    <span class="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 px-3 py-1 bg-gray-100 dark:bg-[#111] rounded-full border border-gray-200 dark:border-gray-800 group-hover:bg-white dark:group-hover:bg-gray-800 transition-colors">${doc.orgName}</span>
                    <span class="text-[0.65rem] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${statusColor.border} ${statusColor.bg} ${statusColor.text}">${doc.status}</span>
                </div>
                <h3 class="font-black text-gray-900 dark:text-white text-lg leading-tight mb-2 line-clamp-2 uppercase tracking-tight group-hover:text-pup-maroon dark:group-hover:text-pup-gold transition-colors">${doc.eventName}</h3>
                <p class="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-5"><i class="ph-fill ph-file-text text-pup-maroon dark:text-pup-gold"></i> Activity Proposal Document</p>
                
                <div class="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div class="flex flex-col">
                        <span class="text-[0.6rem] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Physical Location</span>
                        <span class="text-[0.7rem] font-bold text-gray-700 dark:text-gray-300 truncate max-w-[160px] flex items-center gap-1">
                            <i class="ph-bold ph-map-pin text-pup-maroon dark:text-pup-gold"></i> ${doc.currentLoc}
                        </span>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center text-gray-300 dark:text-gray-700 group-hover:bg-pup-maroon/10 dark:group-hover:bg-pup-gold/10 group-hover:text-pup-maroon dark:group-hover:text-pup-gold transition-all">
                        <i class="ph-bold ph-arrow-right"></i>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    function getStatusColor(status) {
        switch(status) {
            case 'Approved': return { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' };
            case 'Rejected': return { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' };
            case 'Admin Approved':
            case 'Adviser Approved': return { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' };
            case 'Permit Verification': return { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' };
            case 'Final Admin Review': return { bg: 'bg-indigo-100 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' };
            default: return { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' };
        }
    }

    function filterTrackingDocs() {
        const searchTerm = document.getElementById('trackSearch').value.toLowerCase();
        const statusFilter = document.getElementById('trackStatusFilter').value;

        const filtered = allDocuments.filter(doc => {
            const matchesSearch = doc.eventName.toLowerCase().includes(searchTerm);
            const matchesStatus = statusFilter === 'All' || 
                                 (statusFilter === 'Pending' && !['Approved', 'Rejected'].includes(doc.status)) ||
                                 doc.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        renderTrackingDocs(filtered);
    }

    function openTrackingModal(doc) {
        document.getElementById('modalEventTitle').innerText = doc.eventName;
        document.getElementById('modalOrgName').innerText = doc.orgName;
        document.getElementById('modalCurrentLoc').innerText = doc.currentLoc;
        
        const statusBadge = document.getElementById('modalStatusBadge');
        const color = getStatusColor(doc.status);
        statusBadge.innerText = doc.status;
        statusBadge.className = `font-bold text-[0.65rem] px-3 py-1 rounded-full uppercase tracking-widest border ${color.bg} ${color.text} ${color.border}`;

        // Rejection Reason Banner
        const rejectBox = document.getElementById('modalRejectBox');
        const rejectReason = document.getElementById('modalRejectReason');
        if (rejectBox && rejectReason) {
            if (doc.status === 'Rejected' && doc.rejectReason) {
                rejectReason.innerText = doc.rejectReason;
                rejectBox.classList.remove('hidden');
            } else {
                rejectBox.classList.add('hidden');
            }
        }

        renderTimeline(doc);
        
        const modalContent = document.getElementById('trackingModalContent');
        modalContent.classList.remove('ios-pop-wrapper-close');
        document.getElementById('trackingModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        setTimeout(() => initTrackingMap(doc.coords, doc.currentLoc, doc), 150);
    }

    function closeTrackingModal() {
        const modalContent = document.getElementById('trackingModalContent');
        modalContent.classList.add('ios-pop-wrapper-close');
        
        setTimeout(() => {
            document.getElementById('trackingModal').classList.add('hidden');
            modalContent.classList.remove('ios-pop-wrapper-close');
            document.body.style.overflow = '';
            if (map) {
                map.remove();
                map = null;
            }
        }, 350); // wait for animation
    }

    function renderTimeline(doc) {
        const container = document.getElementById('timelineContainer');
        if (!container) return;
        container.innerHTML = '';
        
        const steps = [
            { name: "Pending Adviser", desc: "Initial Review (Faculty proposal check)" },
            { name: "Adviser Approved", desc: "Printed & F2F Routing / Gathering Signatures" },
            { name: "Adviser Finalize Event Requirements", desc: "Verification of uploaded requirements" },
            { name: "Final Admin Review", desc: "Admin verification of uploaded signed documents" },
            { name: "Approved", desc: "Published Event by Admin (Live in Portal)" }
        ];

        steps.forEach((step, index) => {
            const stepNum = index + 1;
            let statusClass = '';
            let iconClass = 'ph-bold ph-circle';

            if (doc.progress > stepNum) {
                statusClass = 'completed';
                iconClass = 'ph-bold ph-check-circle';
            } else if (doc.progress === stepNum) {
                if (doc.status === 'Rejected') {
                    statusClass = 'rejected';
                    iconClass = 'ph-bold ph-x-circle';
                } else if (doc.status === 'Approved') {
                    statusClass = 'completed';
                    iconClass = 'ph-bold ph-check-circle';
                } else {
                    statusClass = 'current';
                    iconClass = 'ph-bold ph-clock';
                }
            }

            const stepEl = document.createElement('div');
            stepEl.className = `timeline-step flex items-start gap-4 pb-10 relative last:pb-0 ${statusClass}`;
            stepEl.innerHTML = `
                <div class="step-icon relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-[#151515] border-2 transition-all duration-300">
                    <i class="${iconClass} text-xs"></i>
                </div>
                <div class="flex flex-col -mt-0.5">
                    <span class="text-xs font-bold uppercase tracking-tight text-gray-900 dark:text-white">${step.name}</span>
                    <span class="text-[0.65rem] text-gray-500 dark:text-gray-400 font-medium">${getStatusText(statusClass, doc.status, step.desc)}</span>
                </div>
            `;
            container.appendChild(stepEl);
        });
    }

    function getStatusText(statusClass, status, defaultDesc) {
        if (statusClass === 'completed') return 'Completed and Verified';
        if (statusClass === 'current') return defaultDesc ? `${defaultDesc} — In Progress` : 'In Progress / Action Needed';
        if (statusClass === 'rejected') return 'Rejected / Returned to Org';
        return defaultDesc || 'Pending Previous Steps';
    }

    function initTrackingMap(coords, locName, doc) {
        if (typeof L === 'undefined') {
            console.error('Leaflet is not loaded');
            return;
        }
        if (map) {
            map.remove();
            map = null;
        }
        
        const defaultCoords = [13.84575, 121.96915];
        let targetCoords = (coords && Array.isArray(coords) && coords.length === 2 && !isNaN(coords[0])) ? coords : defaultCoords;

        map = L.map('docMap', {
            zoomControl: true,
            attributionControl: false,
            scrollWheelZoom: false
        }).setView(targetCoords, 18);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #800000; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(128,0,0,0.6); animation: pulse-red 2s infinite;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        // Pulse animation via CSS injection if not present
        if (!document.getElementById('map-styles')) {
            const style = document.createElement('style');
            style.id = 'map-styles';
            style.innerHTML = `
                @keyframes pulse-red {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(128, 0, 0, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(128, 0, 0, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(128, 0, 0, 0); }
                }
            `;
            document.head.appendChild(style);
        }

        const popupHtml = `
            <div class="text-center p-1.5 font-sans min-w-[170px]">
                <div class="font-black text-pup-maroon dark:text-pup-gold text-[11px] uppercase tracking-tight mb-1" id="trackBubbleLocTitle">
                    ${locName || 'Physical Office Location'}
                </div>
                <div class="text-[9px] text-gray-500 font-bold leading-tight border-t border-gray-100 dark:border-gray-800 pt-1 mt-1 flex items-center justify-center gap-1" id="trackBubbleSubLoc">
                    <i class="ph-bold ph-map-pin text-pup-maroon dark:text-pup-gold"></i> Locating exact address...
                </div>
            </div>
        `;

        const marker = L.marker(targetCoords, { icon: customIcon }).addTo(map)
            .bindPopup(popupHtml, { closeButton: false, className: 'custom-popup' })
            .openPopup();

        // 🟢 REAL-TIME ACCURATE ADDRESS RESOLUTION (Reverse Geocoding via Nominatim) 🟢
        const updateResolvedAddress = (lat, lon) => {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.display_name) {
                        const parts = data.display_name.split(',');
                        const cleanAddr = parts.slice(0, 3).join(', ').trim();
                        const subEl = document.getElementById('trackBubbleSubLoc');
                        if (subEl) {
                            subEl.innerHTML = `<i class="ph-bold ph-map-pin text-pup-maroon dark:text-pup-gold"></i> ${cleanAddr}`;
                        }
                        const modalCurrentLoc = document.getElementById('modalCurrentLoc');
                        if (modalCurrentLoc) {
                            modalCurrentLoc.innerHTML = `<span>${locName}</span> <span class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1"><i class="ph-bold ph-map-pin text-pup-maroon dark:text-pup-gold"></i> ${cleanAddr}</span>`;
                        }
                    }
                })
                .catch(() => {
                    const subEl = document.getElementById('trackBubbleSubLoc');
                    if (subEl) {
                        subEl.innerHTML = `<i class="ph-bold ph-map-pin text-pup-maroon dark:text-pup-gold"></i> Barangay Kalilayan Ibaba, Unisan`;
                    }
                });
        };

        // Resolve initial coordinates address
        updateResolvedAddress(targetCoords[0], targetCoords[1]);

        // If the document is currently in the custody of the Student Organization (e.g. gathering signatures / returned),
        // use live GPS location to pinpoint exact real-world spot
        const isWithOrg = doc && (doc.status === 'Admin Approved' || doc.status === 'Adviser Approved' || doc.status === 'Rejected');
        if (isWithOrg && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const liveCoords = [pos.coords.latitude, pos.coords.longitude];
                if (map) {
                    map.setView(liveCoords, 18);
                    marker.setLatLng(liveCoords);
                    updateResolvedAddress(liveCoords[0], liveCoords[1]);
                }
            }, () => {}, { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 });
        }
            
        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 250);
    }
