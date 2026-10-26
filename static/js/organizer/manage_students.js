const currentOrgAcronym = (function() {
    try {
        const el = document.getElementById('org-acronym-data');
        return el ? JSON.parse(el.textContent) : '';
    } catch(e) {
        return '';
    }
})();

let currentId = null;

    document.addEventListener("DOMContentLoaded", function() {
        // Setup custom select dropdown for year filter
        const selectBtn = document.getElementById('yearSelectBtn');
        const menuWrapper = document.getElementById('yearSelectMenuWrapper');
        
        if(selectBtn && menuWrapper) {
            selectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = !menuWrapper.classList.contains('grid-rows-[0fr]');
                if (isOpen) {
                    closeYearSelect();
                } else {
                    openYearSelect();
                }
            });
        }
        
        document.addEventListener('click', (e) => {
            if (menuWrapper && !menuWrapper.contains(e.target) && selectBtn && !selectBtn.contains(e.target)) {
                closeYearSelect();
            }
        });
    });

    function openYearSelect() {
        const menuWrapper = document.getElementById('yearSelectMenuWrapper');
        const selectIcon = document.getElementById('yearSelectIcon');
        if(menuWrapper) {
            menuWrapper.classList.remove('grid-rows-[0fr]', 'opacity-0');
            menuWrapper.classList.add('grid-rows-[1fr]', 'opacity-100');
            if(selectIcon) selectIcon.classList.add('rotate-180');
        }
    }

    function closeYearSelect() {
        const menuWrapper = document.getElementById('yearSelectMenuWrapper');
        const selectIcon = document.getElementById('yearSelectIcon');
        if(menuWrapper) {
            menuWrapper.classList.add('grid-rows-[0fr]', 'opacity-0');
            menuWrapper.classList.remove('grid-rows-[1fr]', 'opacity-100');
            if(selectIcon) selectIcon.classList.remove('rotate-180');
        }
    }

    function selectYearFilter(value, label) {
        document.getElementById('yearFilter').value = value;
        document.getElementById('yearSelectLabel').innerText = label;
        closeYearSelect();
        filterTable();
    }

    function handleRowClick(element) {
        const id = element.dataset.id;
        const name = element.dataset.name;
        const stdNum = element.dataset.number;
        const year = element.dataset.year;
        const birth = element.dataset.birth;
        const avatar = element.dataset.avatar;
        const cover = element.dataset.cover;
        const org = element.dataset.org;
        const status = element.dataset.status;
        
        openStudentModal(id, name, stdNum, year, birth, avatar, cover, org, status);
    }

    function openStudentModal(id, name, stdNum, year, birth, avatar, cover, org, status) {
        currentId = id;
        
        // Populate Modal Data
        document.getElementById('modalNameText').innerText = name;
        document.getElementById('modalNumberText').innerText = stdNum;
        document.getElementById('modalYearText').innerText = year;
        document.getElementById('modalBirthText').innerText = birth;
        document.getElementById('modalProfileImg').src = avatar;
        document.getElementById('modalCoverImg').src = cover;
        document.getElementById('modalOrgText').innerText = org || currentOrgAcronym;

        // Action Buttons logic (Only for Pending)
        // Show Modal with Animation
        const modal = document.getElementById('studentDetailModal');
        const box = document.getElementById('modalContainer');
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        setTimeout(() => {
            box.classList.remove('translate-y-full');
            box.classList.add('translate-y-0');
        }, 10);
        
        document.body.style.overflow = 'hidden';
    }

    function closeStudentModal() {
        const modal = document.getElementById('studentDetailModal');
        const box = document.getElementById('modalContainer');
        
        box.classList.remove('translate-y-0');
        box.classList.add('translate-y-full');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
        }, 300);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function filterTable() {
        const queryInput = document.getElementById('searchInput');
        const query = queryInput ? queryInput.value.trim() : '';
        const queryLower = query.toLowerCase();
        const yearFilter = document.getElementById('yearFilter') ? document.getElementById('yearFilter').value : 'All';
        const items = document.querySelectorAll('.student-item');
        let visibleCount = 0;

        items.forEach(item => {
            const textToSearch = item.dataset.search || '';
            const itemYear = item.dataset.year || '';

            const matchesQuery = !queryLower || textToSearch.includes(queryLower);
            const matchesYear = (yearFilter === 'All' || itemYear === yearFilter);

            if (matchesQuery && matchesYear) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        const noResultsState = document.getElementById('noResultsState');
        const noResultsText = document.getElementById('noResultsText');

        if (items.length > 0) {
            if (visibleCount === 0) {
                if (noResultsState) noResultsState.classList.remove('hidden');
                if (noResultsText) {
                    if (query) {
                        noResultsText.innerHTML = `No student found matching "<span class="text-pup-maroon dark:text-pup-gold font-bold">${escapeHtml(query)}</span>"`;
                    } else {
                        noResultsText.innerText = 'No student found matching the selected filter';
                    }
                }
            } else {
                if (noResultsState) noResultsState.classList.add('hidden');
            }
        }
    }

    // 🟢 CREATE STUDENT MODAL & METHODS 🟢
    let selectedFiles = [];
    let generateCooldownInterval = null;

    function openCreateStudentModal() {
        const modal = document.getElementById('createStudentModal');
        if (modal) modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        populateDays();
        populateYears();
    }

    function closeCreateStudentModal() {
        const modal = document.getElementById('createStudentModal');
        if (modal) modal.classList.add('hidden');
        if (!document.getElementById('studentDetailModal') || document.getElementById('studentDetailModal').classList.contains('hidden')) {
            document.body.style.overflow = '';
        }
    }

    function switchCreateTab(tab) {
        const manualForm = document.getElementById('createStudentManualForm');
        const bulkSection = document.getElementById('bulkUploadSection');
        const tabBtnManual = document.getElementById('tabBtnManual');
        const tabBtnBulk = document.getElementById('tabBtnBulk');

        if (tab === 'manual') {
            manualForm.classList.remove('hidden');
            bulkSection.classList.add('hidden');

            tabBtnManual.className = "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all bg-white dark:bg-[#111] text-pup-maroon dark:text-pup-gold shadow-sm flex items-center justify-center gap-2";
            tabBtnBulk.className = "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-2";
        } else {
            manualForm.classList.add('hidden');
            bulkSection.classList.remove('hidden');

            tabBtnBulk.className = "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all bg-white dark:bg-[#111] text-pup-maroon dark:text-pup-gold shadow-sm flex items-center justify-center gap-2";
            tabBtnManual.className = "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-2";
        }
    }

    function handleOrgChange(org) {
        const orgToProg = { 'ITO': 'BSIT', 'YEO': 'BSENT', 'PAS': 'BPA', 'FTO': 'BEED', 'ITS': 'DOMT' };
        const progSelect = document.getElementById('c_program');
        if (progSelect && orgToProg[org]) {
            progSelect.value = orgToProg[org];
        } else if (progSelect && ['CAO', 'NEWS', 'PRIDE', 'PRIDEVerse', 'BahaghariU', 'ROTC', 'PUSO', 'SSC'].includes(org)) {
            if (!progSelect.value) progSelect.value = 'Not Assigned';
        }
    }

    function populateDays() {
        const daySelect = document.getElementById('b_day');
        if (!daySelect || daySelect.options.length > 1) return;
        for (let i = 1; i <= 31; i++) {
            const val = i < 10 ? '0' + i : '' + i;
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            daySelect.appendChild(opt);
        }
    }

    function populateYears() {
        const yearSelect = document.getElementById('b_year');
        if (!yearSelect || yearSelect.options.length > 1) return;
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= 1950; y--) {
            const opt = document.createElement('option');
            opt.value = '' + y;
            opt.textContent = '' + y;
            yearSelect.appendChild(opt);
        }
    }

    function getCSRFToken() {
        let token = null;
        const cookieValue = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
        if (cookieValue) token = cookieValue.split('=')[1];
        if (!token) {
            const input = document.querySelector('[name=csrfmiddlewaretoken]');
            if(input) token = input.value;
        }
        return token;
    }

    let toastTimeout = null;
    function showToast(message, type = 'success') {
        const toast = document.getElementById('customToast');
        if (!toast) return;
        const icon = document.getElementById('customToastIcon');
        const msgSpan = document.getElementById('customToastMsg');

        if (msgSpan) msgSpan.innerText = message;
        if (type === 'success') {
            toast.style.background = '#10B981';
            if (icon) icon.className = 'ph-bold ph-check-circle';
        } else if (type === 'warning') {
            toast.style.background = '#F59E0B';
            if (icon) icon.className = 'ph-bold ph-warning';
        } else {
            toast.style.background = '#EF4444';
            if (icon) icon.className = 'ph-bold ph-warning-circle';
        }

        toast.style.bottom = '30px';
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.style.bottom = '-100px';
        }, 4000);
    }

    async function generatePassword() {
        const email = document.getElementById('c_email').value.trim();
        const name = document.getElementById('c_name').value.trim();
        const student_id = document.getElementById('c_username').value.trim();

        if (!email || !name || !student_id) {
            showToast("Please fill in Name, Student ID, and Email first.", "warning");
            return;
        }

        const btn = document.getElementById('btn-generate-password');
        const ogContent = btn.innerHTML;
        btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin text-sm"></i> <span>Generating...</span>';
        btn.disabled = true;

        try {
            const res = await fetch('/organizer/api/generate-student-password/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({ email: email, full_name: name, student_id: student_id })
            });
            const data = await res.json();
            if (data.status === 'success') {
                document.getElementById('c_generated_password').value = data.password;
                showToast("Password generated and sent to " + email, "success");

                let timeLeft = 60;
                btn.innerHTML = `<i class="ph-bold ph-check text-sm"></i> <span>Sent (${timeLeft}s)</span>`;
                btn.classList.add('opacity-70', 'cursor-not-allowed');

                if (generateCooldownInterval) clearInterval(generateCooldownInterval);
                generateCooldownInterval = setInterval(() => {
                    timeLeft--;
                    if (timeLeft <= 0) {
                        clearInterval(generateCooldownInterval);
                        btn.innerHTML = '<i class="ph-bold ph-key text-sm"></i> <span>Generate</span>';
                        btn.disabled = false;
                        btn.classList.remove('opacity-70', 'cursor-not-allowed');
                    } else {
                        btn.innerHTML = `<i class="ph-bold ph-check text-sm"></i> <span>Sent (${timeLeft}s)</span>`;
                    }
                }, 1000);
            } else {
                showToast(data.message || "Failed to generate password.", "error");
                btn.innerHTML = ogContent;
                btn.disabled = false;
            }
        } catch (e) {
            showToast("Connection error. Please try again.", "error");
            btn.innerHTML = ogContent;
            btn.disabled = false;
        }
    }

    async function submitCreateStudent() {
        const name = document.getElementById('c_name').value.trim();
        const username = document.getElementById('c_username').value.trim();
        const b_month = document.getElementById('b_month') ? document.getElementById('b_month').value : "";
        const b_day = document.getElementById('b_day') ? document.getElementById('b_day').value : "";
        const b_year = document.getElementById('b_year') ? document.getElementById('b_year').value : "";
        const bday = (b_month && b_day && b_year) ? `${b_month}/${b_day}/${b_year}` : "";
        const organization = document.getElementById('c_org') ? document.getElementById('c_org').value : currentOrgAcronym;
        const program = document.getElementById('c_program').value;
        const year_level = document.getElementById('c_year').value;
        const email = document.getElementById('c_email').value.trim();
        const generated_password = document.getElementById('c_generated_password').value;

        if (!name || !username || !email || !organization) {
            showToast("Please complete all required fields.", "error");
            return;
        }
        if (!generated_password) {
            showToast("Please click 'Generate' to create a password first.", "warning");
            return;
        }

        const btn = document.getElementById('btn-create-submit');
        const ogHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin text-sm"></i> <span>Creating...</span>';
        btn.disabled = true;

        try {
            const res = await fetch('/organizer/api/create-student-manual/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    full_name: name,
                    student_id: username,
                    birthday: bday,
                    organization: organization,
                    program: program,
                    year_level: year_level,
                    email: email,
                    password: generated_password
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                showToast(data.message, "success");
                setTimeout(() => window.location.reload(), 1500);
            } else if (data.status === 'warning') {
                showToast(data.message, "warning");
                btn.innerHTML = ogHtml;
                btn.disabled = false;
            } else {
                showToast(data.message || "Failed to create student.", "error");
                btn.innerHTML = ogHtml;
                btn.disabled = false;
            }
        } catch (e) {
            showToast("Server error occurred.", "error");
            btn.innerHTML = ogHtml;
            btn.disabled = false;
        }
    }

    function handleFileSelect(input) {
        if (!input.files || input.files.length === 0) return;
        for (let i = 0; i < input.files.length; i++) {
            selectedFiles.push(input.files[i]);
        }
        renderFilePreviews();
    }

    function removeFile(index) {
        selectedFiles.splice(index, 1);
        if (selectedFiles.length === 0) {
            document.getElementById('filePreviewContainer').classList.add('hidden');
            document.getElementById('uploadDropzone').classList.remove('hidden');
            document.getElementById('bulkUploadFile').value = '';
        } else {
            renderFilePreviews();
        }
    }

    function renderFilePreviews() {
        const dropzone = document.getElementById('uploadDropzone');
        const container = document.getElementById('filePreviewContainer');

        dropzone.classList.add('hidden');
        container.classList.remove('hidden');

        let html = '<div class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800"><span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Selected Files</span><button type="button" onclick="document.getElementById(\'bulkUploadFile\').click()" class="text-xs font-bold text-pup-maroon dark:text-pup-gold flex items-center gap-1 hover:underline"><i class="ph-bold ph-plus"></i> Add More</button></div>';

        selectedFiles.forEach((file, index) => {
            let icon = 'ph-file-csv';
            let color = '#10B981';
            if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
                icon = 'ph-file-xls';
                color = '#059669';
            }
            html += `
            <div class="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1a1a]">
                <div class="flex items-center gap-3 min-w-0">
                    <i class="ph-bold ${icon} text-2xl" style="color: ${color};"></i>
                    <div class="min-w-0">
                        <p class="text-xs font-bold text-gray-900 dark:text-white truncate">${file.name}</p>
                        <p class="text-[10px] text-gray-500">${(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                </div>
                <button type="button" onclick="removeFile(${index})" class="text-red-500 hover:text-red-700 p-1 transition-colors">
                    <i class="ph-bold ph-trash text-lg"></i>
                </button>
            </div>`;
        });

        container.innerHTML = html;
    }

    async function processBulkUpload() {
        if (selectedFiles.length === 0) {
            showToast("Please select at least one spreadsheet file.", "error");
            return;
        }

        const formData = new FormData();
        selectedFiles.forEach(f => formData.append('files', f));

        showToast("Processing spreadsheet accounts...", "warning");
        const btn = document.getElementById('btn-process-upload');
        const ogHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin text-sm"></i> <span>Uploading...</span>';
        btn.disabled = true;

        try {
            const res = await fetch('/organizer/api/create-student-bulk/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken()
                },
                body: formData
            });
            const data = await res.json();
            if (data.status === 'success') {
                showToast(data.message, "success");
                setTimeout(() => window.location.reload(), 2000);
            } else {
                showToast(data.message || "Failed to process bulk upload.", "error");
                btn.innerHTML = ogHtml;
                btn.disabled = false;
            }
        } catch (e) {
            showToast("An error occurred during file upload.", "error");
            btn.innerHTML = ogHtml;
            btn.disabled = false;
        }
    }
