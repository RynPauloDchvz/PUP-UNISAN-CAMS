const CSRF_TOKEN = (document.querySelector('[name=csrfmiddlewaretoken]') ? document.querySelector('[name=csrfmiddlewaretoken]').value : '');

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

    let allEvents = [];
    let allDocuments = [];
    let approvedEvents = [];

    document.addEventListener("DOMContentLoaded", function () {
        try {
            const dataNode = document.getElementById('events-data');
            if (dataNode) {
                const parsed = JSON.parse(dataNode.textContent);
                allEvents = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
            }

            const docsNode = document.getElementById('documents-data');
            if (docsNode) {
                const parsedDocs = JSON.parse(docsNode.textContent);
                allDocuments = typeof parsedDocs === 'string' ? JSON.parse(parsedDocs) : parsedDocs;

                // Show only current active proposal (not yet approved/published)
                const activeDoc = allDocuments.find(d => d.status && d.status !== 'Approved');
                if (activeDoc) {
                    showTrackingDetails(activeDoc.id);
                }
            }

            const apprNode = document.getElementById('approved-events-data');
            if (apprNode) {
                const parsedAppr = JSON.parse(apprNode.textContent);
                approvedEvents = typeof parsedAppr === 'string' ? JSON.parse(parsedAppr) : parsedAppr;

                // Populate Dropdown
                const dropdown = document.getElementById('origEventId');
                if (dropdown) {
                    approvedEvents.forEach(ae => {
                        const opt = document.createElement('option');
                        opt.value = ae.id;
                        opt.textContent = `${ae.title} (${ae.date})`;
                        dropdown.appendChild(opt);
                    });
                }
            }
        } catch (e) { console.error("Error loading data", e); }

        toggleFormFields();

        // Enforce minimum date as today for Target Date (No past dates)
        const evtDateInput = document.getElementById('evtDate');
        if (evtDateInput) {
            const now = new Date();
            const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            evtDateInput.min = localToday;
            evtDateInput.addEventListener('change', function () {
                if (this.value && this.value < localToday) {
                    alert("Event date cannot be in the past. Please select today or a future date.");
                    this.value = localToday;
                }
            });
        }

        // Setup custom select dropdown
        const selectBtn = document.getElementById('customSelectBtn');
        const menuWrapper = document.getElementById('customSelectMenuWrapper');

        if (selectBtn && menuWrapper) {
            selectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = !menuWrapper.classList.contains('grid-rows-[0fr]');
                if (isOpen) {
                    closeCustomSelect();
                } else {
                    openCustomSelect();
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (menuWrapper && !menuWrapper.contains(e.target) && !selectBtn.contains(e.target)) {
                closeCustomSelect();
            }
        });

        // Initialize audience and evaluation state
        updateSelectedOrgs();

        // Responsive Mobile Phase layout listener
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 1024) {
                const p1 = document.getElementById('formPhase1');
                const p2 = document.getElementById('formPhase2');
                if (p1) p1.classList.remove('hidden');
                if (p2) p2.classList.remove('hidden');
            } else {
                setMobilePhase(currentMobilePhase);
            }
        });
    });

    // ==========================================
    // 🟢 MOBILE PHASING CONTROLLERS
    // ==========================================
    let currentMobilePhase = 1;

    function setMobilePhase(phase) {
        if (window.innerWidth >= 1024) return;
        currentMobilePhase = phase;
        const p1 = document.getElementById('formPhase1');
        const p2 = document.getElementById('formPhase2');
        const bar = document.getElementById('mobileProgressBar');
        const step1 = document.getElementById('step1Indicator');
        const step2 = document.getElementById('step2Indicator');
        const phaseText = document.getElementById('mobilePhaseText');

        if (phase === 1) {
            if (p2) {
                p2.classList.add('hidden');
                p2.classList.remove('flex', 'phase-slide-active');
            }
            if (p1) {
                p1.classList.remove('hidden');
                p1.classList.add('flex', 'phase-slide-active');
            }
            if (bar) bar.style.width = '50%';
            if (phaseText) phaseText.innerText = 'Phase 1 of 2: Document & Organization Details';
            if (step1) {
                step1.classList.add('text-pup-maroon', 'dark:text-pup-gold', 'font-black');
                step1.classList.remove('text-gray-400');
            }
            if (step2) {
                step2.classList.remove('text-pup-maroon', 'dark:text-pup-gold', 'font-black');
                step2.classList.add('text-gray-400');
            }
        } else {
            if (p1) {
                p1.classList.add('hidden');
                p1.classList.remove('flex', 'phase-slide-active');
            }
            if (p2) {
                p2.classList.remove('hidden');
                p2.classList.add('flex', 'phase-slide-active');
            }
            if (bar) bar.style.width = '100%';
            if (phaseText) phaseText.innerText = 'Phase 2 of 2: Event Schedule & Letter Information';
            if (step2) {
                step2.classList.add('text-pup-maroon', 'dark:text-pup-gold', 'font-black');
                step2.classList.remove('text-gray-400');
            }
            if (step1) {
                step1.classList.remove('text-pup-maroon', 'dark:text-pup-gold', 'font-black');
                step1.classList.add('text-gray-400');
            }
        }

        const formTop = document.getElementById('createEventForm');
        if (formTop) {
            formTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function proceedToMobilePhase2() {
        const reqName = document.getElementById('reqName');
        const letterType = document.getElementById('letterType').value;
        const advName = document.getElementById('advName');
        const targetAudience = document.getElementById('targetAudience').value;
        const allowedOrgs = document.getElementById('allowedOrgsInput').value;

        if (reqName && !reqName.value.trim()) {
            reqName.focus();
            alert('Please enter the Requester Name.');
            return;
        }

        if (letterType !== 'flag_raising' && advName && !advName.value.trim()) {
            advName.focus();
            alert('Please enter the Adviser Full Name.');
            return;
        }

        if (targetAudience === 'SPECIFIC' && (!allowedOrgs || !allowedOrgs.trim())) {
            alert('Please select at least one organization for specific availability.');
            return;
        }

        setMobilePhase(2);
    }

    // ==========================================
    // 🟢 AUDIENCE & EVALUATION CONTROLLERS
    // ==========================================
    function setAudienceMode(mode) {
        const targetAudienceInput = document.getElementById('targetAudience');
        const allowedOrgsInput = document.getElementById('allowedOrgsInput');
        const btnAll = document.getElementById('btnAudienceAll');
        const btnSpecific = document.getElementById('btnAudienceSpecific');
        const wrapper = document.getElementById('specificOrgsWrapper');
        const badge = document.getElementById('audienceBadge');

        if (!targetAudienceInput) return;
        targetAudienceInput.value = mode;

        const activeClasses = ['bg-white', 'dark:bg-[#222]', 'text-pup-maroon', 'dark:text-pup-gold', 'shadow-sm'];
        const inactiveClasses = ['text-gray-600', 'dark:text-gray-400', 'hover:text-gray-900', 'dark:hover:text-white'];

        if (mode === 'ALL') {
            if (btnAll) {
                btnAll.classList.add(...activeClasses);
                btnAll.classList.remove(...inactiveClasses);
            }
            if (btnSpecific) {
                btnSpecific.classList.remove(...activeClasses);
                btnSpecific.classList.add(...inactiveClasses);
            }
            if (wrapper) {
                wrapper.classList.remove('grid-rows-[1fr]', 'opacity-100');
                wrapper.classList.add('grid-rows-[0fr]', 'opacity-0');
            }
            if (allowedOrgsInput) allowedOrgsInput.value = 'ALL';
            if (badge) {
                badge.innerText = 'All Organizations';
                badge.className = 'text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 transition-all';
            }
        } else {
            if (btnSpecific) {
                btnSpecific.classList.add(...activeClasses);
                btnSpecific.classList.remove(...inactiveClasses);
            }
            if (btnAll) {
                btnAll.classList.remove(...activeClasses);
                btnAll.classList.add(...inactiveClasses);
            }
            if (wrapper) {
                wrapper.classList.remove('grid-rows-[0fr]', 'opacity-0');
                wrapper.classList.add('grid-rows-[1fr]', 'opacity-100');
            }
            updateSelectedOrgs();
        }
    }

    function updateSelectedOrgs() {
        const checkboxes = document.querySelectorAll('input[name="target_org_choice"]');
        const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);
        const selectedVals = checkedBoxes.map(cb => cb.value);

        const allowedOrgsInput = document.getElementById('allowedOrgsInput');
        const summaryText = document.getElementById('selectedOrgsListText');
        const badge = document.getElementById('audienceBadge');
        const targetAudienceInput = document.getElementById('targetAudience');

        checkboxes.forEach(cb => {
            const card = cb.closest('.org-check-card');
            if (card) {
                if (cb.checked) {
                    card.classList.add('border-pup-maroon', 'dark:border-pup-gold', 'bg-pup-maroon/5', 'dark:bg-pup-gold/5');
                } else {
                    card.classList.remove('border-pup-maroon', 'dark:border-pup-gold', 'bg-pup-maroon/5', 'dark:bg-pup-gold/5');
                }
            }
        });

        const isSpecific = targetAudienceInput && targetAudienceInput.value === 'SPECIFIC';

        if (allowedOrgsInput) {
            allowedOrgsInput.value = isSpecific ? (selectedVals.join(',') || '') : 'ALL';
        }

        if (summaryText) {
            summaryText.innerText = selectedVals.length > 0 ? selectedVals.join(', ') : 'None selected (Please select at least 1)';
        }

        if (isSpecific && badge) {
            if (selectedVals.length === 0) {
                badge.innerText = 'No Orgs Selected';
                badge.className = 'text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 transition-all';
            } else if (selectedVals.length === 1) {
                badge.innerText = `${selectedVals[0]} Only`;
                badge.className = 'text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 transition-all';
            } else {
                badge.innerText = `${selectedVals.length} Orgs Selected`;
                badge.className = 'text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 transition-all';
            }
        }
    }

    function toggleAllOrgCheckboxes(select) {
        const checkboxes = document.querySelectorAll('input[name="target_org_choice"]');
        checkboxes.forEach(cb => {
            cb.checked = select;
        });
        updateSelectedOrgs();
    }

    function setEvaluationMode(enabled) {
        const hasEvalInput = document.getElementById('hasEvaluation');
        const btnWith = document.getElementById('btnEvalWith');
        const btnWithout = document.getElementById('btnEvalWithout');
        const badge = document.getElementById('evalBadge');
        const helperText = document.getElementById('evalHelperText');

        if (!hasEvalInput) return;
        hasEvalInput.value = enabled ? 'true' : 'false';

        const activeClasses = ['bg-white', 'dark:bg-[#222]', 'text-pup-maroon', 'dark:text-pup-gold', 'shadow-sm'];
        const inactiveClasses = ['text-gray-600', 'dark:text-gray-400', 'hover:text-gray-900', 'dark:hover:text-white'];

        if (enabled) {
            if (btnWith) {
                btnWith.classList.add(...activeClasses);
                btnWith.classList.remove(...inactiveClasses);
            }
            if (btnWithout) {
                btnWithout.classList.remove(...activeClasses);
                btnWithout.classList.add(...inactiveClasses);
            }
            if (badge) {
                badge.innerText = 'Feedback Enabled';
                badge.className = 'text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 transition-all';
            }
            if (helperText) {
                helperText.innerText = 'Students will be prompted to submit ratings and feedback in the Evaluation Hub after attending this event.';
            }
        } else {
            if (btnWithout) {
                btnWithout.classList.add(...activeClasses);
                btnWithout.classList.remove(...inactiveClasses);
            }
            if (btnWith) {
                btnWith.classList.remove(...activeClasses);
                btnWith.classList.add(...inactiveClasses);
            }
            if (badge) {
                badge.innerText = 'No Evaluation';
                badge.className = 'text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 transition-all';
            }
            if (helperText) {
                helperText.innerText = 'No feedback or ratings will be required from students for this event.';
            }
        }
    }

    function setAttendanceScope(mode) {
        const scopeInput = document.getElementById('attendanceScope');
        const btnCampus = document.getElementById('btnScopeCampus');
        const btnOutside = document.getElementById('btnScopeOutside');
        const badge = document.getElementById('scopeBadge');
        const helperText = document.getElementById('scopeHelperText');

        if (!scopeInput) return;
        scopeInput.value = mode;

        const activeClasses = ['bg-white', 'dark:bg-[#222]', 'text-pup-maroon', 'dark:text-pup-gold', 'shadow-sm'];
        const inactiveClasses = ['text-gray-600', 'dark:text-gray-400', 'hover:text-gray-900', 'dark:hover:text-white'];

        if (mode === 'CAMPUS_ONLY') {
            if (btnCampus) {
                btnCampus.classList.add(...activeClasses);
                btnCampus.classList.remove(...inactiveClasses);
            }
            if (btnOutside) {
                btnOutside.classList.remove(...activeClasses);
                btnOutside.classList.add(...inactiveClasses);
            }
            if (badge) {
                badge.innerText = 'Campus Only';
                badge.className = 'text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 transition-all';
            }
            if (helperText) {
                helperText.innerText = 'Strict geofencing enforced: Students can only log face recognition attendance within PUP Unisan campus premises (300m radius).';
            }
        } else {
            if (btnOutside) {
                btnOutside.classList.add(...activeClasses);
                btnOutside.classList.remove(...inactiveClasses);
            }
            if (btnCampus) {
                btnCampus.classList.remove(...activeClasses);
                btnCampus.classList.add(...inactiveClasses);
            }
            if (badge) {
                badge.innerText = 'Outside Campus Allowed';
                badge.className = 'text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 transition-all';
            }
            if (helperText) {
                helperText.innerText = 'Flexible attendance enabled: Students can complete face recognition attendance anywhere (remote / outside campus allowed).';
            }
        }
    }

    function openCustomSelect() {
        const menuWrapper = document.getElementById('customSelectMenuWrapper');
        const selectIcon = document.getElementById('customSelectIcon');
        if (menuWrapper) {
            menuWrapper.classList.remove('grid-rows-[0fr]', 'opacity-0');
            menuWrapper.classList.add('grid-rows-[1fr]', 'opacity-100');
            if (selectIcon) selectIcon.classList.add('rotate-180');
        }
    }

    function closeCustomSelect() {
        const menuWrapper = document.getElementById('customSelectMenuWrapper');
        const selectIcon = document.getElementById('customSelectIcon');
        if (menuWrapper) {
            menuWrapper.classList.remove('grid-rows-[1fr]', 'opacity-100');
            menuWrapper.classList.add('grid-rows-[0fr]', 'opacity-0');
            if (selectIcon) selectIcon.classList.remove('rotate-180');
        }
    }

    function selectLetterType(val, label) {
        document.getElementById('letterType').value = val;
        document.getElementById('customSelectLabel').innerText = label;
        closeCustomSelect();
        toggleFormFields();
    }

    function autoPopulateOrigDate(select) {
        const eventId = select.value;
        const origDateInput = document.getElementById('origDate');
        if (!eventId) {
            origDateInput.value = "";
            return;
        }
        const event = approvedEvents.find(ae => ae.id.toString() === eventId.toString());
        if (event) {
            origDateInput.value = event.date;
        }
    }

    function renderDocuments(docsToRender) {
        // Function disabled on this page as the list has been moved to document_tracking.html
    }

    let trackingMapInstance = null;
    let trackingMarkerInstance = null;

    function scrollTrackingModalDown() {
        const body = document.getElementById('trackingModalBody');
        if (body) {
            body.scrollBy({ top: 220, behavior: 'smooth' });
        }
    }

    function checkTrackingScrollHint() {
        const body = document.getElementById('trackingModalBody');
        const hint = document.getElementById('trackingScrollHint');
        if (!body || !hint) return;

        // Content overflows if scrollHeight is strictly greater than clientHeight
        const hasOverflow = body.scrollHeight > (body.clientHeight + 15);
        // User is near the bottom if remaining scroll is less than 30px
        const isNearBottom = (body.scrollHeight - body.scrollTop - body.clientHeight) < 30;

        if (hasOverflow && !isNearBottom) {
            hint.classList.remove('opacity-0', 'pointer-events-none');
            hint.classList.add('opacity-100');
        } else {
            hint.classList.remove('opacity-100');
            hint.classList.add('opacity-0', 'pointer-events-none');
        }
    }

    function openMobileTracking(e) {
        const overlay = document.getElementById('trackingOverlayMobile');
        const container = document.getElementById('trackingContainerMobile');
        const iosWrapper = document.getElementById('trackingIosWrapper');

        if (iosWrapper && e) {
            document.documentElement.style.setProperty('--click-x', e.clientX + 'px');
            document.documentElement.style.setProperty('--click-y', e.clientY + 'px');
        }

        const noDocsEl = document.getElementById('noTrackingDocs');
        const currentLocBox = document.getElementById('currentLocBox');
        const docInfo = document.getElementById('docInfo');
        const mapWrapper = document.getElementById('mapWrapper');
        const bodyEl = document.getElementById('trackingModalBody');
        if (bodyEl) bodyEl.scrollTop = 0;

        // Only track the single current ongoing event proposal (not published yet)
        const activeDoc = allDocuments.find(d => d.status && d.status !== 'Approved');

        if (activeDoc) {
            if (noDocsEl) noDocsEl.classList.add('hidden');
            if (currentLocBox) currentLocBox.classList.remove('hidden');
            if (docInfo) docInfo.classList.remove('hidden');
            if (mapWrapper) mapWrapper.classList.remove('hidden');

            showTrackingDetails(activeDoc.id);
        } else {
            // When all events are published or none created, show clean placeholder
            if (noDocsEl) noDocsEl.classList.remove('hidden');
            if (currentLocBox) currentLocBox.classList.add('hidden');
            if (docInfo) docInfo.classList.add('hidden');
            if (mapWrapper) mapWrapper.classList.add('hidden');

            if (trackingMapInstance) {
                trackingMapInstance.remove();
                trackingMapInstance = null;
            }
        }

        overlay.classList.remove('hidden');
        container.classList.remove('hidden');
        container.classList.add('flex');

        iosWrapper.classList.remove('ios-pop-wrapper-close');
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            checkTrackingScrollHint();
        }, 200);
    }

    function closeMobileTracking() {
        const overlay = document.getElementById('trackingOverlayMobile');
        const container = document.getElementById('trackingContainerMobile');
        const iosWrapper = document.getElementById('trackingIosWrapper');

        iosWrapper.classList.add('ios-pop-wrapper-close');

        if (trackingMapInstance) {
            trackingMapInstance.remove();
            trackingMapInstance = null;
        }

        setTimeout(() => {
            overlay.classList.add('hidden');
            container.classList.add('hidden');
            container.classList.remove('flex');
            iosWrapper.classList.remove('ios-pop-wrapper-close');
            document.body.style.overflow = '';
        }, 350);
    }

    function formatFlowStatus(status) {
        switch(status) {
            case 'Pending Adviser': return 'Pending Adviser (Initial Review)';
            case 'Admin Approved':
            case 'Adviser Approved': return 'Adviser Approved (Gathering Signatures)';
            case 'Permit Verification': return 'Adviser Finalize Event Requirements';
            case 'Final Admin Review': return 'Final Admin Review (Admin Clearance)';
            case 'Approved': return 'Approved (Published Event)';
            case 'Rejected': return 'Rejected (Correction Required)';
            default: return status || 'Pending';
        }
    }

    function showTrackingDetails(docId) {
        const doc = allDocuments.find(d => d.id === docId);
        if (!doc) return;

        // UI Updates
        document.getElementById('docInfo').classList.remove('hidden');
        document.getElementById('currentLocBox').classList.remove('hidden');
        const mapWrapper = document.getElementById('mapWrapper');
        if (mapWrapper) mapWrapper.classList.remove('hidden');

        document.getElementById('infoEventName').innerText = doc.eventName;
        document.getElementById('infoType').innerText = doc.docType;
        document.getElementById('infoCurrentLoc').innerText = doc.currentLoc;

        const formattedStatus = formatFlowStatus(doc.status);
        const statusEl = document.getElementById('infoStatus');
        statusEl.innerText = formattedStatus;

        if (doc.status === 'Approved') {
            statusEl.className = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-3 py-1 rounded-full text-[10.5px] uppercase font-black tracking-wider';
        } else if (doc.status === 'Rejected') {
            statusEl.className = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-1 rounded-full text-[10.5px] uppercase font-black tracking-wider';
        } else if (doc.status === 'Admin Approved' || doc.status === 'Adviser Approved') {
            statusEl.className = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full text-[10.5px] uppercase font-black tracking-wider';
        } else if (doc.status === 'Permit Verification') {
            statusEl.className = 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 px-3 py-1 rounded-full text-[10.5px] uppercase font-black tracking-wider';
        } else if (doc.status === 'Final Admin Review') {
            statusEl.className = 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-full text-[10.5px] uppercase font-black tracking-wider';
        } else {
            statusEl.className = 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full text-[10.5px] uppercase font-black tracking-wider';
        }

        const alertBox = document.getElementById('rejectAlert');
        if (doc.status === 'Rejected') {
            alertBox.classList.remove('hidden');
            document.getElementById('rejectReasonText').innerText = doc.rejectReason;
        } else {
            alertBox.classList.add('hidden');
        }

        setTimeout(() => {
            initTrackingLeafletMap(doc.coords, doc.currentLoc);
            checkTrackingScrollHint();
        }, 150);
    }

    function initTrackingLeafletMap(coords, locName) {
        if (typeof L === 'undefined') {
            console.error('Leaflet is not loaded');
            return;
        }
        
        const mapEl = document.getElementById('trackingMap');
        if (!mapEl) return;

        if (trackingMapInstance) {
            trackingMapInstance.remove();
            trackingMapInstance = null;
        }

        const defaultCoords = [13.84575, 121.96915];
        const targetCoords = (coords && Array.isArray(coords) && coords.length === 2 && !isNaN(coords[0])) ? coords : defaultCoords;

        trackingMapInstance = L.map('trackingMap', {
            zoomControl: true,
            attributionControl: false,
            scrollWheelZoom: false
        }).setView(targetCoords, 18);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(trackingMapInstance);

        const customPulseIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #800000; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(128,0,0,0.6); animation: pulse-red 2s infinite;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        const popupHtml = `
            <div class="text-center p-1.5 font-sans min-w-[160px]">
                <div class="font-black text-pup-maroon dark:text-pup-gold text-[11px] uppercase tracking-tight mb-1" id="bubbleLocTitle">
                    ${locName || 'Office Location'}
                </div>
                <div class="text-[9px] text-gray-500 font-bold leading-tight border-t border-gray-100 dark:border-gray-800 pt-1 mt-1 flex items-center justify-center gap-1" id="bubbleSubLoc">
                    <i class="ph-bold ph-map-pin text-pup-maroon dark:text-pup-gold"></i> Barangay Kalilayan Ibaba, Unisan
                </div>
            </div>
        `;

        trackingMarkerInstance = L.marker(targetCoords, { icon: customPulseIcon }).addTo(trackingMapInstance)
            .bindPopup(popupHtml, { closeButton: false, className: 'custom-popup' })
            .openPopup();

        // Accurate address resolution via Nominatim: If person or office is in a remote location, show town/city name!
        if (targetCoords) {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetCoords[0]}&lon=${targetCoords[1]}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.display_name) {
                        const parts = data.display_name.split(',');
                        const cleanAddr = parts.slice(0, 3).join(', ').trim();
                        const subEl = document.getElementById('bubbleSubLoc');
                        if (subEl) {
                            subEl.innerHTML = `<i class="ph-bold ph-map-pin text-pup-maroon dark:text-pup-gold"></i> ${cleanAddr}`;
                        }
                    }
                })
                .catch(() => {});
        }

        setTimeout(() => {
            if (trackingMapInstance) trackingMapInstance.invalidateSize();
            checkTrackingScrollHint();
        }, 250);
    }

    function toggleFormFields() {
        const type = document.getElementById('letterType').value;
        const reschedFields = document.getElementById('rescheduleFields');
        const excuseFields = document.getElementById('excuseFields');
        const flagFields = document.getElementById('flagRaisingFields');
        const standardDescDiv = document.getElementById('standardDescDiv');
        const downloadBtn = document.getElementById('btnDownloadDocs');
        const submitBtn = document.querySelector('button[type="submit"]');
        const advNameInput = document.getElementById('advName');
        const advNameWrapper = document.getElementById('advNameWrapper');
        const evtTitleInput = document.getElementById('evtTitle');
        const orgAcr = document.getElementById('reqOrg').value;
        const availabilitySec = document.getElementById('availabilitySection');
        const evaluationSec = document.getElementById('evaluationSection');

        const show = (el) => { if (el) { el.classList.remove('grid-rows-[0fr]', 'opacity-0'); el.classList.add('grid-rows-[1fr]', 'opacity-100'); } };
        const hide = (el) => { if (el) { el.classList.remove('grid-rows-[1fr]', 'opacity-100'); el.classList.add('grid-rows-[0fr]', 'opacity-0'); } };

        if (type === 'flag_raising') {
            show(flagFields);
            hide(reschedFields);
            hide(excuseFields);
            hide(standardDescDiv);
            hide(advNameWrapper);
            if (availabilitySec) availabilitySec.classList.add('hidden');
            if (evaluationSec) evaluationSec.classList.remove('hidden');
            if (advNameInput) advNameInput.required = false;
            if (evtTitleInput) {
                evtTitleInput.value = `Flag Raising - ${orgAcr}`;
                evtTitleInput.readOnly = true;
            }
            if (submitBtn) submitBtn.innerHTML = '<i class="ph-bold ph-eye text-lg"></i> PREVIEW EVENT POST';
        } else if (type === 'reschedule_event') {
            hide(flagFields);
            show(reschedFields);
            hide(excuseFields);
            show(standardDescDiv);
            show(advNameWrapper);
            if (availabilitySec) availabilitySec.classList.remove('hidden');
            if (evaluationSec) evaluationSec.classList.remove('hidden');
            if (advNameInput) advNameInput.required = true;
            if (evtTitleInput) {
                evtTitleInput.readOnly = false;
                if (evtTitleInput.value.startsWith('Flag Raising -')) evtTitleInput.value = '';
            }
            if (submitBtn) submitBtn.innerHTML = '<i class="ph-bold ph-file-text text-lg"></i> PREVIEW REQUEST LETTER';
            if (downloadBtn) downloadBtn.innerHTML = '<i class="ph-bold ph-file-doc"></i> Download Word Doc';
        } else {
            hide(flagFields);
            hide(reschedFields);
            show(excuseFields);
            show(standardDescDiv);
            show(advNameWrapper);
            if (availabilitySec) availabilitySec.classList.remove('hidden');
            if (evaluationSec) evaluationSec.classList.remove('hidden');
            if (advNameInput) advNameInput.required = true;
            if (evtTitleInput) {
                evtTitleInput.readOnly = false;
                if (evtTitleInput.value.startsWith('Flag Raising -')) evtTitleInput.value = '';
            }
            if (submitBtn) submitBtn.innerHTML = '<i class="ph-bold ph-file-text text-lg"></i> PREVIEW REQUEST LETTER';
            if (downloadBtn) downloadBtn.innerHTML = '<i class="ph-bold ph-file-zip"></i> Download Word Docs (ZIP)';
        }
    }

    function previewFlagImage(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                document.getElementById('flagPhotoPreview').src = e.target.result;
                document.getElementById('flagPhotoPreview').classList.remove('hidden');
                document.getElementById('flagPlaceholder').classList.add('hidden');
            }
            reader.readAsDataURL(input.files[0]);
        }
    }

    function closeFlagPreviewModal() {
        document.getElementById('flagPreviewModal').classList.add('hidden');
        document.body.style.overflow = '';
    }

    async function submitFlagRaising(btn) {
        const evtDateVal = document.getElementById('evtDate') ? document.getElementById('evtDate').value : '';
        const now = new Date();
        const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        if (!evtDateVal || evtDateVal < localToday) {
            alert("Event date cannot be in the past. Please select today or a future date.");
            return;
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Deploying...';
        btn.disabled = true;

        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', CSRF_TOKEN);
        formData.append('title', document.getElementById('evtTitle').value);
        formData.append('date', document.getElementById('evtDate').value);
        formData.append('start_time', document.getElementById('evtStartTime').value);
        formData.append('end_time', document.getElementById('evtEndTime').value);
        formData.append('venue', document.getElementById('evtVenue').value);
        formData.append('is_flag_raising', 'true');
        const scopeVal = document.getElementById('attendanceScope') ? document.getElementById('attendanceScope').value : 'CAMPUS_ONLY';
        formData.append('attendance_scope', scopeVal);

        const photoInput = document.getElementById('flagCoverPhoto');
        if (photoInput.files.length > 0) {
            formData.append('cover_photo', photoInput.files[0]);
        }

        try {
            const response = await fetch('/organizer/api/submit-proposal/', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.status === 'success') {
                closeFlagPreviewModal();
                document.getElementById('successModal').classList.remove('hidden');
                const successMsg = document.querySelector('#successModal p');
                if (successMsg) successMsg.innerText = "The Flag Raising ceremony has been posted and is now live on the School Events ledger.";
            } else {
                alert("Error: " + data.message);
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (error) {
            alert("Connection error.");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    function switchDocTab(tab, mode = 'preview') {
        const prefix = mode === 'view' ? 'view-' : '';
        const mainTab = document.getElementById(`${prefix}tab-main`);
        const excuseTab = document.getElementById(`${prefix}tab-excuse`);
        const mainContent = document.getElementById(`${prefix}content-main`);
        const excuseContent = document.getElementById(`${prefix}content-excuse`);
        const paperContainer = mainContent.parentElement;

        // Reset visibility
        mainContent.classList.add('hidden');
        excuseContent.classList.add('hidden');
        paperContainer.classList.remove('active');

        // Small delay to trigger animation
        setTimeout(() => {
            if (tab === 'main') {
                mainTab.classList.add('border-pup-maroon', 'bg-maroon-50', 'dark:bg-maroon-900/10');
                mainTab.classList.remove('border-gray-200', 'dark:border-gray-800');
                excuseTab.classList.remove('border-pup-maroon', 'bg-maroon-50', 'dark:bg-maroon-900/10');
                excuseTab.classList.add('border-gray-200', 'dark:border-gray-800');
                mainContent.classList.remove('hidden');
            } else {
                excuseTab.classList.add('border-pup-maroon', 'bg-maroon-50', 'dark:bg-maroon-900/10');
                excuseTab.classList.remove('border-gray-200', 'dark:border-gray-800');
                mainTab.classList.remove('border-pup-maroon', 'bg-maroon-50', 'dark:bg-maroon-900/10');
                mainTab.classList.add('border-gray-200', 'dark:border-gray-800');
                excuseContent.classList.remove('hidden');
            }
            paperContainer.classList.add('active');
        }, 50);
    }

    function formatTime(timeInput) {
        if (!timeInput) return "";
        let [hours, minutes] = timeInput.split(':');
        hours = parseInt(hours, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
    }

    function getOrgFullName(acronym) {
        const details = ORG_DETAILS[acronym] || ORG_DETAILS["SSC"];
        return `The ${details.program}, through the ${details.fullname} (${acronym})`;
    }

    function renderEvents(eventsToRender) {
        const container = document.getElementById('eventsList');
        if (!container) return;
        if (eventsToRender.length === 0) {
            container.innerHTML = `<div class="text-center py-16 opacity-50"><p>No events found</p></div>`;
            return;
        }
        let html = '';
        eventsToRender.forEach(ev => {
            html += `
                <div onclick="openViewModal(${ev.id})" class="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 p-5 rounded-xl cursor-pointer hover:border-pup-maroon dark:hover:border-pup-gold transition-all group">
                    <div class="flex justify-between items-start mb-2 gap-2">
                        <h4 class="font-black text-sm text-gray-900 dark:text-white truncate group-hover:text-pup-maroon transition-colors">${ev.title || 'No Title'}</h4>
                        <span class="bg-gray-200 dark:bg-gray-800 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">${ev.status || ''}</span>
                    </div>
                    <p class="text-xs font-bold text-gray-500"><i class="ph-fill ph-calendar"></i> ${ev.date || ''}</p>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    function handleSearch() {
        const query = document.getElementById('eventSearch').value.toLowerCase();
        const filtered = allEvents.filter(ev => (ev.title && ev.title.toLowerCase().includes(query)));
        renderEvents(filtered);
    }

    function generateLetter() {
        const reqNameInput = document.getElementById('reqName');
        const advNameInput = document.getElementById('advName');
        const titleInput = document.getElementById('evtTitle');
        const venueInput = document.getElementById('evtVenue');
        const dateInput = document.getElementById('evtDate');
        const startTimeInput = document.getElementById('evtStartTime');
        const endTimeInput = document.getElementById('evtEndTime');
        const type = document.getElementById('letterType').value;

        // Validation for Phase 1 fields
        if (reqNameInput && !reqNameInput.value.trim()) {
            if (window.innerWidth < 1024) setMobilePhase(1);
            reqNameInput.focus();
            alert("Please enter Requester Name.");
            return;
        }

        if (type !== 'flag_raising' && advNameInput && !advNameInput.value.trim()) {
            if (window.innerWidth < 1024) setMobilePhase(1);
            advNameInput.focus();
            alert("Please enter Adviser Full Name.");
            return;
        }

        // Validation for Phase 2 fields
        if (titleInput && !titleInput.value.trim()) {
            if (window.innerWidth < 1024) setMobilePhase(2);
            titleInput.focus();
            alert("Please enter Event Title.");
            return;
        }

        if (dateInput && !dateInput.value) {
            if (window.innerWidth < 1024) setMobilePhase(2);
            dateInput.focus();
            alert("Please select Event Date.");
            return;
        }

        const now = new Date();
        const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        if (dateInput && dateInput.value < localToday) {
            if (window.innerWidth < 1024) setMobilePhase(2);
            dateInput.focus();
            alert("Event date cannot be in the past. Please select today or a future date.");
            return;
        }

        if (startTimeInput && !startTimeInput.value) {
            if (window.innerWidth < 1024) setMobilePhase(2);
            startTimeInput.focus();
            alert("Please select Start Time.");
            return;
        }

        if (endTimeInput && !endTimeInput.value) {
            if (window.innerWidth < 1024) setMobilePhase(2);
            endTimeInput.focus();
            alert("Please select End Time.");
            return;
        }

        if (venueInput && !venueInput.value.trim()) {
            if (window.innerWidth < 1024) setMobilePhase(2);
            venueInput.focus();
            alert("Please enter Venue.");
            return;
        }

        const title = titleInput.value;
        const venue = venueInput.value;
        const dateRaw = dateInput.value;
        const sTime = formatTime(startTimeInput.value);
        const eTime = formatTime(endTimeInput.value);

        if (type === 'flag_raising') {
            document.getElementById('flagModalTitle').innerText = title;
            document.getElementById('flagModalVenue').innerText = venue;
            document.getElementById('flagModalDateTime').innerText = `${dateRaw} @ ${sTime} - ${eTime}`;

            const photoPreview = document.getElementById('flagPhotoPreview').src;
            document.getElementById('flagModalImg').src = photoPreview || DEFAULT_IMG;

            document.getElementById('flagPreviewModal').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            return;
        }

        const orgAcr = document.getElementById('reqOrg').value;
        const fullOrgText = getOrgFullName(orgAcr);
        const desc = document.getElementById('evtDesc').value;

        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date().toLocaleDateString('en-US', options);
        const formattedDate = new Date(dateRaw).toLocaleDateString('en-US', options);

        const commonHeader = `
            <p class="mb-6 font-bold">${today}</p>
            <p class="mb-6 leading-tight"><strong>Dr. EDWIN G. MALABUYOC</strong><br>Director<br>This Campus</p>
            <p class="mb-6 leading-tight">Thru/Attn: &nbsp; &nbsp;<strong>ANNABEL S. JANORAS</strong><br>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;Head of Students Services<br>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;This Campus</p>
        `;

        const commonFooter = `
            <p class="mb-8">Respectfully yours,</p>
            <div class="mb-8">
                <p class="font-bold uppercase mb-0">${document.getElementById('reqName').value}</p>
                <p class="mt-0">${orgAcr} President</p>
            </div>
            <div>
                <p class="mb-6">Noted by:</p>
                <p class="font-bold uppercase mb-0">${document.getElementById('advName').value}</p>
                <p class="mt-0">${orgAcr} Adviser / Program Chair</p>
            </div>
        `;

        let mainBody = "";
        if (type === 'reschedule_event') {
            const origDateRaw = document.getElementById('origDate').value;
            const formattedOrigDate = origDateRaw ? new Date(origDateRaw).toLocaleDateString('en-US', options) : "(Original Date)";
            const reason = document.getElementById('reschedReason').value || "unforeseen circumstances";
            document.getElementById('tab-main-label').innerText = "Reschedule Letter";

            mainBody = `
                <p class="mb-6">Re: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <strong>Scheduling of Organizational Student Activity</strong></p>
                <p class="mb-4 text-justify indent-8">We hope this letter finds you well. ${fullOrgText} respectfully requests a rescheduling of our upcoming event entitled <strong>"${title}"</strong>. The event was originally set for ${formattedOrigDate}.</p>
                <p class="mb-4 text-justify indent-8">We propose moving the event to <strong>${formattedDate}</strong>, from <strong>${sTime} to ${eTime}</strong> at <strong>${venue}</strong>.</p>
                <p class="mb-8 text-justify indent-8">This request is made ${reason}. ${desc}</p>
            `;
        } else {
            document.getElementById('tab-main-label').innerText = "Request Letter";
            mainBody = `
                <p class="mb-6">Re: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <strong>Approval of Organizational Student Activity</strong></p>
                <p class="mb-4 text-justify indent-8">To comply with the commitment to UPHOLD E2E Program, ${fullOrgText} will be conducting an activity entitled <strong>"${title}"</strong>.</p>
                <p class="mb-4 text-justify indent-8">The activity is scheduled for <strong>${formattedDate}</strong>, <strong>${sTime} to ${eTime}</strong> at <strong>${venue}</strong>.</p>
                <p class="mb-8 text-justify indent-8">${desc}</p>
            `;
        }

        const target = document.getElementById('excuseClasses').value || "all affected students";
        const equipment = document.getElementById('reqEquipment').value || "the necessary equipment";
        const excuseBody = `
            <p class="mb-6">Re: &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <strong>Excuse and Request Usage of Equipment/Facility</strong></p>
            <p class="mb-4 text-justify indent-8">${fullOrgText} is organizing an event <strong>"${title}"</strong> on ${formattedDate} at ${venue}.</p>
            <p class="mb-8 text-justify indent-8">We respectfully request the excusal of <strong>${target}</strong> whose classes will be affected, and we also request usage of the aforementioned facility, together with <strong>${equipment}</strong>.</p>
        `;

        document.getElementById('content-main').innerHTML = commonHeader + mainBody + commonFooter;
        document.getElementById('content-excuse').innerHTML = commonHeader + excuseBody + commonFooter;

        // Reset tab styles and hide content completely via classes
        const mainTab = document.getElementById(`tab-main`);
        const excuseTab = document.getElementById(`tab-excuse`);
        mainTab.classList.remove('border-pup-maroon', 'bg-maroon-50', 'dark:bg-maroon-900/10');
        mainTab.classList.add('border-gray-200', 'dark:border-gray-800');
        excuseTab.classList.remove('border-pup-maroon', 'bg-maroon-50', 'dark:bg-maroon-900/10');
        excuseTab.classList.add('border-gray-200', 'dark:border-gray-800');

        const paperContainer = document.getElementById('printPaper');
        paperContainer.classList.add('document-preview-container');
        paperContainer.classList.remove('active');
        paperContainer.style.opacity = ""; // Let CSS handle it
        paperContainer.style.transform = ""; // Let CSS handle it
        document.getElementById('content-main').classList.add('hidden');
        document.getElementById('content-excuse').classList.add('hidden');

        if (type === 'reschedule_event') {
            excuseTab.classList.add('hidden'); // Hide Excuse tab for reschedules
            mainTab.classList.add('col-span-2'); // Make main tab span full width
        } else {
            excuseTab.classList.remove('hidden');
            mainTab.classList.remove('col-span-2');
        }

        document.getElementById('letterModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Auto-open the main letter tab
        switchDocTab('main', 'preview');
    }

    function closeLetterModal() { document.getElementById('letterModal').classList.add('hidden'); document.body.style.overflow = ''; }

    async function downloadWord(btn) {
        if (!btn) btn = document.getElementById('btnDownloadDocs');
        const originalText = btn.innerHTML;
        const type = document.getElementById('letterType').value;

        if (type === 'reschedule_event') {
            btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Generating...';
        } else {
            btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Zipping...';
        }
        btn.disabled = true;

        const orgAcr = document.getElementById('reqOrg').value;
        const fullOrgText = getOrgFullName(orgAcr);
        const sTime = formatTime(document.getElementById('evtStartTime').value);
        const eTime = formatTime(document.getElementById('evtEndTime').value);

        const payload = {
            docType: type,
            fullOrgName: fullOrgText,
            letDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            letTitle: document.getElementById('evtTitle').value,
            letDesc: document.getElementById('evtDesc').value,
            letEvtDate: document.getElementById('evtDate').value ? new Date(document.getElementById('evtDate').value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "",
            letEvtTime: `${sTime} to ${eTime}`,
            letVenue: document.getElementById('evtVenue').value,
            sigName: document.getElementById('reqName').value,
            sigOrg: document.getElementById('reqOrg').value,
            sigAdviser: document.getElementById('advName').value,
            targetClasses: document.getElementById('excuseClasses').value,
            reqEquipment: document.getElementById('reqEquipment').value,
            origDate: document.getElementById('origDate').value ? new Date(document.getElementById('origDate').value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "",
            reschedReason: document.getElementById('reschedReason').value
        };

        try {
            const response = await fetch('/organizer/download-proposal-doc/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': CSRF_TOKEN },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const data = await response.json();
                    alert("Error: " + data.message);
                } else {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    if (type === 'reschedule_event') {
                        a.download = `Reschedule_Letter_${payload.sigOrg}.docx`;
                    } else {
                        a.download = `Event_Documents_${payload.sigOrg}.zip`;
                    }
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                }
            } else { alert("Error generating document. Server returned an error."); }
        } catch (e) { alert("Connection error."); }
        finally { btn.innerHTML = originalText; btn.disabled = false; }
    }

    async function submitToAdviser(btn) {
        const evtDateVal = document.getElementById('evtDate') ? document.getElementById('evtDate').value : '';
        const now = new Date();
        const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        if (!evtDateVal || evtDateVal < localToday) {
            alert("Event date cannot be in the past. Please select today or a future date.");
            return;
        }

        if (!btn || !btn.innerHTML) btn = document.getElementById('btnSubmitToAdviser');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Sending...';
        btn.disabled = true;

        const type = document.getElementById('letterType').value;
        const descBase = (document.getElementById('evtDesc').value || "").trim();
        const target = document.getElementById('excuseClasses').value || "None";
        const equip = document.getElementById('reqEquipment').value || "None";

        let finalDesc = "";
        if (type === 'reschedule_event') {
            const reason = document.getElementById('reschedReason').value || "unforeseen circumstances";
            const orig = document.getElementById('origDate').value || "Unknown Date";
            const origId = document.getElementById('origEventId').value || "None";
            finalDesc = `[RESCHEDULE] Reason: ${reason} | Original: ${orig} | OrigID: ${origId} | Target: ${target} | Equipment: ${equip} | Desc: ${descBase}`;
        } else {
            finalDesc = `[NEW EVENT] Target: ${target} | Equipment: ${equip} | Desc: ${descBase}`;
        }

        let formData = new FormData();
        formData.append('csrfmiddlewaretoken', CSRF_TOKEN);
        formData.append('requester_name', document.getElementById('reqName').value);
        formData.append('adviser_name', document.getElementById('advName').value);
        formData.append('title', document.getElementById('evtTitle').value);
        formData.append('date', document.getElementById('evtDate').value);
        formData.append('start_time', document.getElementById('evtStartTime').value);
        formData.append('end_time', document.getElementById('evtEndTime').value);
        formData.append('venue', document.getElementById('evtVenue').value);
        formData.append('description', finalDesc);

        // 🟢 Audience & Evaluation Settings
        const targetAudienceVal = document.getElementById('targetAudience') ? document.getElementById('targetAudience').value : 'ALL';
        const allowedOrgsVal = document.getElementById('allowedOrgsInput') ? document.getElementById('allowedOrgsInput').value : 'ALL';
        const hasEvalVal = document.getElementById('hasEvaluation') ? document.getElementById('hasEvaluation').value : 'true';
        const attendanceScopeVal = document.getElementById('attendanceScope') ? document.getElementById('attendanceScope').value : 'CAMPUS_ONLY';

        if (targetAudienceVal === 'SPECIFIC' && (!allowedOrgsVal || allowedOrgsVal.trim() === '')) {
            alert('Please select at least one organization for specific event availability.');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }

        formData.append('target_audience', targetAudienceVal);
        formData.append('allowed_orgs', allowedOrgsVal);
        formData.append('has_evaluation', hasEvalVal);
        formData.append('attendance_scope', attendanceScopeVal);

        try {
            const response = await fetch('/organizer/api/submit-proposal/', { method: 'POST', body: formData });
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (data.status === 'success') {
                    closeLetterModal();
                    document.getElementById('successModal').classList.remove('hidden');
                } else { alert("Error: " + data.message); btn.innerHTML = originalText; btn.disabled = false; }
            } else {
                alert("Server Error. Please check console.");
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (error) {
            alert("Connection error.");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    function openViewModal(id) {
        const ev = allEvents.find(e => e.id === id);
        if (!ev) return;

        const rawDesc = ev.description || "";
        const type = rawDesc.includes("[RESCHEDULE]") ? 'reschedule_event' : 'new_event';

        const data = {};
        rawDesc.split(' | ').forEach(p => {
            const [k, ...v] = p.split(': ');
            if (v.length > 0) data[k.trim()] = v.join(': ').trim();
        });

        const actualDesc = data['Desc'] || rawDesc;
        const target = data['Target'] || "N/A";
        const equipment = data['Equipment'] || "N/A";
        const reason = data['Reason'] || "N/A";
        const origDate = data['Original'] || "N/A";

        const commonHeader = `
            <p class="mb-6 font-bold">${ev.date}</p>
            <p class="mb-6 leading-tight"><strong>Dr. EDWIN G. MALABUYOC</strong><br>Director<br>This Campus</p>
        `;

        const commonFooter = `
            <p class="mt-8">Respectfully yours,</p>
            <p class="font-bold uppercase">${ev.requester_name}</p>
            <p class="mb-6">${ev.org} President</p>
            <p>Noted by:</p>
            <p class="font-bold uppercase">${ev.adviser_name}</p>
            <p>${ev.org} Adviser</p>
        `;

        let mainBody = "";
        if (type === 'reschedule_event') {
            document.getElementById('view-tab-main-label').innerText = "Reschedule Letter";
            mainBody = `<p class="mb-4"><strong>Re: Scheduling of Activity</strong></p><p class="mb-4">We request rescheduling "${ev.title}" originally set for ${origDate}.</p><p class="mb-4">New Schedule: ${ev.date} at ${formatTime(ev.start_time)}</p><p>Reason: ${reason}</p><p>${actualDesc}</p>`;
        } else {
            document.getElementById('view-tab-main-label').innerText = "Request Letter";
            mainBody = `<p class="mb-4"><strong>Re: Approval of Activity</strong></p><p class="mb-4">Proposal for "${ev.title}" on ${ev.date} at ${ev.venue}.</p><p>${actualDesc}</p>`;
        }

        const excuseBody = `<p class="mb-4"><strong>Re: Excuse & Usage</strong></p><p class="mb-4">Requesting excuse for: <strong>${target}</strong></p><p>Equipment: <strong>${equipment}</strong></p>`;

        document.getElementById('view-content-main').innerHTML = commonHeader + mainBody + commonFooter;
        document.getElementById('view-content-excuse').innerHTML = commonHeader + excuseBody + commonFooter;

        // Reset tab styles and hide content for view modal
        const mainTab = document.getElementById(`view-tab-main`);
        const excuseTab = document.getElementById(`view-tab-excuse`);
        mainTab.classList.remove('border-pup-maroon', 'bg-maroon-50', 'dark:bg-maroon-900/10');
        mainTab.classList.add('border-gray-200', 'dark:border-gray-800');
        excuseTab.classList.remove('border-pup-maroon', 'bg-maroon-50', 'dark:bg-maroon-900/10');
        excuseTab.classList.add('border-gray-200', 'dark:border-gray-800');

        const paperContainer = document.getElementById('view-content-main').parentElement;
        paperContainer.classList.add('document-preview-container');
        paperContainer.classList.remove('active');
        paperContainer.style.opacity = "";
        paperContainer.style.transform = "";
        document.getElementById('view-content-main').classList.add('hidden');
        document.getElementById('view-content-excuse').classList.add('hidden');

        if (type === 'reschedule_event') {
            excuseTab.classList.add('hidden');
            mainTab.classList.add('col-span-2');
        } else {
            excuseTab.classList.remove('hidden');
            mainTab.classList.remove('col-span-2');
        }

        document.getElementById('viewModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Auto-open the main letter tab
        switchDocTab('main', 'view');
    }

    function closeViewModal() { document.getElementById('viewModal').classList.add('hidden'); document.body.style.overflow = ''; }

    function cancelEdit() { window.location.reload(); }
