document.addEventListener('DOMContentLoaded', () => {
    
    // Inject Vault Shared Content to appropriate container based on screen size
    function adjustVaultLocation() {
        const vaultContent = document.getElementById('vault-shared-content');
        if (!vaultContent) return;
        if (window.innerWidth < 1024) {
            const mobileContainer = document.getElementById('mobile-vault-container');
            if(mobileContainer && !mobileContainer.contains(vaultContent)) mobileContainer.appendChild(vaultContent);
        } else {
            const desktopContainer = document.getElementById('desktop-vault-container');
            if(desktopContainer && !desktopContainer.contains(vaultContent)) desktopContainer.appendChild(vaultContent);
        }
    }
    adjustVaultLocation();
    window.addEventListener('resize', adjustVaultLocation);

    // 1. DATA INITIALIZATION
    let pendingEvents = [];
    let vaultRecords = [];
    try {
        const pd = document.getElementById('pendingData').textContent;
        const vd = document.getElementById('vaultData').textContent;
        if (pd.trim() !== '') pendingEvents = JSON.parse(pd);
        if (vd.trim() !== '') {
            vaultRecords = JSON.parse(vd);
            vaultRecords.sort((a,b) => b.id - a.id);
        }
    } catch(e) { console.error("JSON Error:", e); }

    // 2. DOM ELEMENTS
    const pendingList = document.getElementById('pending-events-list');
    const vaultList = document.getElementById('vault-events-list');
    const pendingEmpty = document.getElementById('pending-empty-state');
    const vaultEmpty = document.getElementById('vault-empty-state');
    
    const searchPending = document.getElementById('search-pending');
    const searchVault = document.getElementById('search-vault');
    
    const uploaderModal = document.getElementById('upload-modal');
    const slotsContainer = document.getElementById('upload-slots-container');
    const submitBtn = document.getElementById('submit-upload-btn');
    const toast = document.getElementById('success-toast');
    
    const previewModal = document.getElementById('image-preview-modal');
    const previewImg = document.getElementById('preview-image-element');
    const closePreviewBtn = document.getElementById('close-preview-btn');

    const viewModal = document.getElementById('viewModal');
    const viewContentMain = document.getElementById('view-content-main');
    const viewContentExcuse = document.getElementById('view-content-excuse');
    const viewTabMain = document.getElementById('view-tab-main');
    const viewTabExcuse = document.getElementById('view-tab-excuse');
    const viewTabMainLabel = document.getElementById('view-tab-main-label');

    const ORG_DETAILS = {
        "ITO": { program: "Bachelor of Science in Information Technology (BSIT) Program", fullname: "Information Technology Organization" },
        "YEO": { program: "Bachelor of Science in Entrepreneurship (BSEntrep) Program", fullname: "Young Entrepreneurship Organization" },
        "ITS": { program: "Diploma in Information Technology (DIT) Program", fullname: "Institute of Technology Society" },
        "FTO": { program: "Bachelor of Elementary and Secondary Education Program", fullname: "Future Teachers Organization" },
        "PAS": { program: "Bachelor of Public Administration (BPA) Program", fullname: "Public Administration Society" },
        "CAO": { program: "Student Body", fullname: "Culture and Arts Organization" },
        "PRIDEVerse": { program: "Student Body", fullname: "BahaghariU Organization" },
        "BahaghariU": { program: "Student Body", fullname: "BahaghariU Organization" },
        "PRIDE": { program: "Student Body", fullname: "BahaghariU Organization" },
        "SSC": { program: "Student Body", fullname: "Supreme Student Council" },
        "ROTC": { program: "National Service Training Program", fullname: "Reserve Officers' Training Corps" },
        "NEWSETTE": { program: "Student Body", fullname: "The Newsette Publication" },
        "PUSO": { program: "Student Body", fullname: "PUP Unisan Sports Organization" }
    };

    function getOrgFullName(acronym) {
        const details = ORG_DETAILS[acronym] || ORG_DETAILS["SSC"];
        return `The ${details.program}, through the ${details.fullname} (${acronym})`;
    }

    function formatTime(timeInput) {
        if(!timeInput) return "";
        if(timeInput.includes('AM') || timeInput.includes('PM')) return timeInput;
        let [hours, minutes] = timeInput.split(':');
        hours = parseInt(hours, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
    }

    // Mobile Vault Toggle Logic
    window.toggleVaultMobile = () => {
        const wrapper = document.getElementById('vaultMobileWrapper');
        const icon = document.getElementById('vaultMobileIcon');
        const isOpen = !wrapper.classList.contains('grid-rows-[0fr]');
        
        if (isOpen) {
            wrapper.classList.remove('grid-rows-[1fr]', 'opacity-100');
            wrapper.classList.add('grid-rows-[0fr]', 'opacity-0');
            if (icon) icon.classList.remove('rotate-180');
        } else {
            wrapper.classList.remove('grid-rows-[0fr]', 'opacity-0');
            wrapper.classList.add('grid-rows-[1fr]', 'opacity-100');
            if (icon) icon.classList.add('rotate-180');
        }
    };

    // 3. RENDER PENDING EVENTS
    function renderPending() {
        if (pendingEvents.length === 0) {
            pendingList.innerHTML = `
                <div class="text-center py-16 w-full bg-white dark:bg-black rounded-3xl border border-gray-200 border-dashed dark:border-gray-800">
                    <i class="ph-fill ph-check-circle text-5xl text-gray-300 dark:text-gray-600 mb-3 block"></i>
                    <h3 class="font-bold text-xl text-gray-600 dark:text-gray-300">You're All Caught Up</h3>
                    <p class="text-gray-500 text-sm mt-1">All required documents have been uploaded successfully.</p>
                </div>
            `;
            return;
        }
        pendingList.innerHTML = pendingEvents.map(e => `
            <div class="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:border-[#800000] dark:hover:border-[#D4AF37] transition group" data-event-name="${e.eventName.toLowerCase()}">
                <div class="flex justify-between items-start mb-4">
                    <span class="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-amber-200 dark:border-amber-800/50">PENDING DOCUMENTS</span>
                    <span class="text-[10px] font-bold text-gray-300">#${e.id}</span>
                </div>
                <h3 class="text-lg font-black text-gray-900 dark:text-gray-100 uppercase leading-tight line-clamp-2 mb-1 group-hover:text-[#800000] dark:group-hover:text-[#D4AF37] transition-colors">${e.eventName}</h3>
                <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 italic">${e.orgName}</p>
                <button class="w-full bg-[#800000] hover:bg-red-900 text-white text-[10px] font-black tracking-widest uppercase py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95" 
                    onclick="showModal(${e.id}, '${e.eventName.replace(/'/g, "\\'")}', '${e.mode}')">
                    <i class="ph-bold ph-upload-simple"></i> UPLOAD SIGNED DOCUMENTS
                </button>
            </div>
        `).join('');
    }

    // 4. RENDER DOCUMENT VAULT
    function renderVault() {
        if (vaultRecords.length === 0) {
            vaultList.innerHTML = `
                <div class="text-center py-16 w-full bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-200 border-dashed dark:border-gray-800">
                    <i class="ph-fill ph-archive-box text-5xl text-gray-300 dark:text-gray-600 mb-3 block"></i>
                    <h3 class="font-bold text-xl text-gray-600 dark:text-gray-300">Vault is Empty</h3>
                    <p class="text-gray-500 text-sm mt-1">You haven't uploaded any event documents yet.</p>
                </div>
            `;
            return;
        }
        vaultList.innerHTML = vaultRecords.map(r => `
            <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 rounded-2xl shadow-sm hover:border-[#D4AF37] transition" data-vault-name="${(r.eventName || r.title || '').toLowerCase()}" data-event-id="${r.id}">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2 overflow-hidden mb-4">
                    <div class="w-full sm:w-auto overflow-hidden">
                        <h3 class="truncate font-black text-lg text-gray-900 dark:text-gray-100 uppercase min-w-0 pr-2">${r.eventName || r.title}</h3>
                    </div>
                    <div class="flex items-center justify-between gap-4 shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
                        <button class="whitespace-nowrap border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors flex-grow sm:flex-grow-0 justify-center" 
                            onclick="openPreviewModal(${r.id})">
                            <i class="ph-bold ph-eye text-sm"></i> Preview Letter
                        </button>
                        <button class="download-records-btn shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-[#800000] text-white hover:bg-red-900 dark:bg-[#D4AF37] dark:text-black dark:hover:bg-yellow-600 transition-colors shadow-md border-0" 
                            onclick="handleVaultDownload(this, ${r.id})" title="Download Records">
                            <i class="ph-bold ph-download-simple text-base"></i>
                        </button>
                    </div>
                </div>
                <p class="text-green-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-2 mb-6 uppercase tracking-widest">
                    <i class="ph-bold ph-check-circle"></i> Uploaded: ${r.date}
                    <span class="ml-auto border border-red-500 dark:border-red-400 text-red-700 dark:text-red-400 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest bg-red-50 dark:bg-red-950/20 whitespace-nowrap">${r.docs.length} FILES</span>
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 vault-files-grid">
                    ${r.docs.map(doc => `
                        <div class="group/doc cell-container" data-img-src="${doc.preview}">
                            <div class="relative aspect-square bg-gray-50 dark:bg-black rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 transition shadow-sm">
                                <img src="${doc.preview}" class="w-full h-full object-cover opacity-60 group-hover/doc:opacity-100 transition-opacity" />
                                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover/doc:opacity-100 bg-black/40 transition-opacity">
                                    <button class="view-image-btn bg-white dark:bg-gray-800 text-black dark:text-white p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition" onclick="openPreview('${doc.preview}')">
                                        <i class="ph-bold ph-eye text-lg"></i>
                                    </button>
                                </div>
                            </div>
                            <span class="block text-[8px] font-black text-gray-500 dark:text-gray-400 uppercase text-center mt-2 leading-tight px-1 truncate">${doc.title}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // 5. MODAL LOGIC
    window.showModal = (id, title, mode) => {
        activeEventId = id;
        activeMode = mode || "4";
        document.getElementById('modal-event-title').textContent = title;
        renderSlots(activeMode);
        uploaderModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    window.hideModal = () => {
        uploaderModal.classList.add('hidden');
        document.body.style.overflow = '';
        selectedFiles = {};
    };

    const slotConfigs = {
        "4": [
            { id: "letter_image", label: "1. Letter of Approval" },
            { id: "permit_image", label: "2. Permit to Conduct Activity" },
            { id: "equipment_image", label: "3. Excuse Letter & Equipment" },
            { id: "event_cover_photo", label: "4. Event Cover Photo" }
        ],
        "2": [
            { id: "letter_image", label: "1. Letter of Reschedule" },
            { id: "reschedule_cover_photo", label: "2. Event Reschedule Cover Photo" }
        ]
    };

    function renderSlots(mode) {
        selectedFiles = {};
        const items = slotConfigs[mode];
        slotsContainer.innerHTML = items.map(slot => `
            <div class="flex flex-col p-5 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-black relative transition-all hover:border-[#800000] dark:hover:border-[#D4AF37] group">
                <div id="pv-cnt-${slot.id}" class="hidden absolute inset-0 z-20 bg-black rounded-2xl overflow-hidden shadow-2xl">
                    <img id="pv-img-${slot.id}" class="w-full h-full object-cover opacity-70" />
                    <div class="absolute inset-0 flex items-center justify-center bg-black/40">
                         <button type="button" class="bg-red-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl shadow-lg hover:bg-red-700 transition" onclick="removeFile('${slot.id}')">Remove File</button>
                    </div>
                </div>
                <div class="flex items-center gap-4 mb-5">
                    <div class="w-12 h-12 shrink-0 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-[#800000] dark:group-hover:text-[#D4AF37] transition-colors">
                        <i class="ph-bold ph-file-arrow-up text-2xl"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-[11px] font-black text-gray-800 dark:text-gray-100 uppercase leading-tight truncate tracking-tight">${slot.label}</p>
                        <p id="st-${slot.id}" class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Status: Pending</p>
                    </div>
                </div>
                <label class="w-full cursor-pointer bg-gray-100 dark:bg-gray-800 hover:bg-[#800000] dark:hover:bg-[#D4AF37] hover:text-white dark:hover:text-black text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest py-3.5 rounded-xl text-center transition-all shadow-sm active:scale-95">
                    Select File
                    <input type="file" id="in-${slot.id}" accept="image/*" class="hidden" onchange="handleFile(event, '${slot.id}')">
                </label>
            </div>
        `).join('');
    }

    window.handleFile = (e, id) => {
        const file = e.target.files[0];
        if (!file) return;
        selectedFiles[id] = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById(`pv-img-${id}`).src = ev.target.result;
            document.getElementById(`pv-cnt-${id}`).classList.remove('hidden');
            const st = document.getElementById(`st-${id}`);
            st.textContent = 'Status: Selected';
            st.classList.replace('text-gray-400', 'text-emerald-500');
        };
        reader.readAsDataURL(file);
    };

    window.removeFile = (id) => {
        delete selectedFiles[id];
        document.getElementById(`in-${id}`).value = "";
        document.getElementById(`pv-cnt-${id}`).classList.add('hidden');
        const st = document.getElementById(`st-${id}`);
        st.textContent = 'Status: Pending';
        st.classList.replace('text-emerald-500', 'text-gray-400');
    };

    // --- PREVIEW LETTER LOGIC (EXACTLY MATCHING CREATE_EVENTS.HTML) ---
    window.openPreviewModal = (id) => {
        const ev = vaultRecords.find(e => e.id === id);
        if(!ev) return;
        
        const rawDesc = ev.description || "";
        const isResched = rawDesc.includes("[RESCHEDULE]");
        const fullOrgText = getOrgFullName(ev.org);
        
        const data = {};
        rawDesc.split(' | ').forEach(p => {
            const [k, ...v] = p.split(': ');
            if (v.length > 0) data[k.trim()] = v.join(': ').trim();
        });

        const actualDesc = data['Desc'] || rawDesc;
        const target = data['Target'] || "all affected students";
        const equipment = data['Equipment'] || "the necessary equipment";
        const reason = data['Reason'] || "unforeseen circumstances";
        const origDate = data['Original'] || "(Original Date)";

        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = ev.event_date ? new Date(ev.event_date).toLocaleDateString('en-US', options) : "";

        const commonHeader = `
            <p class="mb-6 font-bold">${ev.date}</p>
            <p class="mb-6 leading-tight"><strong>Dr. EDWIN G. MALABUYOC</strong><br>Director<br>This Campus</p>
            <p class="mb-6 leading-tight">Thru/Attn: &nbsp; &nbsp;<strong>ANNABEL S. JANORAS</strong><br>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;Head of Students Services<br>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;This Campus</p>
        `;

        const commonFooter = `
            <p class="mb-8">Respectfully yours,</p>
            <div class="mb-8">
                <p class="font-bold uppercase mb-0">${ev.requester_name}</p>
                <p class="mt-0">${ev.org} President</p>
            </div>
            <div>
                <p class="mb-6">Noted by:</p>
                <p class="font-bold uppercase mb-0">${ev.adviser_name}</p>
                <p class="mt-0">${ev.org} Adviser / Program Chair</p>
            </div>
        `;

        let mainBody = "";
        if (isResched) {
            viewTabMainLabel.innerText = "Reschedule Letter";
            mainBody = `
                <p class="mb-6">Re: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <strong>Scheduling of Organizational Student Activity</strong></p>
                <p class="mb-4 text-justify indent-8">We hope this letter finds you well. ${fullOrgText} respectfully requests a rescheduling of our upcoming event entitled <strong>"${ev.eventName}"</strong>. The event was originally set for ${origDate}.</p>
                <p class="mb-4 text-justify indent-8">We propose moving the event to <strong>${formattedDate}</strong>, from <strong>${formatTime(ev.start_time)}</strong> at <strong>${ev.venue}</strong>.</p>
                <p class="mb-8 text-justify indent-8">This request is made ${reason}. ${actualDesc}</p>
            `;
        } else {
            viewTabMainLabel.innerText = "Request Letter";
            mainBody = `
                <p class="mb-6">Re: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <strong>Approval of Organizational Student Activity</strong></p>
                <p class="mb-4 text-justify indent-8">To comply with the commitment to UPHOLD E2E Program, ${fullOrgText} will be conducting an activity entitled <strong>"${ev.eventName}"</strong>.</p>
                <p class="mb-4 text-justify indent-8">The activity is scheduled for <strong>${formattedDate}</strong>, <strong>${formatTime(ev.start_time)}</strong> at <strong>${ev.venue}</strong>.</p>
                <p class="mb-8 text-justify indent-8">${actualDesc}</p>
            `;
        }

        const excuseBody = `
            <p class="mb-6">Re: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <strong>Excuse and Request Usage of Equipment/Facility</strong></p>
            <p class="mb-4 text-justify indent-8">${fullOrgText} is organizing an event <strong>"${ev.eventName}"</strong> on ${formattedDate} at ${ev.venue}.</p>
            <p class="mb-8 text-justify indent-8">We respectfully request the excusal of <strong>${target}</strong> whose classes will be affected, and we also request usage of the aforementioned facility, together with <strong>${equipment}</strong>.</p>
        `;

        viewContentMain.innerHTML = commonHeader + mainBody + commonFooter;
        viewContentExcuse.innerHTML = commonHeader + excuseBody + commonFooter;

        // Reset tab styles and hide content
        viewTabMain.classList.remove('border-[#800000]', 'bg-red-50', 'dark:bg-red-900/10');
        viewTabMain.classList.add('border-gray-200', 'dark:border-gray-800');
        viewTabExcuse.classList.remove('border-[#800000]', 'bg-red-50', 'dark:bg-red-900/10');
        viewTabExcuse.classList.add('border-gray-200', 'dark:border-gray-800');
        
        const paperContainer = document.getElementById('viewPrintPaper');
        paperContainer.classList.add('document-preview-container');
        paperContainer.classList.remove('active');
        viewContentMain.classList.add('hidden');
        viewContentExcuse.classList.add('hidden');

        // Setup Tab Visibility
        if(isResched) {
            viewTabExcuse.classList.add('hidden');
            viewTabMain.classList.add('col-span-2');
        } else {
            viewTabExcuse.classList.remove('hidden');
            viewTabMain.classList.remove('col-span-2');
        }

        viewModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Auto-open main tab
        setTimeout(() => switchDocTab('main'), 50);
    };

    window.closeViewModal = () => {
        viewModal.classList.add('hidden');
        document.body.style.overflow = '';
    };

    window.switchDocTab = (tab) => {
        const paperContainer = document.getElementById('viewPrintPaper');
        
        // Reset visibility
        viewContentMain.classList.add('hidden');
        viewContentExcuse.classList.add('hidden');
        paperContainer.classList.remove('active');

        // Small delay to trigger animation
        setTimeout(() => {
            if (tab === 'main') {
                viewTabMain.classList.add('border-[#800000]', 'bg-red-50', 'dark:bg-red-900/10');
                viewTabMain.classList.remove('border-gray-200', 'dark:border-gray-800');
                viewTabExcuse.classList.remove('border-[#800000]', 'bg-red-50', 'dark:bg-red-900/10');
                viewTabExcuse.classList.add('border-gray-200', 'dark:border-gray-800');
                viewContentMain.classList.remove('hidden');
            } else {
                viewTabExcuse.classList.add('border-[#800000]', 'bg-red-50', 'dark:bg-red-900/10');
                viewTabExcuse.classList.remove('border-gray-200', 'dark:border-gray-800');
                viewTabMain.classList.remove('border-[#800000]', 'bg-red-50', 'dark:bg-red-900/10');
                viewTabMain.classList.add('border-gray-200', 'dark:border-gray-800');
                viewContentExcuse.classList.remove('hidden');
            }
            paperContainer.classList.add('active');
        }, 50);
    };

    // 6. SEARCH LOGIC (WITH EMPTY STATES)
    searchPending.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        let count = 0;
        [...pendingList.children].forEach(card => {
            const name = card.getAttribute('data-event-name') || '';
            const match = name.includes(query);
            card.classList.toggle('hidden', !match);
            if(match) count++;
        });
        pendingEmpty.classList.toggle('hidden', count > 0 || query === '');
    });

    searchVault.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        let count = 0;
        [...vaultList.children].forEach(card => {
            const name = card.getAttribute('data-vault-name') || '';
            const match = name.includes(query);
            card.classList.toggle('hidden', !match);
            if(match) count++;
        });
        vaultEmpty.classList.toggle('hidden', count > 0 || query === '');
    });

    // 7. REAL HISTORY DOWNLOAD LOGIC
    window.handleVaultDownload = async (btn, eventId) => {
        const card = btn.closest('[data-vault-name]');
        const resolvedId = eventId || (card ? card.getAttribute('data-event-id') : null);
        if (resolvedId) {
            try {
                const getCookie = (name) => {
                    let cookieValue = null;
                    if (document.cookie && document.cookie !== '') {
                        const cookies = document.cookie.split(';');
                        for (let i = 0; i < cookies.length; i++) {
                            const cookie = cookies[i].trim();
                            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                                break;
                            }
                        }
                    }
                    return cookieValue;
                };
                const response = await fetch('/adviser/api/download-documents/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken') || ''
                    },
                    body: JSON.stringify({ event_ids: [resolvedId] })
                });
                if (response.ok) {
                    let filename = `Event_${resolvedId}_documents.zip`;
                    const contentDisposition = response.headers.get('Content-Disposition');
                    if (contentDisposition && contentDisposition.includes('filename=')) {
                        filename = contentDisposition.split('filename=')[1].replace(/["']/g, '');
                    }
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                    return;
                }
            } catch (err) {
                console.warn('ZIP download fallback to individual files:', err);
            }
        }

        if (!card) return;
        const cells = card.querySelectorAll('.cell-container');
        cells.forEach((cell, index) => {
            const src = cell.getAttribute('data-img-src');
            const titleEl = cell.querySelector('span');
            const title = titleEl ? titleEl.textContent : `File_${index + 1}`;
            if (src) {
                setTimeout(async () => {
                    try {
                        const resp = await fetch(src);
                        const blob = await resp.blob();
                        const blobUrl = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = `Document_${index + 1}_${title.replace(/\s+/g, '_')}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(blobUrl);
                    } catch (e) {
                        const a = document.createElement('a');
                        a.href = src;
                        a.target = '_blank';
                        a.download = `Document_${index + 1}_${title.replace(/\s+/g, '_')}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }
                }, index * 250);
            }
        });
    };

    // 8. LIGHTBOX LOGIC (CLICK BACKDROP TO CLOSE)
    window.openPreview = (url) => {
        previewImg.src = url;
        previewModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    const closePreview = () => {
        previewModal.classList.add('hidden');
        if (uploaderModal.classList.contains('hidden') && viewModal.classList.contains('hidden')) {
            document.body.style.overflow = '';
        }
    };

    closePreviewBtn.addEventListener('click', closePreview);
    previewModal.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closePreview();
    });

    // 9. CLICK OUTSIDE MODAL TO CLOSE
    uploaderModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('backdrop-click-area')) hideModal();
    });

    // 10. SUBMISSION & TOAST
    submitBtn.addEventListener('click', () => {
        const mode = activeMode;
        const expected = slotConfigs[mode].map(s => s.id);
        const missing = expected.filter(id => !selectedFiles[id]);
        
        if (missing.length > 0) {
            alert("⚠️ Please provide all required documents.");
            return;
        }

        const formData = new FormData();
        formData.append('event_id', activeEventId);
        formData.append('requirement_mode', mode);
        formData.append('csrfmiddlewaretoken', (document.querySelector('[name=csrfmiddlewaretoken]') ? document.querySelector('[name=csrfmiddlewaretoken]').value : ''));
        Object.keys(selectedFiles).forEach(key => formData.append(key, selectedFiles[key]));

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Processing...';

        fetch("/organizer/upload-permit/", { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                hideModal();
                showToast();
                setTimeout(() => location.reload(), 2000);
            } else {
                alert("Upload failed: " + data.message);
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit';
            }
        })
        .catch(err => {
            alert("Error communicating with server.");
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit';
        });
    });

    function showToast() {
        toast.classList.remove('translate-y-20', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            toast.classList.remove('translate-y-0', 'opacity-100');
        }, 3000);
    }

    // INITIAL RENDER
    renderPending();
    renderVault();
});
