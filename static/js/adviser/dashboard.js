window.DJANGO_EVENTS_DATA = (function() {
    try {
        const el = document.getElementById('adviser-events-data');
        return el ? JSON.parse(el.textContent) : [];
    } catch(e) { return []; }
})();

window.DJANGO_CALENDAR_EVENTS_DATA = (function() {
    try {
        const el = document.getElementById('adviser-calendar-data');
        return el ? JSON.parse(el.textContent) : [];
    } catch(e) { return []; }
})();

const assignedOrgStr = (function() {
    try {
        const el = document.getElementById('adviser-assigned-org');
        return (el ? JSON.parse(el.textContent) : '') || 'All Organizations';
    } catch(e) { return 'All Organizations'; }
})();

document.addEventListener('DOMContentLoaded', () => {

        const { createApp, ref, computed, onMounted, nextTick } = Vue;
        
        window.appInstance = createApp({
            delimiters: ['[[', ']]'],
            setup() {
                const isLoading = ref(true);
                const isModalOpen = ref(false);
                const isModalClosing = ref(false);
                const isCalendarOpen = ref(false);
                const isCalendarClosing = ref(false);
                const selectedCalendarEvent = ref(null);
                const isEventDetailClosing = ref(false);
                let calendarInstance = null;

                const selectedEvent = ref(null);
                const actionLoading = ref(false);
                const searchQuery = ref('');
                const activeTab = ref('main');
                const mobileDropdownOpen = ref(false);

                const isRejecting = ref(false);
                const rejectReason = ref('');
                const assignedOrgAcronym = ref(assignedOrgStr);

                const isDocViewerOpen = ref(false);
                const viewedDocTitle = ref('');
                const viewedDocUrl = ref('');

                let parsedData = [];
                try {
                    parsedData = window.DJANGO_EVENTS_DATA || [];
                    if (typeof parsedData === 'string') {
                        parsedData = JSON.parse(parsedData);
                    }
                } catch(e) {
                    console.error("Adviser Dashboard: Error parsing events data:", e);
                }

                const events = ref(parsedData);

                let calendarParsedData = [];
                try {
                    calendarParsedData = window.DJANGO_CALENDAR_EVENTS_DATA || [];
                    if (typeof calendarParsedData === 'string') {
                        calendarParsedData = JSON.parse(calendarParsedData);
                    }
                } catch(e) {
                    console.error("Adviser Dashboard: Error parsing calendar data:", e);
                }
                const calendarEvents = ref(calendarParsedData);

                // FullCalendar Logic
                const openCalendarModal = (e) => {
                    if (e) {
                       document.documentElement.style.setProperty('--click-x', e.clientX + 'px');
                       document.documentElement.style.setProperty('--click-y', e.clientY + 'px');
                    }
                    isCalendarOpen.value = true;
                    isCalendarClosing.value = false;
                    document.body.style.overflow = 'hidden';
                    
                    nextTick(() => {
                        if (!calendarInstance) {
                            const calEl = document.getElementById('adviser-calendar');
                            calendarInstance = new FullCalendar.Calendar(calEl, {
                                initialView: 'dayGridMonth',
                                headerToolbar: {
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,timeGridWeek'
                                },
                                themeSystem: 'standard',
                                events: calendarEvents.value.map(evt => {
                                    let timeStr = "";
                                    let displayTime = "";
                                    if (evt.time || evt.start_time) {
                                        const t = evt.time || evt.start_time;
                                        displayTime = t;
                                        if (t.includes('M')) {
                                            const [time, modifier] = t.split(' ');
                                            if (time && modifier) {
                                                let [hours, minutes] = time.split(':');
                                                if (hours === '12') hours = '00';
                                                if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
                                                timeStr = 'T' + hours.toString().padStart(2, '0') + ':' + minutes + ':00';
                                            }
                                        } else {
                                            timeStr = 'T' + t;
                                        }
                                    }
                                    
                                    const org = evt.org || evt.organization || '';
                                    let bgColor = '#6b7280'; // gray for non-academic
                                    let textColor = '#ffffff';
                                    
                                    const orgUpper = org.toUpperCase();
                                    if (orgUpper === 'ITO') bgColor = '#800000'; // Maroon
                                    else if (orgUpper === 'BEED') bgColor = '#2563eb'; // Blue
                                    else if (orgUpper === 'YEO') { bgColor = '#eab308'; textColor = '#000000'; } // Yellow
                                    else if (orgUpper === 'ITS') bgColor = '#000000'; // Black
                                    else if (orgUpper === 'BPA') bgColor = '#dc2626'; // Red
                                    
                                    const displayTitle = `${displayTime} ${org}`.trim();
                                    
                                    return {
                                        id: evt.id,
                                        title: displayTitle,
                                        start: evt.date, // Just the date guarantees it fits exactly in 1 day box
                                        allDay: true,
                                        display: 'block', // Ensure events are solid blocks
                                        backgroundColor: bgColor,
                                        borderColor: bgColor,
                                        textColor: textColor,
                                        extendedProps: evt
                                    };
                                }),
                                eventClick: function(info) {
                                    openCalendarEventDetail(info.event, info.jsEvent);
                                },
                                height: '100%'
                            });
                        }
                        calendarInstance.render();
                        setTimeout(() => {
                            if (calendarInstance) calendarInstance.updateSize();
                        }, 400); // Wait for modal animation to finish
                    });
                };

                const closeCalendarModal = () => {
                    isCalendarClosing.value = true;
                    setTimeout(() => {
                        isCalendarOpen.value = false;
                        document.body.style.overflow = '';
                    }, 350);
                };

                const openCalendarEventDetail = (event, jsEvent) => {
                    if (jsEvent) {
                       const wrapper = document.getElementById('event-detail-wrapper');
                       if (wrapper) {
                           wrapper.style.setProperty('--click-x', jsEvent.clientX + 'px');
                           wrapper.style.setProperty('--click-y', jsEvent.clientY + 'px');
                       }
                    }
                    selectedCalendarEvent.value = event.extendedProps;
                    isEventDetailClosing.value = false;
                };

                const closeCalendarEventDetail = () => {
                    isEventDetailClosing.value = true;
                    setTimeout(() => {
                        selectedCalendarEvent.value = null;
                    }, 350);
                };

                const activeTabLabel = computed(() => {
                    if (!selectedEvent.value) return 'Request Letter';
                    const desc = selectedEvent.value.description || "";
                    if (desc.includes("[RESCHEDULE]")) return 'Reschedule Letter';
                    return 'Request Letter';
                });

                const switchDocTab = (tab) => {
                    activeTab.value = tab;
                    setTimeout(updateMobileScale, 100);
                };

                const updateMobileScale = () => {
                    const wrapper = document.querySelector('.document-wrapper');
                    const page = document.getElementById('document-preview-card');
                    
                    if (!wrapper || !page) return;

                    if (window.innerWidth <= 640) {
                        const wrapperWidth = wrapper.offsetWidth;
                        const pageWidth = 800; 
                        const scale = wrapperWidth / pageWidth;
                        
                        page.style.transform = `scale(${scale})`;
                        page.style.width = `${pageWidth}px`;
                        
                        const scaledHeight = page.offsetHeight * scale;
                        wrapper.style.height = `${scaledHeight}px`;
                        wrapper.style.minHeight = `${scaledHeight}px`;
                    } else {
                        page.style.transform = 'none';
                        page.style.width = '100%';
                        wrapper.style.height = 'auto';
                        wrapper.style.minHeight = '400px';
                    }
                };

                onMounted(() => {
                    setTimeout(() => {
                        isLoading.value = false;
                        window.addEventListener('resize', updateMobileScale);
                        
                        const urlParams = new URLSearchParams(window.location.search);
                        const eventId = urlParams.get('id');
                        if (eventId) {
                            const event = events.value.find(e => e.id == eventId);
                            if (event) {
                                openModal(event);
                            }
                        }
                    }, 500);
                });

                const filteredEvents = computed(() => {
                    if (!events.value || !Array.isArray(events.value)) return [];
                    return events.value.filter(e => {
                        const searchLower = searchQuery.value.toLowerCase();
                        return e.title.toLowerCase().includes(searchLower) || e.org.toLowerCase().includes(searchLower);
                    });
                });

                const cleanLetterDesc = (str) => {
                    if (!str) return "";
                    const trimmed = str.trim();
                    if (/^\(?(no description provided\.?)\)?$/i.test(trimmed)) return "";
                    return trimmed;
                };

                const parsedDescription = computed(() => {
                    if (!selectedEvent.value) return null;
                    let desc = selectedEvent.value.description || "";

                    if (desc.includes("[RESCHEDULE]")) {
                        let reasonStr = "Unforeseen circumstances";
                        let origDateStr = "N/A";
                        let origDescStr = "";

                        desc.split('|').forEach(part => {
                            if(part.includes("Reason:")) reasonStr = part.split('Reason:')[1].trim();
                            if(part.includes("Original:")) origDateStr = part.split('Original:')[1].trim();
                            if(part.includes("Desc:")) origDescStr = part.split('Desc:')[1].trim();
                        });

                        return { type: 'reschedule', reason: reasonStr, origDate: origDateStr, originalDesc: cleanLetterDesc(origDescStr) };
                    }
                    else if (desc.includes("[NEW EVENT]")) {
                        let targetStr = "N/A";
                        let equipStr = "N/A";
                        let origDescStr = "";

                        desc.split('|').forEach(part => {
                            if(part.includes("Target:")) targetStr = part.split('Target:')[1].trim();
                            if(part.includes("Equipment:")) equipStr = part.split('Equipment:')[1].trim();
                            if(part.includes("Desc:")) origDescStr = part.split('Desc:')[1].trim();
                        });

                        return { type: 'new_event', target: targetStr, equipment: equipStr, originalDesc: cleanLetterDesc(origDescStr) }; 
                    }
                    else {
                        return { type: 'standard', originalDesc: cleanLetterDesc(desc) };
                    }
                });

                const parsedCalendarDescription = computed(() => {
                    if (!selectedCalendarEvent.value) return null;
                    let desc = selectedCalendarEvent.value.description || "";
                    if (!desc) return null;

                    if (desc.includes("[RESCHEDULE]")) {
                        let origDescStr = desc;
                        desc.split('|').forEach(part => {
                            if(part.includes("Desc:")) origDescStr = part.split('Desc:')[1].trim();
                        });
                        return { originalDesc: origDescStr };
                    }
                    else if (desc.includes("[NEW EVENT]")) {
                        let origDescStr = desc;
                        desc.split('|').forEach(part => {
                            if(part.includes("Desc:")) origDescStr = part.split('Desc:')[1].trim();
                        });
                        return { originalDesc: origDescStr }; 
                    }
                    else {
                        return { originalDesc: desc };
                    }
                });

                const activeDocs = computed(() => {
                    if (!selectedEvent.value) return [];
                    const e = selectedEvent.value;
                    const mode = e.requirement_mode || 4;

                    if (mode == 2) {
                        return [
                            { label: 'Letter of Reschedule', icon: 'ph-file-text', url: e.letter_of_reschedule || e.letter_url },
                            { label: 'Event Reschedule Cover Photo', icon: 'ph-image', url: e.reschedule_cover_photo || e.event_cover_photo }
                        ];
                    } else {
                        return [
                            { label: 'Request Letter', icon: 'ph-file-text', url: e.letter_url }, 
                            { label: 'Event Permit', icon: 'ph-certificate', url: e.permit_url },
                            { label: 'Excuse Letter & Equipment', icon: 'ph-toolbox', url: e.equipment_url },
                            { label: 'Event Cover Photo', icon: 'ph-image', url: e.event_cover_photo }
                        ];
                    }
                });

                const generatedLetterTabs = computed(() => {
                    if (!selectedEvent.value) return [];
                    const tabs = [
                        { id: 'main', label: activeTabLabel.value }
                    ];
                    if (selectedEvent.value.requirement_mode != 2) {
                        tabs.push({ id: 'excuse', label: 'Excuse & Equipment' });
                    }
                    return tabs;
                });

                const openModal = (event, jsEvent) => {
                    if (jsEvent) {
                       const wrapper = document.getElementById('review-modal-wrapper');
                       if (wrapper) {
                           wrapper.style.setProperty('--click-x', jsEvent.clientX + 'px');
                           wrapper.style.setProperty('--click-y', jsEvent.clientY + 'px');
                       }
                    }
                    selectedEvent.value = event;
                    activeTab.value = 'main';
                    isRejecting.value = false;
                    rejectReason.value = '';
                    isModalOpen.value = true;
                    isModalClosing.value = false;
                    document.body.style.overflow = 'hidden';

                    nextTick(() => {
                        updateMobileScale();
                    });
                };

                const closeModal = () => {
                    isModalClosing.value = true;
                    setTimeout(() => {
                        isModalOpen.value = false;
                        document.body.style.overflow = '';
                        selectedEvent.value = null;
                    }, 350);
                };

                const viewActualDoc = (title, url) => {
                    viewedDocTitle.value = title;
                    viewedDocUrl.value = url || '';
                    isDocViewerOpen.value = true;
                };

                const closeDocViewer = () => {
                    isDocViewerOpen.value = false;
                };

                const updateEventStatus = async (status, remarks = "") => {
                    actionLoading.value = true;
                    try {
                        const response = await fetch("/adviser/api/action/", {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': (document.querySelector('[name=csrfmiddlewaretoken]') ? document.querySelector('[name=csrfmiddlewaretoken]').value : '') },   
                            body: JSON.stringify({ event_id: selectedEvent.value.id, action: status, remarks: remarks })
                        });
                        const data = await response.json();
                        if(data.status === 'success') {
                            events.value = events.value.filter(e => e.id !== selectedEvent.value.id);
                            if (status === 'approve') {
                                 const toast = document.getElementById('approval-success-toast');
                                 if (toast) {
                                    toast.classList.remove('translate-y-20', 'opacity-0');
                                    toast.classList.add('translate-y-0', 'opacity-100');
                                    setTimeout(() => {
                                        toast.classList.remove('translate-y-0', 'opacity-100');
                                        toast.classList.add('translate-y-20', 'opacity-0');
                                        window.location.reload();
                                    }, 2000);
                                 }
                            } else {
                                window.location.reload();
                            }
                            closeModal();
                        } else { alert(data.message); }
                    } catch(err) { alert('Error connecting to server.'); }
                    actionLoading.value = false;
                };

                const approveEvent = () => updateEventStatus('approve');
                const initiateReject = () => { isRejecting.value = true; };
                const cancelReject = () => { isRejecting.value = false; rejectReason.value = ''; };
                const confirmReject = () => {
                    if(rejectReason.value.trim() === '') { alert("Please provide a reason."); return; }
                    updateEventStatus('reject', rejectReason.value);
                };

                return {
                    isLoading, events, filteredEvents, searchQuery, isModalOpen, isModalClosing, selectedEvent,
                    actionLoading, isRejecting, rejectReason, activeTab, mobileDropdownOpen, activeTabLabel,
                    openModal, closeModal, approveEvent, initiateReject, cancelReject, confirmReject,
                    parsedDescription, parsedCalendarDescription, switchDocTab, assignedOrgAcronym,
                    isDocViewerOpen, viewedDocTitle, viewedDocUrl, viewActualDoc, closeDocViewer,
                    activeDocs, generatedLetterTabs, isCalendarOpen, isCalendarClosing, selectedCalendarEvent, isEventDetailClosing, openCalendarModal, closeCalendarModal, openCalendarEventDetail, closeCalendarEventDetail
                }
            }
        }).mount('#app');
    });
