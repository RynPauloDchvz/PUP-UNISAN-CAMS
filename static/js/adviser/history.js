window.DJANGO_HISTORY_DATA = (function() {
    try {
        const el = document.getElementById('adviser-history-data');
        return el ? JSON.parse(el.textContent) : [];
    } catch(e) { return []; }
})();

    if (typeof Vue === 'undefined') {
        document.write('<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"><\/script>');
    }

    document.addEventListener('DOMContentLoaded', () => {
        const { createApp, ref, computed, onMounted, nextTick } = Vue;

        window.appInstance = createApp({
            delimiters: ['[[', ']]'],
            setup() {
                const isLoading = ref(true);
                const searchQuery = ref('');
                const statusFilter = ref('All');
                const isFilterExpanded = ref(false);
                const isModalOpen = ref(false);
                const isModalClosing = ref(false);

                const selectFilter = (filter) => {
                    statusFilter.value = filter;
                    isFilterExpanded.value = false;
                };
                const selectedEvent = ref(null);
                const activeFileTab = ref('');
                const mobileDropdownOpen = ref(false);

                const isDocViewerOpen = ref(false);
                const viewedDocTitle = ref('');
                const viewedDocUrl = ref('');

                // Document Selection Logic
                const isSelectionMode = ref(false);
                const selectedEventIds = ref([]);
                const confirmDownloadModal = ref(false);
                const isDownloading = ref(false);
                const isMobileSearchActive = ref(false);
                const isMobileScreen = ref(window.innerWidth <= 640);
                
                const cancelSelection = () => {
                    isSelectionMode.value = false;
                    selectedEventIds.value = [];
                };

                const processDownload = async () => {
                    isDownloading.value = true;
                    try {
                        for (let i = 0; i < selectedEventIds.value.length; i++) {
                            const eventId = selectedEventIds.value[i];
                            const response = await fetch('/adviser/api/download-documents/', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRFToken': (document.querySelector('[name=csrfmiddlewaretoken]') ? document.querySelector('[name=csrfmiddlewaretoken]').value : '')
                                },
                                body: JSON.stringify({ event_ids: [eventId] })
                            });
                            
                            if (response.ok) {
                                let filename = `Event_${eventId}_documents.zip`;
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
                            } else {
                                const data = await response.json();
                                console.error('Error downloading files for event:', eventId, data);
                            }
                            
                            // Slight delay to ensure multiple downloads trigger smoothly
                            if (i < selectedEventIds.value.length - 1) {
                                await new Promise(r => setTimeout(r, 600));
                            }
                        }
                        
                        confirmDownloadModal.value = false;
                        cancelSelection();
                    } catch(e) {
                        console.error(e);
                        alert('An error occurred while downloading.');
                    } finally {
                        isDownloading.value = false;
                    }
                };

                let parsedData = [];
                try {
                    const rawData = window.DJANGO_HISTORY_DATA;
                    parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : (rawData || []);
                } catch(e) {
                    console.error("Error loading history data:", e);
                }
                
                const historyEvents = ref(parsedData);

                onMounted(() => {
                    setTimeout(() => {
                        isLoading.value = false;
                        window.addEventListener('resize', () => { isMobileScreen.value = window.innerWidth <= 640; });

                        const urlParams = new URLSearchParams(window.location.search);
                        const eventId = urlParams.get('id');
                        if (eventId) {
                            const event = historyEvents.value.find(e => e.id == eventId);
                            if (event) openModal(event);
                        }
                    }, 800);
                });

                const filteredEvents = computed(() => {
                    return historyEvents.value.filter(event => {
                        const sQuery = searchQuery.value.toLowerCase();
                        const matchSearch = (event.title || "").toLowerCase().includes(sQuery) || 
                                            (event.org || "").toLowerCase().includes(sQuery) ||
                                            (event.venue || "").toLowerCase().includes(sQuery);
                                            
                        let checkStatus = (event.status || "").toUpperCase();
                        let mappedStatus = 'In Progress';
                        
                        if(checkStatus === 'APPROVED') mappedStatus = 'Approved';
                        else if (checkStatus === 'REJECTED') mappedStatus = 'Rejected';

                        const matchStatus = statusFilter.value === 'All' || mappedStatus === statusFilter.value;
                        return matchSearch && matchStatus;
                    });
                });

                const currentDocCount = computed(() => {
                    if (!selectedEvent.value) return 0;
                    return selectedEvent.value.requirement_mode ? parseInt(selectedEvent.value.requirement_mode) : 4;
                });

                const activeDocs = computed(() => {
                    if (!selectedEvent.value) return [];
                    const e = selectedEvent.value;
                    const mode = currentDocCount.value;

                    if (mode === 2) {
                        return [
                            { label: 'Letter of Reschedule', icon: 'ph-file-text', url: e.letter_of_reschedule || e.letter_url },
                            { label: 'Reschedule Cover Photo', icon: 'ph-image', url: e.reschedule_cover_photo || e.event_cover_photo }
                        ];
                    } else {
                        return [
                            { label: 'Letter of Approval', icon: 'ph-file-text', url: e.letter_url }, 
                            { label: 'Signed Permit', icon: 'ph-certificate', url: e.permit_url },
                            { label: 'Excuse Letter & Equip', icon: 'ph-toolbox', url: e.equipment_url },
                            { label: 'Event Cover Photo', icon: 'ph-image', url: e.event_cover_photo }
                        ];
                    }
                });

                const hasUploadedDocs = computed(() => {
                    return activeDocs.value.some(d => !!d.url);
                });

                const openModal = (event, jsEvent) => {
                    if (jsEvent) {
                       const wrapper = document.getElementById('history-modal-wrapper');
                       if (wrapper) {
                           wrapper.style.setProperty('--click-x', jsEvent.clientX + 'px');
                           wrapper.style.setProperty('--click-y', jsEvent.clientY + 'px');
                       }
                    }
                    selectedEvent.value = event;
                    activeFileTab.value = activeDocs.value[0]?.label || '';
                    isModalOpen.value = true;
                    isModalClosing.value = false;
                    document.body.style.overflow = 'hidden';
                };

                const closeModal = () => {
                    isModalClosing.value = true;
                    setTimeout(() => {
                        isModalOpen.value = false;
                        document.body.style.overflow = '';
                        selectedEvent.value = null;
                        isModalClosing.value = false;
                    }, 400);
                };

                const viewActualDoc = (title, url) => {
                    viewedDocTitle.value = title;
                    viewedDocUrl.value = url || '';
                    isDocViewerOpen.value = true;
                };

                const closeDocViewer = () => {
                    isDocViewerOpen.value = false;
                };

                return {
                    isLoading, searchQuery, statusFilter, isFilterExpanded, selectFilter, filteredEvents,
                    isModalOpen, isModalClosing, selectedEvent, openModal, closeModal,
                    isDocViewerOpen, viewedDocTitle, viewedDocUrl, viewActualDoc, closeDocViewer,
                    currentDocCount, activeDocs, activeFileTab, mobileDropdownOpen, hasUploadedDocs,
                    isSelectionMode, selectedEventIds, confirmDownloadModal, isDownloading, isMobileSearchActive, isMobileScreen,
                    cancelSelection, processDownload
                }
            }
        }).mount('#app');
    });
