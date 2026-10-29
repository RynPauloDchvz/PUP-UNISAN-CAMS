(function() {
    const YEAR_LEVEL_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
    const DEFAULT_OFFICER_IMAGE = '/static/images/student.jpg';

    let officersState = [];
    let nextTempId = 1;

    function loadInitialOfficers() {
        try {
            const rawEl = document.getElementById('initial-org-officers-data');
            const parsed = rawEl && rawEl.textContent ? JSON.parse(rawEl.textContent) : [];
            if (Array.isArray(parsed) && parsed.length > 0) {
                officersState = parsed.map((item, idx) => ({
                    uid: 'off_' + idx + '_' + (nextTempId++),
                    id: item.id !== undefined ? item.id : null,
                    name: item.name || '',
                    year_level: YEAR_LEVEL_OPTIONS.includes(item.year_level) ? item.year_level : '1st Year',
                    position: item.position || '',
                    imagePreview: item.image || DEFAULT_OFFICER_IMAGE,
                    existingImageUrl: item.image || DEFAULT_OFFICER_IMAGE,
                    file: null,
                    drawerOpen: false
                }));
                return;
            }
        } catch (err) {
            console.error('Error parsing initial officers data:', err);
        }

        officersState = [{
            uid: 'off_init_' + (nextTempId++),
            id: null,
            name: '',
            year_level: '1st Year',
            position: 'President',
            imagePreview: DEFAULT_OFFICER_IMAGE,
            existingImageUrl: DEFAULT_OFFICER_IMAGE,
            file: null,
            drawerOpen: false
        }];
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function syncThemeIconInOfficersModal() {
        const icon = document.getElementById('officersModalThemeIcon');
        if (!icon) return;
        const isDark = document.documentElement.classList.contains('dark');
        icon.className = isDark
            ? 'ph-fill ph-sun text-base sm:text-lg text-[#D4AF37]'
            : 'ph-fill ph-moon text-base sm:text-lg text-gray-700';
    }

    window.toggleSystemThemeFromOfficersModal = function() {
        const appEl = document.getElementById('app');
        if (appEl && appEl.__vue_app__ && appEl.__vue_app__._instance && appEl.__vue_app__._instance.proxy && typeof appEl.__vue_app__._instance.proxy.toggleTheme === 'function') {
            appEl.__vue_app__._instance.proxy.toggleTheme();
        } else {
            const isDark = !document.documentElement.classList.contains('dark');
            document.documentElement.classList.toggle('dark', isDark);
            document.documentElement.classList.toggle('light', !isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        }
        syncThemeIconInOfficersModal();
    };

    function updateBadgeCount() {
        const badge = document.getElementById('officersTotalBadge');
        if (badge) {
            badge.textContent = officersState.length;
        }
    }

    function renderOfficersFormList() {
        const container = document.getElementById('officersFormContainer');
        if (!container) return;

        updateBadgeCount();

        container.innerHTML = officersState.map((off, idx) => {
            const optionsHtml = YEAR_LEVEL_OPTIONS.map(yr => {
                const isSelected = off.year_level === yr;
                return `
                    <button type="button"
                            onclick="selectOfficerYearLevel('${off.uid}', '${yr}', event)"
                            class="w-full px-3 py-2 text-left text-[11px] sm:text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                                isSelected
                                    ? 'bg-[#800000]/10 dark:bg-[#D4AF37]/15 text-[#800000] dark:text-[#D4AF37] font-black'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-white/5'
                            }">
                        <span>${yr}</span>
                        ${isSelected ? '<i class="ph-bold ph-check text-xs"></i>' : ''}
                    </button>
                `;
            }).join('');

            return `
                <div id="officer-card-${off.uid}" class="officer-entry-card bg-white dark:bg-[#151515] rounded-2xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm transition-colors">
                    <!-- Card Top Bar -->
                    <div class="flex items-center justify-between mb-2.5 pb-2 border-b border-gray-100 dark:border-gray-800/80">
                        <div class="flex items-center gap-1.5">
                            <span class="w-5 h-5 rounded-full bg-[#800000]/10 dark:bg-[#D4AF37]/15 text-[#800000] dark:text-[#D4AF37] text-[10px] font-black flex items-center justify-center">
                                ${idx + 1}
                            </span>
                            <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Officer Slot #${idx + 1}
                            </span>
                        </div>
                        ${officersState.length > 1 ? `
                        <button type="button" onclick="removeOfficerFormCard('${off.uid}')" class="text-[10px] font-bold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer" title="Remove Officer">
                            <i class="ph-bold ph-trash text-xs"></i>
                            <span>Remove</span>
                        </button>
                        ` : ''}
                    </div>

                    <!-- Same Left-Right Layout on Both Desktop & Mobile -->
                    <div class="flex flex-row items-start gap-3 sm:gap-4">
                        <!-- LEFT SIDE: Picture Upload -->
                        <div class="w-24 sm:w-28 shrink-0 flex flex-col items-center">
                            <div onclick="triggerOfficerFileInput('${off.uid}')"
                                 class="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#800000] dark:hover:border-[#D4AF37] bg-gray-100 dark:bg-[#111111] relative group cursor-pointer shadow-inner transition-all">
                                <img id="officer-img-preview-${off.uid}"
                                     src="${escapeHtml(off.imagePreview)}"
                                     onerror="this.onerror=null; this.src='${DEFAULT_OFFICER_IMAGE}';"
                                     class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                     alt="Officer Photo">
                                <div class="absolute inset-0 bg-black/40 group-hover:bg-black/60 flex flex-col items-center justify-center text-white transition-colors">
                                    <i class="ph-bold ph-camera-plus text-lg sm:text-xl mb-0.5"></i>
                                    <span class="text-[8px] sm:text-[9px] font-black uppercase tracking-wider">Upload Photo</span>
                                </div>
                            </div>
                            <input type="file"
                                   id="officer-file-${off.uid}"
                                   accept="image/*"
                                   class="hidden"
                                   onchange="handleOfficerPhotoChange(event, '${off.uid}')">
                            <span class="text-[8px] sm:text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-1.5 text-center">
                                Tap to change
                            </span>
                        </div>

                        <!-- RIGHT SIDE: Officer Name, Year Level (Single-Card App Drawer Dropdown), & Position -->
                        <div class="flex-1 min-w-0 flex flex-col gap-2 sm:gap-2.5">
                            <!-- 1. Officer Name -->
                            <div>
                                <label class="block text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                                    Officer Name
                                </label>
                                <input type="text"
                                       value="${escapeHtml(off.name)}"
                                       oninput="updateOfficerField('${off.uid}', 'name', this.value)"
                                       placeholder="Enter full name..."
                                       class="w-full bg-[#f8f8f8] dark:bg-[#111111] border border-gray-200 dark:border-gray-700 focus:border-[#800000] dark:focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-colors">
                            </div>

                            <!-- 2. Year Level Dropdown (Unified Single-Card Box with App Drawer Animation) -->
                            <div>
                                <label class="block text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                                    Year Level
                                </label>
                                <div id="year-card-${off.uid}" class="officer-year-card ${off.drawerOpen ? 'drawer-open' : ''} rounded-xl border border-gray-200 dark:border-gray-700 bg-[#f8f8f8] dark:bg-[#111111] overflow-hidden transition-all">
                                    <!-- Dropdown Header inside the same card box -->
                                    <button type="button"
                                            onclick="toggleOfficerYearDrawer('${off.uid}', event)"
                                            class="w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-xs sm:text-sm font-bold text-gray-900 dark:text-white hover:bg-gray-200/40 dark:hover:bg-white/5 transition-colors cursor-pointer">
                                        <span id="year-label-${off.uid}" class="truncate">${escapeHtml(off.year_level)}</span>
                                        <i class="officer-year-caret ph-bold ph-caret-down text-xs sm:text-sm text-[#800000] dark:text-[#D4AF37] shrink-0"></i>
                                    </button>

                                    <!-- Expandable Choices inside the exact same card box (pushes Position down smoothly) -->
                                    <div class="officer-year-drawer">
                                        <div class="overflow-hidden">
                                            <div class="border-t border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800/60">
                                                ${optionsHtml}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 3. Position (Text Input below Year Level, adjusts smoothly when dropdown opens/closes) -->
                            <div>
                                <label class="block text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                                    Position
                                </label>
                                <input type="text"
                                       value="${escapeHtml(off.position)}"
                                       oninput="updateOfficerField('${off.uid}', 'position', this.value)"
                                       placeholder="e.g. President, Secretary, PIO..."
                                       class="w-full bg-[#f8f8f8] dark:bg-[#111111] border border-gray-200 dark:border-gray-700 focus:border-[#800000] dark:focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-colors">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.triggerOfficerFileInput = function(uid) {
        const fileInput = document.getElementById('officer-file-' + uid);
        if (fileInput) fileInput.click();
    };

    window.handleOfficerPhotoChange = function(event, uid) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const target = officersState.find(o => o.uid === uid);
        if (!target) return;

        target.file = file;
        target.imagePreview = URL.createObjectURL(file);

        const imgEl = document.getElementById('officer-img-preview-' + uid);
        if (imgEl) {
            imgEl.src = target.imagePreview;
        }
    };

    window.updateOfficerField = function(uid, field, value) {
        const target = officersState.find(o => o.uid === uid);
        if (!target) return;
        target[field] = value;
    };

    window.toggleOfficerYearDrawer = function(uid, event) {
        if (event) event.stopPropagation();
        const target = officersState.find(o => o.uid === uid);
        if (!target) return;

        const nextState = !target.drawerOpen;
        officersState.forEach(o => {
            o.drawerOpen = (o.uid === uid) ? nextState : false;
            const cardEl = document.getElementById('year-card-' + o.uid);
            if (cardEl) {
                cardEl.classList.toggle('drawer-open', o.drawerOpen);
            }
        });
    };

    window.selectOfficerYearLevel = function(uid, yearValue, event) {
        if (event) event.stopPropagation();
        const target = officersState.find(o => o.uid === uid);
        if (!target) return;

        target.year_level = yearValue;
        target.drawerOpen = false;

        // Smoothly close the drawer first, then refresh active checkmark state
        const cardEl = document.getElementById('year-card-' + uid);
        const labelEl = document.getElementById('year-label-' + uid);
        if (labelEl) labelEl.textContent = yearValue;
        if (cardEl) {
            cardEl.classList.remove('drawer-open');
            const buttons = cardEl.querySelectorAll('.officer-year-drawer button');
            buttons.forEach(btn => {
                const btnYear = btn.querySelector('span') ? btn.querySelector('span').textContent.trim() : '';
                const isSelected = btnYear === yearValue;
                btn.className = `w-full px-3 py-2 text-left text-[11px] sm:text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                        ? 'bg-[#800000]/10 dark:bg-[#D4AF37]/15 text-[#800000] dark:text-[#D4AF37] font-black'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-white/5'
                }`;
                const existingCheck = btn.querySelector('i');
                if (isSelected && !existingCheck) {
                    btn.insertAdjacentHTML('beforeend', '<i class="ph-bold ph-check text-xs"></i>');
                } else if (!isSelected && existingCheck) {
                    existingCheck.remove();
                }
            });
        }
    };

    // Close any open Year Level drawer if user clicks outside
    document.addEventListener('click', function(e) {
        if (e.target.closest('.officer-year-card')) return;
        officersState.forEach(o => {
            if (o.drawerOpen) {
                o.drawerOpen = false;
                const cardEl = document.getElementById('year-card-' + o.uid);
                if (cardEl) cardEl.classList.remove('drawer-open');
            }
        });
    });

    window.addOfficerFormCard = function() {
        const newUid = 'off_new_' + (nextTempId++);
        officersState.push({
            uid: newUid,
            id: null,
            name: '',
            year_level: '1st Year',
            position: '',
            imagePreview: DEFAULT_OFFICER_IMAGE,
            existingImageUrl: DEFAULT_OFFICER_IMAGE,
            file: null,
            drawerOpen: false
        });
        renderOfficersFormList();

        setTimeout(() => {
            const newCard = document.getElementById('officer-card-' + newUid);
            if (newCard) {
                newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                const firstInput = newCard.querySelector('input[type="text"]');
                if (firstInput) firstInput.focus();
            }
        }, 60);
    };

    window.removeOfficerFormCard = function(uid) {
        if (officersState.length <= 1) return;
        officersState = officersState.filter(o => o.uid !== uid);
        renderOfficersFormList();
    };

    window.openManageOfficersModal = function() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) settingsModal.classList.add('hidden');

        if (officersState.length === 0) {
            loadInitialOfficers();
        }
        syncThemeIconInOfficersModal();
        renderOfficersFormList();

        const modal = document.getElementById('manageOfficersModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    };

    window.closeManageOfficersModal = function() {
        const modal = document.getElementById('manageOfficersModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    };

    window.saveOrgOfficers = async function() {
        const btn = document.getElementById('btnSaveOfficers');
        if (!btn) return;

        // Validate all officer entries
        for (let i = 0; i < officersState.length; i++) {
            const o = officersState[i];
            if (!o.name.trim() || !o.position.trim()) {
                if (typeof showPwToast === 'function') {
                    showPwToast(`Officer Slot #${i + 1}: Please fill in both Officer Name and Position.`, 'error');
                } else {
                    alert(`Officer Slot #${i + 1}: Please fill in both Officer Name and Position.`);
                }
                const cardEl = document.getElementById('officer-card-' + o.uid);
                if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
        }

        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-base sm:text-lg"></i> <span>Saving...</span>';

        const formData = new FormData();
        const metaList = officersState.map((o, idx) => {
            const fileKey = o.file ? `officer_image_${idx}` : null;
            if (o.file && fileKey) {
                formData.append(fileKey, o.file);
            }
            return {
                id: o.id,
                name: o.name.trim(),
                year_level: o.year_level,
                position: o.position.trim(),
                existing_image_url: o.existingImageUrl,
                file_key: fileKey
            };
        });

        formData.append('officers_meta', JSON.stringify(metaList));

        const csrfToken = (typeof getCsrfToken === 'function')
            ? getCsrfToken()
            : ((document.cookie.split('; ').find(r => r.startsWith('csrftoken=')) || '').split('=')[1] || '');

        try {
            const resp = await fetch('/organizer/api/save-officers/', {
                method: 'POST',
                headers: { 'X-CSRFToken': csrfToken },
                body: formData
            });
            const data = await resp.json();

            if (data.status === 'success') {
                if (Array.isArray(data.officers)) {
                    officersState = data.officers.map((item, idx) => ({
                        uid: 'off_' + idx + '_' + (nextTempId++),
                        id: item.id,
                        name: item.name || '',
                        year_level: YEAR_LEVEL_OPTIONS.includes(item.year_level) ? item.year_level : '1st Year',
                        position: item.position || '',
                        imagePreview: item.image || DEFAULT_OFFICER_IMAGE,
                        existingImageUrl: item.image || DEFAULT_OFFICER_IMAGE,
                        file: null,
                        drawerOpen: false
                    }));
                }

                if (typeof showPwToast === 'function') {
                    showPwToast(data.message || 'Officers updated successfully!', 'success');
                }
                closeManageOfficersModal();
            } else {
                if (typeof showPwToast === 'function') {
                    showPwToast(data.message || 'Failed to save officers.', 'error');
                } else {
                    alert(data.message || 'Failed to save officers.');
                }
            }
        } catch (err) {
            if (typeof showPwToast === 'function') {
                showPwToast('Network error while saving officers.', 'error');
            } else {
                alert('Network error while saving officers.');
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadInitialOfficers();
        syncThemeIconInOfficersModal();
    });
})();

