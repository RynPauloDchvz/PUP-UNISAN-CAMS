(function() {
    let savedSlidesList = [];
    let slidesState = [];
    let currentSlideshowMode = 'append'; // 'append' (Add Photos) | 'replace' (Replace Photos)
    let nextSlideTempId = 1;

    function createBlankSlideSlot() {
        return {
            uid: 'slide_slot_' + (nextSlideTempId++),
            id: null,
            imagePreview: '',
            existingImageUrl: '',
            file: null
        };
    }

    function mapServerSlidesToSlots(list) {
        if (!Array.isArray(list) || list.length === 0) {
            return [createBlankSlideSlot()];
        }
        return list.map((item, idx) => ({
            uid: 'slide_' + idx + '_' + (nextSlideTempId++),
            id: item.id !== undefined ? item.id : null,
            imagePreview: item.image || '',
            existingImageUrl: item.image || '',
            file: null
        }));
    }

    function loadInitialSlideshowFromDOM() {
        try {
            const rawEl = document.getElementById('initial-org-slideshow-data');
            const parsed = rawEl && rawEl.textContent ? JSON.parse(rawEl.textContent) : [];
            if (Array.isArray(parsed)) {
                savedSlidesList = parsed;
            }
        } catch (err) {
            console.error('Error parsing initial slideshow data:', err);
            savedSlidesList = [];
        }
        slidesState = [createBlankSlideSlot()];
        updateSlideshowCountsAndModeUI();
    }

    async function refreshSavedSlideshowFromServer() {
        try {
            const resp = await fetch('/organizer/api/get-slideshow/');
            if (!resp.ok) return;
            const data = await resp.json();
            if (data.status === 'success' && Array.isArray(data.slides)) {
                savedSlidesList = data.slides;
                updateSlideshowCountsAndModeUI();
                if (currentSlideshowMode === 'replace') {
                    slidesState = mapServerSlidesToSlots(savedSlidesList);
                    renderSlideshowFormList();
                }
            }
        } catch (err) {
            // Silent fallback to existing DOM data
        }
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function updateSlideshowCountsAndModeUI() {
        const totalBadge = document.getElementById('slideshowTotalBadge');
        if (totalBadge) {
            totalBadge.textContent = savedSlidesList.length + ' Saved';
        }

        const savedCountEl = document.getElementById('savedSlideshowCountText');
        if (savedCountEl) {
            savedCountEl.textContent = savedSlidesList.length;
        }

        const btnAppend = document.getElementById('slideshowModeBtnAppend');
        const btnReplace = document.getElementById('slideshowModeBtnReplace');
        const descEl = document.getElementById('slideshowModeDescription');
        const resetAllBtn = document.getElementById('btnResetSlideshowReplaceAll');
        const saveBtn = document.getElementById('btnSaveSlideshow');

        const activeClasses = 'py-2 px-3 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-[#800000] dark:bg-[#D4AF37] text-white dark:text-black shadow-sm';
        const inactiveClasses = 'py-2 px-3 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white';

        if (currentSlideshowMode === 'append') {
            if (btnAppend) btnAppend.className = activeClasses;
            if (btnReplace) btnReplace.className = inactiveClasses;
            if (descEl) {
                descEl.textContent = savedSlidesList.length > 0
                    ? `New photos below will be added to your ${savedSlidesList.length} existing slideshow photo(s) on the Organizer & Student Homepages.`
                    : 'Upload photos below to replace the moving placeholders on the Organizer & Student Homepages.';
            }
            if (resetAllBtn) resetAllBtn.classList.add('hidden');
            if (saveBtn && !saveBtn.disabled) {
                saveBtn.innerHTML = '<i class="ph-bold ph-plus-square text-base sm:text-lg"></i> <span>Add to Slideshow</span>';
            }
        } else {
            if (btnAppend) btnAppend.className = inactiveClasses;
            if (btnReplace) btnReplace.className = activeClasses;
            if (descEl) {
                descEl.textContent = 'Changes below will replace or remove the existing slideshow photos on the Organizer & Student Homepages.';
            }
            if (resetAllBtn) {
                resetAllBtn.classList.toggle('hidden', savedSlidesList.length === 0);
            }
            if (saveBtn && !saveBtn.disabled) {
                saveBtn.innerHTML = '<i class="ph-bold ph-floppy-disk text-base sm:text-lg"></i> <span>Save Replacements</span>';
            }
        }
    }

    window.switchSlideshowModalMode = function(mode) {
        if (mode !== 'append' && mode !== 'replace') return;
        currentSlideshowMode = mode;

        if (mode === 'append') {
            slidesState = [createBlankSlideSlot()];
        } else {
            slidesState = mapServerSlidesToSlots(savedSlidesList);
        }

        updateSlideshowCountsAndModeUI();
        renderSlideshowFormList();
    };

    window.resetSlideshowForFreshReplacement = function() {
        currentSlideshowMode = 'replace';
        slidesState = [createBlankSlideSlot()];
        updateSlideshowCountsAndModeUI();
        renderSlideshowFormList();
    };

    function renderSlideshowFormList() {
        const container = document.getElementById('slideshowFormContainer');
        if (!container) return;

        updateSlideshowCountsAndModeUI();

        container.innerHTML = slidesState.map((slide, idx) => {
            const hasImage = Boolean(slide.imagePreview);
            const slotLabel = currentSlideshowMode === 'append'
                ? `New Slideshow Photo #${idx + 1}`
                : `Slideshow Photo #${idx + 1}`;

            return `
                <div id="slideshow-card-${slide.uid}" class="slideshow-entry-card bg-white dark:bg-[#151515] rounded-2xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm transition-colors">
                    <!-- Card Top Bar -->
                    <div class="flex items-center justify-between mb-2.5 pb-2 border-b border-gray-100 dark:border-gray-800/80">
                        <div class="flex items-center gap-1.5">
                            <span class="w-5 h-5 rounded-full bg-[#800000]/10 dark:bg-[#D4AF37]/15 text-[#800000] dark:text-[#D4AF37] text-[10px] font-black flex items-center justify-center">
                                ${idx + 1}
                            </span>
                            <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                ${slotLabel}
                            </span>
                        </div>
                        <button type="button" onclick="removeSlideshowFormCard('${slide.uid}')" class="text-[10px] font-bold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer" title="Remove Photo Slot">
                            <i class="ph-bold ph-trash text-xs"></i>
                            <span>${slidesState.length > 1 ? 'Remove' : 'Clear'}</span>
                        </button>
                    </div>

                    <!-- Wide Landscape Upload Preview matching Train Card -->
                    <div onclick="triggerSlideshowFileInput('${slide.uid}')"
                         class="w-full h-36 sm:h-44 rounded-2xl overflow-hidden border-2 border-dashed ${hasImage ? 'border-gray-300 dark:border-gray-700' : 'border-[#800000]/30 dark:border-[#D4AF37]/30'} hover:border-[#800000] dark:hover:border-[#D4AF37] bg-gray-100 dark:bg-[#111111] relative group cursor-pointer shadow-inner transition-all flex items-center justify-center">
                        
                        <img id="slideshow-img-preview-${slide.uid}"
                             src="${hasImage ? escapeHtml(slide.imagePreview) : ''}"
                             class="${hasImage ? '' : 'hidden'} w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                             alt="Slideshow Photo">

                        <!-- Placeholder State when no image selected yet -->
                        <div id="slideshow-placeholder-${slide.uid}" class="${hasImage ? 'hidden' : 'flex'} flex-col items-center justify-center text-center p-4">
                            <div class="w-11 h-11 rounded-2xl bg-[#800000]/10 dark:bg-[#D4AF37]/15 text-[#800000] dark:text-[#D4AF37] flex items-center justify-center mb-2">
                                <i class="ph-bold ph-image-square text-xl sm:text-2xl"></i>
                            </div>
                            <span class="text-[11px] sm:text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">
                                Tap to Select Slideshow Photo
                            </span>
                            <span class="text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-0.5">
                                Landscape photo recommended (JPG, PNG, WEBP)
                            </span>
                        </div>

                        <!-- Hover Overlay when image is present -->
                        <div id="slideshow-overlay-${slide.uid}" class="${hasImage ? 'flex' : 'hidden'} absolute inset-0 bg-black/35 group-hover:bg-black/55 flex-col items-center justify-center text-white transition-colors">
                            <i class="ph-bold ph-camera-rotate text-xl sm:text-2xl mb-1"></i>
                            <span class="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">Change Photo</span>
                        </div>
                    </div>

                    <input type="file"
                           id="slideshow-file-${slide.uid}"
                           accept="image/*"
                           class="hidden"
                           onchange="handleSlideshowPhotoChange(event, '${slide.uid}')">
                </div>
            `;
        }).join('');
    }

    window.triggerSlideshowFileInput = function(uid) {
        const fileInput = document.getElementById('slideshow-file-' + uid);
        if (fileInput) fileInput.click();
    };

    window.handleSlideshowPhotoChange = function(event, uid) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const target = slidesState.find(s => s.uid === uid);
        if (!target) return;

        target.file = file;
        target.imagePreview = URL.createObjectURL(file);

        const imgEl = document.getElementById('slideshow-img-preview-' + uid);
        const placeholderEl = document.getElementById('slideshow-placeholder-' + uid);
        const overlayEl = document.getElementById('slideshow-overlay-' + uid);

        if (imgEl) {
            imgEl.src = target.imagePreview;
            imgEl.classList.remove('hidden');
        }
        if (placeholderEl) {
            placeholderEl.classList.add('hidden');
            placeholderEl.classList.remove('flex');
        }
        if (overlayEl) {
            overlayEl.classList.remove('hidden');
            overlayEl.classList.add('flex');
        }
    };

    window.addSlideshowFormCard = function() {
        const newSlot = createBlankSlideSlot();
        slidesState.push(newSlot);
        renderSlideshowFormList();

        setTimeout(() => {
            const newCard = document.getElementById('slideshow-card-' + newSlot.uid);
            if (newCard) {
                newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 60);
    };

    window.removeSlideshowFormCard = function(uid) {
        if (slidesState.length <= 1) {
            slidesState = [createBlankSlideSlot()];
            renderSlideshowFormList();
            return;
        }
        slidesState = slidesState.filter(s => s.uid !== uid);
        renderSlideshowFormList();
    };

    window.openManageSlideshowModal = function() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) settingsModal.classList.add('hidden');

        currentSlideshowMode = 'append';
        slidesState = [createBlankSlideSlot()];
        updateSlideshowCountsAndModeUI();
        renderSlideshowFormList();
        refreshSavedSlideshowFromServer();

        const modal = document.getElementById('manageSlideshowModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    };

    window.closeManageSlideshowModal = function() {
        const modal = document.getElementById('manageSlideshowModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    };

    window.saveOrgSlideshow = async function() {
        const btn = document.getElementById('btnSaveSlideshow');
        if (!btn) return;

        // In 'replace' mode, allow clearing all slideshow photos (reverting to moving placeholders) if there is 1 blank slot
        const isSingleBlankReplace = (currentSlideshowMode === 'replace') &&
            slidesState.length === 1 &&
            !slidesState[0].file &&
            !slidesState[0].existingImageUrl;

        if (!isSingleBlankReplace) {
            for (let i = 0; i < slidesState.length; i++) {
                const s = slidesState[i];
                if (!s.file && !s.existingImageUrl) {
                    if (typeof showPwToast === 'function') {
                        showPwToast(`Slideshow Slot #${i + 1}: Please select a photo or remove the empty slot.`, 'error');
                    } else {
                        alert(`Slideshow Slot #${i + 1}: Please select a photo or remove the empty slot.`);
                    }
                    const cardEl = document.getElementById('slideshow-card-' + s.uid);
                    if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
        }

        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-base sm:text-lg"></i> <span>Saving...</span>';

        const formData = new FormData();
        formData.append('action_mode', currentSlideshowMode);

        const metaList = isSingleBlankReplace ? [] : slidesState.map((s, idx) => {
            const fileKey = s.file ? `slide_image_${idx}` : null;
            if (s.file && fileKey) {
                formData.append(fileKey, s.file);
            }
            return {
                id: currentSlideshowMode === 'replace' ? s.id : null,
                existing_image_url: s.existingImageUrl,
                file_key: fileKey
            };
        });

        formData.append('slides_meta', JSON.stringify(metaList));

        const csrfToken = (typeof getCsrfToken === 'function')
            ? getCsrfToken()
            : ((document.cookie.split('; ').find(r => r.startsWith('csrftoken=')) || '').split('=')[1] || '');

        try {
            const resp = await fetch('/organizer/api/save-slideshow/', {
                method: 'POST',
                headers: { 'X-CSRFToken': csrfToken },
                body: formData
            });
            const data = await resp.json();

            if (data.status === 'success') {
                if (Array.isArray(data.slides)) {
                    savedSlidesList = data.slides;
                }

                if (currentSlideshowMode === 'append') {
                    slidesState = [createBlankSlideSlot()];
                } else {
                    slidesState = mapServerSlidesToSlots(savedSlidesList);
                }
                updateSlideshowCountsAndModeUI();
                renderSlideshowFormList();

                if (typeof showPwToast === 'function') {
                    showPwToast(data.message || 'Slideshow updated successfully!', 'success');
                }
                closeManageSlideshowModal();
            } else {
                if (typeof showPwToast === 'function') {
                    showPwToast(data.message || 'Failed to save slideshow.', 'error');
                } else {
                    alert(data.message || 'Failed to save slideshow.');
                }
            }
        } catch (err) {
            if (typeof showPwToast === 'function') {
                showPwToast('Network error while saving slideshow.', 'error');
            } else {
                alert('Network error while saving slideshow.');
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            updateSlideshowCountsAndModeUI();
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadInitialSlideshowFromDOM();
    });
})();

