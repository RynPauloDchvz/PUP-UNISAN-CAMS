const attendanceData = {{ attendance_data_json|safe }};
    let attendanceMap = null;

    function renderTable(data) {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<div class="p-16 text-center text-gray-400"><i class="ph-bold ph-fingerprint text-5xl mb-3 text-gray-300 dark:text-gray-700"></i><p class="font-black uppercase tracking-widest text-sm text-gray-900 dark:text-white mb-1">No Attendance Record</p><p class="text-[10px] uppercase font-bold tracking-wider">There are no matching students for this view yet.</p></div>';
            document.getElementById('studentCount').innerText = "0";
            return;
        }

        data.forEach(item => {
            const isVerified = item.status === 'Verified';
            const statusClass = isVerified ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            
            const isOrganizer = item.role === 'ORGANIZER';
            const rowStyle = isOrganizer ? 'bg-pup-maroon/5 dark:bg-pup-gold/5 border-l-4 border-pup-maroon dark:border-pup-gold' : '';
            const roleBadge = isOrganizer ? '<span class="ml-2 px-2 py-0.5 rounded-md bg-pup-maroon dark:bg-pup-gold text-white dark:text-black text-[8px] font-black uppercase tracking-widest animate-pulse">ORGANIZER</span>' : '';
            const yearDisplay = isOrganizer ? 'OFFICIAL MEMBER' : `${item.program} • YR ${item.year.replace(' Year', '')}`;
            
            const timeDisplay = item.has_timed_out ? 
                `<div class="flex flex-col leading-tight"><span class="text-green-600 dark:text-green-400 font-bold">IN: ${item.time}</span><span class="text-blue-600 dark:text-blue-400 font-bold">OUT: ${item.time_out}</span></div>` : 
                `<span class="text-green-600 dark:text-green-400 font-bold">IN: ${item.time}</span>`;

            // 🟢 LIVE BIOMETRIC FACE EVIDENCE BADGES 🟢
            const inScanHtml = item.captured_face ? 
                `<div class="flex items-center gap-1.5 bg-green-50/80 dark:bg-green-950/20 px-2.5 py-1 rounded-xl border border-green-200/80 dark:border-green-800/40 shrink-0" title="Time In Biometric Capture: ${item.time}">
                    <div class="w-8 h-8 rounded-lg overflow-hidden border border-green-500 shadow-sm shrink-0 bg-gray-100 dark:bg-black">
                        <img src="${item.captured_face}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex flex-col text-left">
                        <span class="text-[8px] font-black text-green-700 dark:text-green-400 leading-none">IN SCAN</span>
                        <span class="text-[8px] font-bold text-gray-500 leading-none mt-0.5">${item.time}</span>
                    </div>
                 </div>` : 
                `<div class="flex items-center gap-1 bg-gray-100/60 dark:bg-gray-800/40 px-2 py-1 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 opacity-60 shrink-0" title="No Time In Face Scan on Record">
                    <i class="ph-bold ph-camera-slash text-xs text-gray-400"></i>
                    <span class="text-[8px] font-bold text-gray-400">NO IN</span>
                 </div>`;

            const outScanHtml = (item.has_timed_out && item.captured_face_out) ? 
                `<div class="flex items-center gap-1.5 bg-blue-50/80 dark:bg-blue-950/20 px-2.5 py-1 rounded-xl border border-blue-200/80 dark:border-blue-800/40 shrink-0" title="Time Out Biometric Capture: ${item.time_out || ''}">
                    <div class="w-8 h-8 rounded-lg overflow-hidden border border-blue-500 shadow-sm shrink-0 bg-gray-100 dark:bg-black">
                        <img src="${item.captured_face_out}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex flex-col text-left">
                        <span class="text-[8px] font-black text-blue-700 dark:text-blue-400 leading-none">OUT SCAN</span>
                        <span class="text-[8px] font-bold text-gray-500 leading-none mt-0.5">${item.time_out || '--:--'}</span>
                    </div>
                 </div>` : 
                (item.has_timed_out ? 
                    `<div class="flex items-center gap-1 bg-gray-100/60 dark:bg-gray-800/40 px-2 py-1 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 opacity-60 shrink-0" title="Time Out Recorded without Photo">
                        <i class="ph-bold ph-camera-slash text-xs text-gray-400"></i>
                        <span class="text-[8px] font-bold text-gray-400">NO OUT</span>
                     </div>` : 
                    `<div class="flex items-center gap-1 bg-amber-50/50 dark:bg-amber-950/10 px-2 py-1.5 rounded-xl border border-amber-200/50 dark:border-amber-800/30 shrink-0" title="Student has not timed out yet">
                        <i class="ph-bold ph-clock-countdown text-amber-500 text-xs"></i>
                        <span class="text-[8px] font-black text-amber-600 dark:text-amber-400">PENDING</span>
                     </div>`);

            tbody.insertAdjacentHTML('beforeend', `
                <div class="flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-4 p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-[#111]/50 transition-colors cursor-pointer group ${rowStyle}" onclick="openProofModal(${item.id}, event)">
                    <!-- Identity: Mobile & Desktop -->
                    <div class="flex items-center gap-3 lg:col-span-3 lg:pl-4 min-w-0">
                        <div class="w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 ${isOrganizer ? 'border-pup-maroon dark:border-pup-gold shadow-md' : 'border-gray-100 dark:border-gray-800'}">
                            <img src="${item.img}" class="w-full h-full object-cover">
                        </div>
                        <div class="min-w-0">
                            <h4 class="font-bold text-gray-900 dark:text-white leading-tight truncate text-sm sm:text-base flex items-center mb-0.5">
                                ${item.name}
                                ${roleBadge}
                            </h4>
                            <p class="text-[10px] text-gray-500 font-black uppercase tracking-widest truncate">${item.number}</p>
                        </div>
                    </div>

                    <!-- DESKTOP ONLY COLUMNS -->
                    <div class="hidden lg:block lg:col-span-2 text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tight">${yearDisplay}</div>
                    <div class="hidden lg:block lg:col-span-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">${timeDisplay}</div>
                    
                    <!-- 🟢 FACE SCAN EVIDENCE IN TABLE 🟢 -->
                    <div class="hidden lg:flex lg:col-span-3 items-center justify-center gap-2">
                        ${inScanHtml}
                        ${outScanHtml}
                    </div>

                    <div class="hidden lg:flex lg:col-span-2 lg:pr-4 justify-end items-center gap-2">
                        <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-current opacity-80 ${statusClass}">${item.status}</span>
                        <i class="ph-bold ph-eye text-base text-gray-400 group-hover:text-pup-maroon dark:group-hover:text-pup-gold transition-colors"></i>
                    </div>

                    <!-- MOBILE ONLY COLUMNS (Right Side & Evidence) -->
                    <div class="flex items-center justify-between gap-2 lg:hidden pt-2 border-t border-gray-100 dark:border-gray-800/60 mt-1">
                        <div class="flex items-center gap-2 overflow-x-auto">
                            ${inScanHtml}
                            ${outScanHtml}
                        </div>
                        <span class="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border border-current ${statusClass}">${item.status}</span>
                    </div>
                </div>
            `);
        });
        document.getElementById('studentCount').innerText = data.length;
    }

    function searchStudent() {
        const query = document.getElementById('searchInput').value.toLowerCase();
        const typeFilter = document.getElementById('typeFilter').value;
        const yearFilter = document.getElementById('yearFilter').value;

        const filtered = attendanceData.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(query) || 
                                 item.number.toLowerCase().includes(query) || 
                                 item.event.toLowerCase().includes(query);
            
            let matchesType = true;
            if (typeFilter === 'TIME_IN') matchesType = true; // Everyone has time in
            if (typeFilter === 'TIME_OUT') matchesType = item.has_timed_out;

            let matchesYear = true;
            if (yearFilter !== 'ALL') {
                if (item.role === 'ORGANIZER') {
                    matchesYear = false; // If filtering by specific year, hide organizers unless they match? (Usually organizers don't have year in this view)
                } else {
                    matchesYear = item.year === yearFilter;
                }
            }

            return matchesSearch && matchesType && matchesYear;
        });
        renderTable(filtered);
    }

    function openProofModal(id, e) {
        const item = attendanceData.find(i => i.id === id);
        if (!item) return;

        document.getElementById('modalEventTitle').innerText = item.event;
        document.getElementById('modalDateInfo').innerText = item.date;
        document.getElementById('modalVenueInfo').innerText = item.venue;
        document.getElementById('modalName').innerText = item.name;
        document.getElementById('modalId').innerText = item.number;
        const profileImgElem = document.getElementById('modalProfileImg');
        if (profileImgElem) profileImgElem.src = item.img;
        
        // 🟢 3-WAY BIOMETRIC AUDIT MATRIX POPULATION 🟢
        const auditBaselineImg = document.getElementById('auditBaselineImg');
        if (auditBaselineImg) auditBaselineImg.src = item.img;

        const auditInImg = document.getElementById('auditInImg');
        const auditInFallback = document.getElementById('auditInFallback');
        const auditInTime = document.getElementById('auditInTime');
        if (item.captured_face) {
            auditInImg.src = item.captured_face;
            auditInImg.classList.remove('hidden');
            auditInFallback.classList.add('hidden');
            auditInTime.innerText = item.time;
        } else {
            auditInImg.classList.add('hidden');
            auditInFallback.classList.remove('hidden');
            auditInTime.innerText = 'Missed In';
        }

        const auditOutImg = document.getElementById('auditOutImg');
        const auditOutFallback = document.getElementById('auditOutFallback');
        const auditOutTime = document.getElementById('auditOutTime');
        if (item.captured_face_out) {
            auditOutImg.src = item.captured_face_out;
            auditOutImg.classList.remove('hidden');
            auditOutFallback.classList.add('hidden');
            auditOutTime.innerText = item.time_out || '--:--';
        } else {
            auditOutImg.classList.add('hidden');
            auditOutFallback.classList.remove('hidden');
            auditOutTime.innerText = item.has_timed_out ? 'No Photo' : 'Pending Out';
        }

        // Face Scan Image Logic (Tabs Section)
        const faceImg = document.getElementById('proofFaceImg');
        const faceIcon = document.getElementById('proofFaceIcon');
        if (item.captured_face) {
            faceImg.src = item.captured_face;
            faceImg.classList.remove('hidden');
            faceIcon.classList.add('hidden');
        } else {
            faceImg.classList.add('hidden');
            faceIcon.classList.remove('hidden');
        }

        const faceImgOut = document.getElementById('proofFaceImgOut');
        const faceIconOut = document.getElementById('proofFaceIconOut');
        if (item.captured_face_out) {
            faceImgOut.src = item.captured_face_out;
            faceImgOut.classList.remove('hidden');
            faceIconOut.classList.add('hidden');
        } else {
            faceImgOut.classList.add('hidden');
            faceIconOut.classList.remove('hidden');
        }

        // Time In / Time Out
        document.getElementById('modalTimeIn').innerText = item.time;
        document.getElementById('modalTimeOut').innerText = item.time_out ? item.time_out : '--:--';
        
        const badge = document.getElementById('modalStatusBadge');
        badge.innerText = item.status;
        badge.className = item.status === 'Verified' ? 'px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-green-50 text-green-600 border border-green-200' : 'px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-200';

        // Geolocation Logic Time In
        const geoContext = document.getElementById('modalGeoContext').querySelector('span');
        geoContext.innerHTML = `<span class="italic"><i class="ph ph-spinner animate-spin"></i> Locating exact address via satellite...</span><br><span class="text-gray-900 dark:text-white">${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}</span>`;

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${item.lat}&lon=${item.lng}`)
            .then(r => r.json())
            .then(data => {
                let address = "Unknown Address";
                if (data && data.display_name) {
                    address = data.display_name.split(',').slice(0, 4).join(',');
                }
                const prefix = item.is_global ? "Global Event" : "Geofence Event";
                geoContext.innerHTML = `${prefix} - Scanned from precise coordinates:<br><span class="text-gray-900 dark:text-white font-black">${address}</span><br><span class="text-gray-400 text-[8px] tracking-tighter">GPS: ${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}</span>`;
            })
            .catch(err => {
                geoContext.innerHTML = `Event - Verified synchronization.<br><span class="text-gray-900 dark:text-white">${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}</span>`;
            });

        // Geolocation Logic Time Out
        const mapOutContainer = document.getElementById('mapOutContainer');
        if (item.has_timed_out && item.lat_out !== null && item.lng_out !== null) {
            mapOutContainer.classList.remove('hidden');
            const geoContextOut = document.getElementById('modalGeoContextOut').querySelector('span');
            geoContextOut.innerHTML = `<span class="italic"><i class="ph ph-spinner animate-spin"></i> Locating exact address via satellite...</span><br><span class="text-gray-900 dark:text-white">${item.lat_out.toFixed(5)}, ${item.lng_out.toFixed(5)}</span>`;

            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${item.lat_out}&lon=${item.lng_out}`)
                .then(r => r.json())
                .then(data => {
                    let address = "Unknown Address";
                    if (data && data.display_name) {
                        address = data.display_name.split(',').slice(0, 4).join(',');
                    }
                    const prefix = item.is_global ? "Global Event" : "Geofence Event";
                    geoContextOut.innerHTML = `${prefix} - Scanned from precise coordinates:<br><span class="text-gray-900 dark:text-white font-black">${address}</span><br><span class="text-gray-400 text-[8px] tracking-tighter">GPS: ${item.lat_out.toFixed(5)}, ${item.lng_out.toFixed(5)}</span>`;
                })
                .catch(err => {
                    geoContextOut.innerHTML = `Event - Verified synchronization.<br><span class="text-gray-900 dark:text-white">${item.lat_out.toFixed(5)}, ${item.lng_out.toFixed(5)}</span>`;
                });
        }
        
        // Smart Tab UI logic: Switch to OUT if only Time Out photo exists
        if (!item.captured_face && item.captured_face_out) {
            switchTab('OUT');
        } else {
            switchTab('IN');
        }
        
        // Tab UI logic (Disable Time Out if no time out recorded)
        const tabTimeOut = document.getElementById('tabTimeOut');
        if (item.has_timed_out) {
            tabTimeOut.disabled = false;
            tabTimeOut.classList.remove('cursor-not-allowed', 'opacity-50');
            tabTimeOut.classList.add('cursor-pointer');
        } else {
            tabTimeOut.disabled = true;
            tabTimeOut.classList.add('cursor-not-allowed', 'opacity-50');
            tabTimeOut.classList.remove('cursor-pointer');
        }

        const modal = document.getElementById('proofModal');
        const box = document.getElementById('proofModalBox');
        if (e && box) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX || (rect.left + rect.width / 2);
            const clickY = e.clientY || (rect.top + rect.height / 2);
            box.style.setProperty('--click-x', clickX + 'px');
            box.style.setProperty('--click-y', clickY + 'px');
            box.classList.remove('ios-pop-wrapper-close');
            box.classList.add('ios-pop-wrapper');
        }

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            if (attendanceMap) attendanceMap.remove();
            attendanceMap = L.map('realMap', {zoomControl: false}).setView([item.lat, item.lng], 17);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(attendanceMap);
            L.circle([item.lat, item.lng], {radius: 15, color: '#800000', fillColor: '#800000', fillOpacity: 0.5}).addTo(attendanceMap);
            L.marker([item.lat, item.lng]).addTo(attendanceMap);
            attendanceMap.invalidateSize();

            if (item.has_timed_out && item.lat_out !== null && item.lng_out !== null) {
                if (window.attendanceMapOut) window.attendanceMapOut.remove();
                window.attendanceMapOut = L.map('realMapOut', {zoomControl: false}).setView([item.lat_out, item.lng_out], 17);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.attendanceMapOut);
                L.circle([item.lat_out, item.lng_out], {radius: 15, color: '#000080', fillColor: '#000080', fillOpacity: 0.5}).addTo(window.attendanceMapOut);
                L.marker([item.lat_out, item.lng_out]).addTo(window.attendanceMapOut);
                window.attendanceMapOut.invalidateSize();
            }
        }, 300);
    }

    function switchTab(tab) {
        const mapInContainer = document.getElementById('mapInContainer');
        const mapOutContainer = document.getElementById('mapOutContainer');
        const tabIndicator = document.getElementById('tabIndicator');
        const tabTimeIn = document.getElementById('tabTimeIn');
        const tabTimeOut = document.getElementById('tabTimeOut');

        if (tab === 'IN') {
            mapInContainer.classList.remove('hidden');
            mapInContainer.classList.add('flex');
            mapOutContainer.classList.add('hidden');
            mapOutContainer.classList.remove('flex');
            
            tabIndicator.classList.remove('translate-x-full');
            tabIndicator.classList.add('translate-x-0');
            
            tabTimeIn.classList.add('text-gray-900', 'dark:text-white');
            tabTimeIn.classList.remove('text-gray-400', 'dark:text-gray-500');
            
            if(!tabTimeOut.disabled) {
                tabTimeOut.classList.remove('text-gray-900', 'dark:text-white');
                tabTimeOut.classList.add('text-gray-400', 'dark:text-gray-500');
            }
            
            // Invalidate map size so it renders properly if it was hidden
            if (attendanceMap) {
                setTimeout(() => { attendanceMap.invalidateSize(); }, 50);
            }
        } else {
            mapOutContainer.classList.remove('hidden');
            mapOutContainer.classList.add('flex');
            mapInContainer.classList.add('hidden');
            mapInContainer.classList.remove('flex');
            
            tabIndicator.classList.remove('translate-x-0');
            tabIndicator.classList.add('translate-x-full');
            
            tabTimeOut.classList.add('text-gray-900', 'dark:text-white');
            tabTimeOut.classList.remove('text-gray-400', 'dark:text-gray-500');
            
            tabTimeIn.classList.remove('text-gray-900', 'dark:text-white');
            tabTimeIn.classList.add('text-gray-400', 'dark:text-gray-500');
            
            // Invalidate map size so it renders properly if it was hidden
            if (window.attendanceMapOut) {
                setTimeout(() => { window.attendanceMapOut.invalidateSize(); }, 50);
            }
        }
    }

    function closeProofModal() {
        const modal = document.getElementById('proofModal');
        const box = document.getElementById('proofModalBox');
        if (box) {
            box.classList.remove('ios-pop-wrapper');
            box.classList.add('ios-pop-wrapper-close');
        }
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }

    function toggleDropdown(optionsId, iconId) {
        // Close other dropdown if open
        if (optionsId === 'typeFilterOptions') {
            document.getElementById('yearFilterOptions').classList.remove('open');
            document.getElementById('yearFilterIcon').classList.remove('rotate-180');
        } else {
            document.getElementById('typeFilterOptions').classList.remove('open');
            document.getElementById('typeFilterIcon').classList.remove('rotate-180');
        }
        
        const options = document.getElementById(optionsId);
        const icon = document.getElementById(iconId);
        if (options.classList.contains('open')) {
            options.classList.remove('open');
            icon.classList.remove('rotate-180');
        } else {
            options.classList.add('open');
            icon.classList.add('rotate-180');
        }
    }

    function selectTypeFilter(val, label) {
        document.getElementById('typeFilter').value = val;
        document.getElementById('typeFilterLabel').innerText = label;
        toggleDropdown('typeFilterOptions', 'typeFilterIcon');
        searchStudent();
    }

    function selectYearFilter(val, label) {
        document.getElementById('yearFilter').value = val;
        document.getElementById('yearFilterLabel').innerText = label;
        toggleDropdown('yearFilterOptions', 'yearFilterIcon');
        searchStudent();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const orgAcr = document.getElementById('currentOrgAcronym').value;
        if (orgAcr === 'ITS') {
            const year4 = document.getElementById('year4OptionItem');
            if (year4) year4.remove();
        }
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#typeDropdownContainer')) {
                document.getElementById('typeFilterOptions').classList.remove('open');
                document.getElementById('typeFilterIcon').classList.remove('rotate-180');
            }
            if (!e.target.closest('#yearDropdownContainer')) {
                document.getElementById('yearFilterOptions').classList.remove('open');
                document.getElementById('yearFilterIcon').classList.remove('rotate-180');
            }
        });
        
        renderTable(attendanceData);
    });
