const { createApp, ref, computed, onMounted, nextTick } = Vue;
    createApp({
        delimiters: ['[[', ']]'],
        setup() {
            const isLoading = ref(true);
            const isModalOpen = ref(false);
            const isCalendarOpen = ref(false);
            const selectedCalendarEvent = ref(null);
            const isHistoryMode = ref(false);
            const selectedEvent = ref(null);
            const actionLoading = ref(false);
            
            const showSuccessMsg = ref(false);
            const statusMessage = ref('');

            const searchPending = ref('');
            const searchHistory = ref('');
            const histOrg = ref('All');
            const histStatus = ref('All');
            const histMonth = ref('');

            // Custom Dropdown State & Options
            const isOrgDropdownOpen = ref(false);
            const isStatusDropdownOpen = ref(false);

            const orgOptions = [
                { value: 'All', label: 'All Organizations' },
                { value: 'ITO', label: 'ITO' },
                { value: 'ITS', label: 'ITS' },
                { value: 'YEO', label: 'YEO' },
                { value: 'FTO', label: 'FTO' },
                { value: 'PAS', label: 'PAS' },
                { value: 'CAO', label: 'CAO' },
                { value: 'NEWSETTE', label: 'NEWSETTE' },
                { value: 'PRIDEVerse', label: 'BahaghariU' },
                { value: 'ROTC', label: 'ROTC' },
                { value: 'PUSO', label: 'PUSO' },
                { value: 'SSC', label: 'SSC' }
            ];

            const statusOptions = [
                { value: 'All', label: 'All Records' },
                { value: 'FINAL ADMIN REVIEW', label: 'Final Admin Review' },
                { value: 'APPROVED', label: 'Published (Approved)' }
            ];

            const histOrgLabel = computed(() => orgOptions.find(o => o.value === histOrg.value)?.label || 'All Organizations');
            const histStatusLabel = computed(() => statusOptions.find(o => o.value === histStatus.value)?.label || 'All Records');

            const toggleOrgDropdown = () => {
                isOrgDropdownOpen.value = !isOrgDropdownOpen.value;
                isStatusDropdownOpen.value = false; // close the other
            };
            const toggleStatusDropdown = () => {
                isStatusDropdownOpen.value = !isStatusDropdownOpen.value;
                isOrgDropdownOpen.value = false; // close the other
            };

            const selectHistOrg = (val) => {
                histOrg.value = val;
                isOrgDropdownOpen.value = false;
            };
            const selectHistStatus = (val) => {
                histStatus.value = val;
                isStatusDropdownOpen.value = false;
            };

            const loadingStep = ref(0);
            const activeTab = ref('main');
            const selectedDocUrl = ref('');
            const mobileDropdownOpen = ref(false);

            const isRejecting = ref(false);
            const rejectReason = ref('');

            const isRescheduling = ref(false);
            const rescheduleDate = ref('');
            const rescheduleTime = ref('');
            const rescheduleEndTime = ref('');

            const isDocViewerOpen = ref(false);
            const viewedDocTitle = ref('');
            const viewedDocUrl = ref('');

            let pendingArr = [];
            let historyArr = [];
            try {
                const pendNode = document.getElementById('events-data');
                const histNode = document.getElementById('history-data');
                if(pendNode) {
                    const raw = pendNode.textContent;
                    pendingArr = JSON.parse(raw.startsWith('"') ? JSON.parse(raw) : raw);
                }
                if(histNode) {
                    const raw = histNode.textContent;
                    historyArr = JSON.parse(raw.startsWith('"') ? JSON.parse(raw) : raw);
                }
            } catch(e) { console.error("Data Parse Error", e); }
            
            const pendingEvents = ref(pendingArr);
            const historyEvents = ref(historyArr);

            // Calendar Logic
            const currentMonth = ref(new Date().getMonth());
            const currentYear = ref(new Date().getFullYear());
            
            const selectedFilterDate = ref(null);
            const selectedFilterMonthMode = ref(false);

            let calendarInstance = null;

            const openCalendar = (e) => {
                if (e && e.currentTarget) calOrigin.value = e.currentTarget.getBoundingClientRect();
                else calOrigin.value = null;
                isCalendarOpen.value = true;
                animateModalOpen('calendar-modal-box', 'calendar-backdrop', calOrigin);
                
                nextTick(() => {
                    if (!calendarInstance) {
                        const calEl = document.getElementById('admin-calendar');
                        calendarInstance = new FullCalendar.Calendar(calEl, {
                            initialView: 'dayGridMonth',
                            headerToolbar: {
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek'
                            },
                            themeSystem: 'standard',
                            dateClick: function(info) {
                                const d = new Date(info.dateStr);
                                selectedFilterDate.value = d.toDateString();
                                selectedFilterMonthMode.value = false;
                                closeCalendar();
                            },
                            datesSet: function(info) {
                                const midDate = new Date((info.start.getTime() + info.end.getTime()) / 2);
                                currentMonth.value = midDate.getMonth();
                                currentYear.value = midDate.getFullYear();
                                selectedFilterMonthMode.value = true;
                                selectedFilterDate.value = null;
                            }
                        });
                        calendarInstance.render();
                    } else {
                        calendarInstance.render(); // Ensure it adjusts size if needed
                    }
                    setTimeout(() => {
                        if (calendarInstance) calendarInstance.updateSize();
                    }, 500);
                });
            };

            onMounted(() => {
                setTimeout(() => { isLoading.value = false; }, 800);
                window.addEventListener('click', (e) => {
                    if (!e.target.closest('.custom-dd')) {
                        isOrgDropdownOpen.value = false;
                        isStatusDropdownOpen.value = false;
                    }
                });
            });

            const filteredPending = computed(() => {
                if (!pendingEvents.value) return [];
                return pendingEvents.value.filter(e => {
                    const searchLower = searchPending.value.toLowerCase();
                    return e.title.toLowerCase().includes(searchLower) || e.org.toLowerCase().includes(searchLower);
                });
            });

            const filteredHistory = computed(() => {
                if (!historyEvents.value) return [];
                return historyEvents.value.filter(e => {
                    const searchLower = searchHistory.value.toLowerCase();
                    const matchSearch = e.title.toLowerCase().includes(searchLower) || e.org.toLowerCase().includes(searchLower);
                    const matchOrg = histOrg.value === 'All' || e.org === histOrg.value || (['PRIDEVerse', 'PRIDE', 'BahaghariU'].includes(histOrg.value) && ['PRIDEVerse', 'PRIDE', 'BahaghariU'].includes(e.org));
                    const matchStatus = histStatus.value === 'All' || e.status === histStatus.value;
                    
                    let matchMonth = true;
                    if(histMonth.value) matchMonth = e.date.includes(histMonth.value);
                    
                    let matchCalendar = true;
                    if (selectedFilterDate.value) {
                        const evDate = new Date(e.date);
                        matchCalendar = evDate.toDateString() === selectedFilterDate.value;
                    } else if (selectedFilterMonthMode.value) {
                        const evDate = new Date(e.date);
                        matchCalendar = evDate.getMonth() === currentMonth.value && evDate.getFullYear() === currentYear.value;
                    }

                    return matchSearch && matchOrg && matchStatus && matchMonth && matchCalendar;
                });
            });

            // 📂 DYNAMIC DOCUMENT LOGIC 📂
            const currentDocCount = computed(() => {
                if (!selectedEvent.value) return 0;
                return selectedEvent.value.requirement_mode ? parseInt(selectedEvent.value.requirement_mode) : 4;
            });

            const activeDocs = computed(() => {
                if (!selectedEvent.value) return [];
                const e = selectedEvent.value;
                const mode = currentDocCount.value;

                let docs = [];
                if (mode === 2) {
                    if (e.letter_of_reschedule || e.letter_url) 
                        docs.push({ label: 'Letter of Reschedule', icon: 'ph-file-text', url: e.letter_of_reschedule || e.letter_url });
                    if (e.reschedule_cover_photo || e.event_cover_photo)
                        docs.push({ label: 'Reschedule Cover Photo', icon: 'ph-image', url: e.reschedule_cover_photo || e.event_cover_photo });
                } else {
                    if (e.letter_url) docs.push({ label: 'Signed Request Letter', icon: 'ph-file-text', url: e.letter_url }); 
                    if (e.permit_url) docs.push({ label: 'Signed Permit', icon: 'ph-certificate', url: e.permit_url });
                    if (e.equipment_url) docs.push({ label: 'Equipment Form', icon: 'ph-toolbox', url: e.equipment_url });
                    if (e.event_cover_photo) docs.push({ label: 'Event Cover Photo', icon: 'ph-image', url: e.event_cover_photo });
                }
                return docs;
            });

            const parsedDescription = computed(() => {
                if (!selectedEvent.value) return { type: 'standard', originalDesc: '' };
                let desc = selectedEvent.value.description || "";

                if (desc.includes("[RESCHEDULE]")) {
                    let reasonStr = "Administrative conflicts";
                    let origDateStr = "N/A";
                    let origDescStr = "";
                    desc.split('|').forEach(part => {
                        if(part.includes("Reason:")) reasonStr = part.split('Reason:')[1]?.trim() || reasonStr;
                        if(part.includes("Original:")) origDateStr = part.split('Original:')[1]?.trim() || origDateStr;
                        if(part.includes("Desc:")) origDescStr = part.split('Desc:')[1]?.trim() || origDescStr;
                    });
                    return { type: 'reschedule', reason: reasonStr, origDate: origDateStr, originalDesc: origDescStr };
                }
                else if (desc.includes("[NEW EVENT]")) {
                    let targetStr = "N/A";
                    let equipStr = "N/A";
                    let origDescStr = "";
                    desc.split('|').forEach(part => {
                        if(part.includes("Target:")) targetStr = part.split('Target:')[1]?.trim() || targetStr;
                        if(part.includes("Equipment:")) equipStr = part.split('Equipment:')[1]?.trim() || equipStr;
                        if(part.includes("Desc:")) origDescStr = part.split('Desc:')[1]?.trim() || origDescStr;
                    });
                    return { type: 'new_event', target: targetStr, equipment: equipStr, originalDesc: origDescStr }; 
                }
                else {
                    return { type: 'standard', originalDesc: desc };
                }
            });

            const animateModalOpen = (boxId, backdropId, originRef) => {
                nextTick(() => {
                    const box = document.getElementById(boxId);
                    const backdrop = document.getElementById(backdropId);
                    
                    if (backdrop) {
                        backdrop.style.opacity = '0';
                        backdrop.style.transition = 'none';
                        requestAnimationFrame(() => {
                            void backdrop.offsetWidth;
                            backdrop.style.transition = 'opacity 0.3s ease-out';
                            backdrop.style.opacity = '1';
                        });
                    }

                    if (box) {
                        if (originRef.value) {
                            const rect = originRef.value;
                            const startX = rect.left + rect.width / 2 - window.innerWidth / 2;
                            const startY = rect.top + rect.height / 2 - window.innerHeight / 2;
                            const scaleX = rect.width / window.innerWidth;
                            const scaleY = rect.height / window.innerHeight;
                            let scale = Math.min(scaleX, scaleY) * 0.8;
                            if(scale < 0.1) scale = 0.1;

                            box.style.transform = `translate(${startX}px, ${startY}px) scale(${scale})`;
                            box.style.opacity = '0';
                            box.style.transition = 'none';
                        } else {
                            box.style.transform = 'scale(0.95) translateY(20px)';
                            box.style.opacity = '0';
                            box.style.transition = 'none';
                        }
                        
                        requestAnimationFrame(() => {
                            void box.offsetWidth;
                            box.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2), opacity 0.3s ease-out';
                            box.style.transform = 'translate(0, 0) scale(1)';
                            box.style.opacity = '1';
                        });
                    }
                });
            };

            const animateModalClose = (boxId, backdropId, originRef, closeCallback) => {
                const box = document.getElementById(boxId);
                const backdrop = document.getElementById(backdropId);
                
                if (backdrop) {
                    backdrop.style.transition = 'opacity 0.3s ease-in';
                    backdrop.style.opacity = '0';
                }

                if (box) {
                    if (originRef.value) {
                        const rect = originRef.value;
                        const startX = rect.left + rect.width / 2 - window.innerWidth / 2;
                        const startY = rect.top + rect.height / 2 - window.innerHeight / 2;
                        const scaleX = rect.width / window.innerWidth;
                        const scaleY = rect.height / window.innerHeight;
                        let scale = Math.min(scaleX, scaleY) * 0.8;
                        if(scale < 0.1) scale = 0.1;

                        box.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-in';
                        box.style.transform = `translate(${startX}px, ${startY}px) scale(${scale})`;
                        box.style.opacity = '0';
                    } else {
                        box.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
                        box.style.transform = 'scale(0.95) translateY(20px)';
                        box.style.opacity = '0';
                    }
                }
                
                setTimeout(closeCallback, 300);
            };

            const originRect = ref(null);
            const docOrigin = ref(null);
            const calOrigin = ref(null);



            const openModal = (event, historyMode, domEvent) => { 
                if (domEvent && domEvent.currentTarget) {
                    originRect.value = domEvent.currentTarget.getBoundingClientRect();
                } else {
                    originRect.value = null;
                }
                selectedEvent.value = event; 
                isHistoryMode.value = historyMode;
                isRejecting.value = false;
                rejectReason.value = '';
                isRescheduling.value = false;
                showSuccessMsg.value = false;
                statusMessage.value = '';
                actionLoading.value = false;
                loadingStep.value = 0;
                activeTab.value = 'main';
                isModalOpen.value = true; 
                document.body.style.overflow = 'hidden';
                animateModalOpen('main-modal-box', 'main-backdrop', originRect);
            };

            const closeModal = () => { 
                animateModalClose('main-modal-box', 'main-backdrop', originRect, () => {
                    isModalOpen.value = false; 
                    document.body.style.overflow = '';
                    selectedEvent.value = null; 
                    showSuccessMsg.value = false;
                    loadingStep.value = 0;
                });
            };

            const viewActualDoc = (title, url, domEvent) => {
                if (domEvent && domEvent.currentTarget) docOrigin.value = domEvent.currentTarget.getBoundingClientRect();
                else docOrigin.value = null;
                viewedDocTitle.value = title;
                viewedDocUrl.value = url || '';
                isDocViewerOpen.value = true;
                animateModalOpen('doc-viewer-box', 'doc-viewer-backdrop', docOrigin);
            };
            const closeDocViewer = () => { 
                animateModalClose('doc-viewer-box', 'doc-viewer-backdrop', docOrigin, () => {
                    isDocViewerOpen.value = false; 
                });
            };

            const getCookie = (name) => {
                let cookieValue = null;
                if (document.cookie && document.cookie !== '') {
                    const cookies = document.cookie.split(';');
                    for (let i = 0; i < cookies.length; i++) {
                        const cookie = cookies[i].trim();
                        if (cookie.substring(0, name.length + 1) === (name + '=')) {
                            cookieValue = decodeURIComponent(cookie.substring(name.length + 1)); break;
                        }
                    }
                }
                return cookieValue;
            };

            const updateEventStatus = async (status, payloadData = {}) => {
                actionLoading.value = true;
                loadingStep.value = 1;
                
                try {
                    // Artificial delays to show steps to admin
                    await new Promise(r => setTimeout(r, 800));
                    loadingStep.value = 2;
                    
                    const payload = { event_id: selectedEvent.value.id, action: status, ...payloadData };
                    const response = await fetch("/admin/api/event-action/", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                        body: JSON.stringify(payload)
                    });
                    const data = await response.json();
                    
                    if(data.status === 'success') {
                        if (selectedEvent.value.status === 'FINAL ADMIN REVIEW') {
                            loadingStep.value = 3;
                            await new Promise(r => setTimeout(r, 1000));
                        }
                        
                        loadingStep.value = 4;
                        await new Promise(r => setTimeout(r, 800));
                        loadingStep.value = 5; // Completed

                        statusMessage.value = data.message;
                        showSuccessMsg.value = true;
                        actionLoading.value = false;

                        // UPDATE LOCAL STATE
                        if(status === 'reschedule') {
                            let ev = historyEvents.value.find(e => e.id === selectedEvent.value.id);
                            if(ev) {
                                ev.date = payloadData.event_date;
                                ev.time = payloadData.event_time;
                            }
                        } else {
                            let updatedEvent = { ...selectedEvent.value };
                            if(status === 'approve') {
                                if (selectedEvent.value.status === 'FINAL ADMIN REVIEW') {
                                    updatedEvent.status = 'APPROVED';
                                } else {
                                    updatedEvent.status = 'ADMIN APPROVED';
                                }
                            } else if(status === 'reject') {
                                updatedEvent.status = 'REJECTED';
                                updatedEvent.remarks = payloadData.remarks;
                            }
                            
                            // Remove from pending if it moved out of Admin states
                            if (updatedEvent.status === 'REJECTED' || updatedEvent.status === 'ADMIN APPROVED' || updatedEvent.status === 'APPROVED') {
                                pendingEvents.value = pendingEvents.value.filter(e => e.id !== selectedEvent.value.id);
                            }
                            
                            // Update or Add to history
                            let histIdx = historyEvents.value.findIndex(e => e.id === updatedEvent.id);
                            if (histIdx !== -1) {
                                historyEvents.value[histIdx] = updatedEvent;
                            } else {
                                historyEvents.value.unshift(updatedEvent);
                            }
                        }
                        
                        setTimeout(() => { if(isModalOpen.value) closeModal(); }, 2500);

                    } else { 
                        alert(data.message); 
                        actionLoading.value = false;
                    }
                } catch(err) { 
                    alert('Error connecting to server.'); 
                    actionLoading.value = false;
                }
            };

            const approveEvent = () => updateEventStatus('approve');

            const initiateReschedule = () => {
                isRescheduling.value = true;
                rescheduleDate.value = '';
                rescheduleTime.value = '';
                rescheduleEndTime.value = '';
            };
            const cancelReschedule = () => { isRescheduling.value = false; };
            const confirmReschedule = () => {
                if(!rescheduleDate.value || !rescheduleTime.value) { alert("Please select a new date and time."); return; }
                updateEventStatus('reschedule', { 
                    event_date: rescheduleDate.value, 
                    event_time: rescheduleTime.value,
                    event_end_time: rescheduleEndTime.value
                });
            };

            const initiateReject = () => { isRejecting.value = true; };
            const cancelReject = () => { isRejecting.value = false; rejectReason.value = ''; };
            const confirmReject = () => {
                if(rejectReason.value.trim() === '') { alert("Please provide a reason before confirming the rejection."); return; }
                updateEventStatus('reject', { remarks: rejectReason.value });
            };

            const closeCalendar = () => {
                animateModalClose('calendar-modal-box', 'calendar-backdrop', calOrigin, () => {
                    isCalendarOpen.value = false;
                });
            };

            return { 
                isLoading,
                pendingEvents, filteredPending, searchPending,
                historyEvents, filteredHistory, searchHistory, histOrg, histStatus, histMonth,
                isOrgDropdownOpen, isStatusDropdownOpen, orgOptions, statusOptions,
                histOrgLabel, histStatusLabel, toggleOrgDropdown, toggleStatusDropdown, selectHistOrg, selectHistStatus,
                isModalOpen, isHistoryMode, selectedEvent, actionLoading, 
                isRejecting, rejectReason, initiateReject, cancelReject, confirmReject,
                isRescheduling, rescheduleDate, rescheduleTime, rescheduleEndTime, initiateReschedule, cancelReschedule, confirmReschedule,
                isDocViewerOpen, viewedDocTitle, viewedDocUrl, viewActualDoc, closeDocViewer,
                openModal, closeModal, approveEvent,
                
                currentDocCount, activeDocs,
                showSuccessMsg, statusMessage,
                loadingStep, activeTab, selectedDocUrl, mobileDropdownOpen, parsedDescription,
                currentMonth, currentYear, openCalendar, selectedCalendarEvent,
                selectedFilterDate, selectedFilterMonthMode, isCalendarOpen, closeCalendar
            }
        }
    }).mount('#vue-admin-app');
