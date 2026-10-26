    let usersData = [];
    try {
        const el = document.getElementById('advisers-data');
        if (el && el.textContent) usersData = JSON.parse(el.textContent);
    } catch (e) {
        console.error("Error parsing advisersData:", e);
    }
    
    let isBulkManageActive = false;
    let selectedUserIds = new Set();
    let currentOrgFilter = 'all';

    function toggleOrgDropdown(e) {
        if(e) e.stopPropagation();
        document.getElementById('orgFilterDropdown').classList.toggle('active');
    }

    function selectOrgFilter(e, val, label) {
        if(e) e.stopPropagation();
        currentOrgFilter = val;
        document.getElementById('orgFilterLabel').innerText = label;
        document.getElementById('orgFilterDropdown').classList.remove('active');
        
        document.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('active'));
        if(e) e.target.classList.add('active');
        filterUsers();
    }

    function toggleBulkManage() {
        isBulkManageActive = !isBulkManageActive;
        const btnManage = document.getElementById('btnToggleManage');
        const btnDeact = document.getElementById('btnBulkDeactivate');
        
        if (isBulkManageActive) {
            if(btnManage) btnManage.innerHTML = `<i class="ph-bold ph-x"></i> Cancel`;
            if(btnDeact) btnDeact.style.display = 'block';
            
            document.querySelectorAll('.student-checkbox').forEach(chk => chk.style.display = 'block');
            document.querySelectorAll('.mobile-edit-btn').forEach(btn => btn.style.display = 'none');
            
            const thCheck = document.getElementById('thCheckbox');
            if(thCheck) thCheck.style.display = 'table-cell';
            document.querySelectorAll('.td-checkbox').forEach(td => td.style.display = 'table-cell');
            document.querySelectorAll('.desktop-checkbox').forEach(chk => chk.style.display = 'inline-block');
            document.querySelectorAll('.desktop-manage-dropdown').forEach(btn => btn.style.display = 'none');
            document.querySelectorAll('.desktop-row').forEach(row => row.style.cursor = 'pointer');
            
        } else {
            if(btnManage) btnManage.innerHTML = `<i class="ph-bold ph-pencil-simple"></i> Manage`;
            if(btnDeact) btnDeact.style.display = 'none';
            
            selectedUserIds.clear();
            document.querySelectorAll('.student-checkbox, .desktop-checkbox').forEach(chk => {
                chk.style.display = 'none';
                chk.checked = false;
            });
            document.querySelectorAll('.student-card').forEach(card => card.classList.remove('selected'));
            document.querySelectorAll('.desktop-row').forEach(row => {
                row.classList.remove('selected-row');
                row.style.cursor = 'default';
            });
            
            document.querySelectorAll('.mobile-edit-btn').forEach(btn => btn.style.display = 'block');
            
            const thCheck = document.getElementById('thCheckbox');
            if(thCheck) thCheck.style.display = 'none';
            document.querySelectorAll('.td-checkbox').forEach(td => td.style.display = 'none');
            document.querySelectorAll('.desktop-manage-dropdown').forEach(btn => btn.style.display = 'block');
        }
    }
    
    function handleDesktopRowClick(id) {
        if (isBulkManageActive) {
            toggleStudentSelection(id);
        }
    }
    
    function handleCardClick(id, event) {
        if (isBulkManageActive) {
            toggleStudentSelection(id);
        } else {
            openViewModal(id, event);
        }
    }
    
    function toggleStudentSelection(id) {
        if (!isBulkManageActive) return;
        const chkMobile = document.getElementById(`chk-${id}`);
        const chkDesktop = document.getElementById(`chk-desktop-${id}`);
        const card = document.getElementById(`student-card-${id}`);
        const row = document.getElementById(`desktop-row-${id}`);
        
        let newState = false;
        if (chkMobile) {
            chkMobile.checked = !chkMobile.checked;
            newState = chkMobile.checked;
        } else if (chkDesktop) {
            chkDesktop.checked = !chkDesktop.checked;
            newState = chkDesktop.checked;
        }

        if (chkMobile) chkMobile.checked = newState;
        if (chkDesktop) chkDesktop.checked = newState;
        
        if (newState) {
            selectedUserIds.add(id);
            if(card) card.classList.add('selected');
            if(row) row.classList.add('selected-row');
        } else {
            selectedUserIds.delete(id);
            if(card) card.classList.remove('selected');
            if(row) row.classList.remove('selected-row');
        }
    }
    
    function openBulkDeleteModal(event) {
        if (selectedUserIds.size === 0) {
            document.getElementById('alertModalMessage').innerText = "Select at least one account to deactivate.";
            openModal('alertModal', event);
            return;
        }
        document.getElementById('d_id').value = Array.from(selectedUserIds).join(',');
        document.getElementById('d_name').innerText = selectedUserIds.size + " selected account(s)";
        openModal('deleteModal', event);
    }

    function renderTable(data) {
        const tbody = document.getElementById('tableBody');
        const mobileList = document.getElementById('mobileList');
        tbody.innerHTML = '';
        if (mobileList) mobileList.innerHTML = '';
        
        if(data.length === 0) {
            const searchVal = document.getElementById('searchInput').value;
            const emptyStateHtml = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted); background: var(--card-bg); border-radius: 12px; border: 1px dashed var(--border);">
                    <i class="ph-bold ph-magnifying-glass" style="font-size: 3rem; opacity: 0.3; margin-bottom: 10px; display: block;"></i>
                    <p style="margin: 0; font-size: 0.95rem;">No org adviser accounts found matching "<b>${searchVal}</b>".</p>
                </div>
            `;
            tbody.innerHTML = `<tr><td colspan="5" style="padding: 0; border: none;">${emptyStateHtml}</td></tr>`;
            if (mobileList) mobileList.innerHTML = emptyStateHtml;
            return;
        }

        data.forEach(user => {
            let badgeClass = user.status === 'Active' ? 'badge-approved' : 'badge-rejected';
            const safeAvatar = user.avatar ? user.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`;

            // Desktop Table Row
            const row = `
                <tr class="desktop-row" id="desktop-row-${user.id}" onclick="handleDesktopRowClick(${user.id})" style="cursor: default; transition: background 0.2s;">
                    <td class="td-checkbox" style="display: ${isBulkManageActive ? 'table-cell' : 'none'}; width: 40px; text-align: center; vertical-align: middle;">
                        <input type="checkbox" class="desktop-checkbox" id="chk-desktop-${user.id}" value="${user.id}" style="display: ${isBulkManageActive ? 'inline-block' : 'none'}; width: 18px; height: 18px; accent-color: var(--danger); pointer-events: none; margin: 0;">
                    </td>
                    <td>
                        <div class="user-cell">
                            <img src="${safeAvatar}" class="user-avatar">
                            <div>
                                <span class="user-name">${user.name}</span>
                                <span class="user-username">Organization Adviser</span>
                            </div>
                        </div>
                    </td>
                    <td style="font-family: monospace; font-weight: 600; text-align: center;">${user.username}</td>
                    <td style="font-weight: 800; color: var(--accent); text-align: center;">${user.org}</td>
                    <td style="text-align: center;"><span class="badge ${badgeClass}">${user.status}</span></td>
                    <td style="text-align: center;">
                        <div class="actions-dropdown desktop-manage-dropdown" id="dropdown-${user.id}">
                            <button class="btn-action-small" onclick="event.stopPropagation(); toggleMenu(${user.id})">
                                <i class="ph-bold ph-dots-three-outline-vertical"></i> Manage
                            </button>
                            <div class="actions-menu" style="text-align:left;">
                                <a class="action-item" onclick="event.stopPropagation(); openViewModal(${user.id}, event)"><i class="ph-bold ph-user-circle"></i> View Profile</a>
                                <hr style="border-color: var(--border); margin:0;">
                                <a class="action-item danger" onclick="event.stopPropagation(); openDeleteModal(${user.id}, event)"><i class="ph-bold ph-warning-circle"></i> Deactivate Access</a>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;

            // Mobile Card Row
            if (mobileList) {
                const mobileCard = `
                    <div class="student-card" id="student-card-${user.id}" onclick="handleCardClick(${user.id}, event)" style="cursor: pointer;">
                        <input type="checkbox" class="student-checkbox" id="chk-${user.id}" value="${user.id}">
                        <img src="${safeAvatar}" class="user-avatar" style="width: 45px; height: 45px; border-radius: 50%;">
                        <div style="flex-grow: 1;">
                            <span class="user-name" style="font-size: 0.95rem; word-break: break-word;">${user.name}</span>
                            <div style="display: flex; gap: 8px; align-items: center; margin-top: 3px;">
                                <span style="font-size: 0.7rem; font-weight: 700; color: var(--accent);">${user.org}</span>
                                <span class="badge ${badgeClass}" style="font-size: 0.6rem; padding: 2px 6px;">${user.status}</span>
                            </div>
                        </div>
                    </div>
                `;
                mobileList.innerHTML += mobileCard;
            }
        });

        // Re-apply bulk manage state to new DOM elements if active
        if (isBulkManageActive) {
            document.querySelectorAll('.student-checkbox').forEach(chk => chk.style.display = 'block');
            document.querySelectorAll('.desktop-checkbox').forEach(chk => {
                chk.style.display = 'inline-block';
                if (selectedUserIds.has(parseInt(chk.value))) {
                    chk.checked = true;
                    document.getElementById(`desktop-row-${chk.value}`).classList.add('selected-row');
                }
            });
            document.querySelectorAll('.td-checkbox').forEach(td => td.style.display = 'table-cell');
            const thCheck = document.getElementById('thCheckbox');
            if(thCheck) thCheck.style.display = 'table-cell';
            
            document.querySelectorAll('.mobile-edit-btn, .desktop-manage-dropdown').forEach(btn => btn.style.display = 'none');
            document.querySelectorAll('.student-checkbox').forEach(chk => {
                if (selectedUserIds.has(parseInt(chk.value))) {
                    chk.checked = true;
                    document.getElementById(`student-card-${chk.value}`).classList.add('selected');
                }
            });
            document.querySelectorAll('.desktop-row').forEach(row => row.style.cursor = 'pointer');
        }
    }

    function filterUsers() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        
        const filtered = usersData.filter(user => {
            const matchSearch = user.name.toLowerCase().includes(search) || user.username.toLowerCase().includes(search) || user.org.toLowerCase().includes(search);
            const matchOrg = currentOrgFilter === 'all' || user.org === currentOrgFilter;
            return matchSearch && matchOrg;
        });
        renderTable(filtered);
    }

    function toggleMenu(id) {
        document.querySelectorAll('.actions-dropdown').forEach(d => {
            if(d.id !== `dropdown-${id}`) d.classList.remove('active');
        });
        document.getElementById(`dropdown-${id}`).classList.toggle('active');
    }

    window.onclick = function(event) {
        if (!event.target.matches('.btn-action-small') && !event.target.matches('.ph-dots-three-outline-vertical')) {
            document.querySelectorAll('.actions-dropdown').forEach(d => d.classList.remove('active'));
        }
        if (!event.target.closest('.custom-dropdown')) {
            const orgDropdown = document.getElementById('orgFilterDropdown');
            if(orgDropdown) orgDropdown.classList.remove('active');
        }
    }

    // 🟢 MODAL CONTROLS 🟢
    let currentOtp = "";

    function handleOtpPaste(event, prefix) {
        event.preventDefault();
        let paste = (event.clipboardData || window.clipboardData).getData('text');
        paste = paste.replace(/\D/g, '').slice(0, 6);
        if (paste.length === 0) return;
        
        let inputs = document.querySelectorAll(`.${prefix}-otp`);
        for (let i = 0; i < paste.length; i++) {
            if (inputs[i]) inputs[i].value = paste[i];
        }
        if(paste.length > 0 && inputs[paste.length-1]) {
             inputs[paste.length-1].focus();
        }
    }

    function showError(msg) {
        showToast(msg, 'error');
    }

    function nextPhase(prefix) {
        let username = document.getElementById(prefix + '_username').value.trim();
        if (!document.getElementById(prefix + '_name').value || !document.getElementById(prefix + '_org').value || !username) {
            showError("Please fill all required fields before proceeding.");
            return;
        }
        
        // Employee ID Strict Validation
        const idRegex = /^[A-Za-z0-9-]+$/;
        if (!idRegex.test(username)) {
            showError("Invalid Employee ID format. Please use correct format (e.g. 2005-0123).");
            return;
        }
        
        if (prefix === 'c' && !document.getElementById('c_password').value) {
            showError("Please fill the password field before proceeding.");
            return;
        }
        
        let phase1 = document.getElementById(prefix + '-phase-1');
        let phase2 = document.getElementById(prefix + '-phase-2');
        
        phase1.classList.remove('active-phase', 'phase-left', 'phase-right');
        phase2.classList.add('active-phase', 'phase-right');
        
        document.getElementById(prefix + '-bar-2').style.background = 'var(--accent)';
    }

    function prevPhase(prefix) {
        let phase1 = document.getElementById(prefix + '-phase-1');
        let phase2 = document.getElementById(prefix + '-phase-2');
        
        phase2.classList.remove('active-phase', 'phase-left', 'phase-right');
        phase1.classList.add('active-phase', 'phase-left');
        
        document.getElementById(prefix + '-bar-2').style.background = 'var(--border)';
    }

    function toggleCustomDropdown(id) {
        document.querySelectorAll('.select-dropdown-container').forEach(d => {
            if (d.id !== id) d.classList.remove('active');
        });
        document.getElementById(id).classList.toggle('active');
    }

    function selectCustomOption(inputId, value, labelText) {
        document.getElementById(inputId).value = value;
        document.getElementById(inputId + '_label').innerText = labelText;
        document.getElementById(inputId + '_dropdown').classList.remove('active');
    }

    function openViewModal(id, event) {
        const user = usersData.find(u => u.id === id);
        const safeAvatar = user.avatar ? user.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`;
        const safeCover = user.cover_photo ? user.cover_photo : `https://picsum.photos/seed/${user.id}/400/200`;
        
        document.getElementById('v_id').value = user.id;
        document.getElementById('v_avatar').src = safeAvatar;
        document.getElementById('v_cover').style.backgroundImage = `url('${safeCover}')`;
        document.getElementById('v_name').innerText = user.name;
        document.getElementById('v_org').innerText = user.org;
        document.getElementById('v_username').innerText = user.username;
        document.getElementById('v_dept').innerText = user.department || 'CICS';
        openModal('viewDetailsModal', event);
    }

    function openModal(modalId, event) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        const modalBox = modal.querySelector('.modal-box');
        
        if (window.innerWidth <= 900) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
            return;
        }

        let originEl = null;
        if (event) {
            originEl = event.currentTarget || event.target;
            if (originEl.nodeType === 3) originEl = originEl.parentNode;
            modal._originElement = originEl;
        } else {
            modal._originElement = null;
        }

        if (modal._originElement && modalBox) {
            modal.style.display = 'flex';
            modal.style.opacity = '0';
            modalBox.style.transition = 'none';
            
            requestAnimationFrame(() => {
                const originRect = modal._originElement.getBoundingClientRect();
                const modalRect = modalBox.getBoundingClientRect();
                
                const startX = originRect.left + (originRect.width / 2);
                const startY = originRect.top + (originRect.height / 2);
                const endX = modalRect.left + (modalRect.width / 2);
                const endY = modalRect.top + (modalRect.height / 2);
                
                const translateX = startX - endX;
                const translateY = startY - endY;
                const scaleX = originRect.width / (modalRect.width || 1);
                const scaleY = originRect.height / (modalRect.height || 1);
                const scale = Math.max(Math.min(scaleX, scaleY), 0.05);
                
                modalBox.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
                modalBox.style.opacity = '0';
                modalBox.style.transformOrigin = 'center';
                
                modal.style.opacity = '1';
                void modalBox.offsetWidth; // reflow
                
                modalBox.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1), opacity 0.3s ease';
                modalBox.style.transform = 'translate(0, 0) scale(1)';
                modalBox.style.opacity = '1';
                
                modal.classList.add('active');
            });
        } else {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
            if (modalBox) {
                modalBox.style.transform = '';
                modalBox.style.transition = '';
                modalBox.style.opacity = '';
            }
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        const modalBox = modal.querySelector('.modal-box');
        
        function finalizeClose() {
            modal.style.display = 'none';
            if (modalBox) {
                modalBox.style.transform = '';
                modalBox.style.transition = '';
                modalBox.style.opacity = '';
            }
            modal._originElement = null;
            if (modalId === 'createOrgModal' || modalId === 'editOrgModal') {
                let prefix = modalId === 'createOrgModal' ? 'c' : 'e';
                if(document.getElementById(prefix + '-phase-1')) {
                    let p1 = document.getElementById(prefix + '-phase-1');
                    let p2 = document.getElementById(prefix + '-phase-2');
                    p1.classList.remove('phase-left', 'phase-right');
                    p1.classList.add('active-phase');
                    p2.classList.remove('active-phase', 'phase-left', 'phase-right');
                    const bar2 = document.getElementById(prefix + '-bar-2');
                    if(bar2) bar2.style.background = 'var(--border)';
                }
            }
        }

        if (window.innerWidth <= 900) {
            modal.classList.remove('active');
            setTimeout(finalizeClose, 200);
            return;
        }

        if (modal._originElement && modalBox) {
            const originRect = modal._originElement.getBoundingClientRect();
            const modalRect = modalBox.getBoundingClientRect();
            
            const startX = originRect.left + (originRect.width / 2);
            const startY = originRect.top + (originRect.height / 2);
            const endX = modalRect.left + (modalRect.width / 2);
            const endY = modalRect.top + (modalRect.height / 2);
            
            const translateX = startX - endX;
            const translateY = startY - endY;
            const scaleX = originRect.width / (modalRect.width || 1);
            const scaleY = originRect.height / (modalRect.height || 1);
            const scale = Math.max(Math.min(scaleX, scaleY), 0.05);
            
            modalBox.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
            modalBox.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
            modalBox.style.opacity = '0';
            
            modal.classList.remove('active');
            
            setTimeout(finalizeClose, 300);
        } else {
            modal.classList.remove('active');
            setTimeout(finalizeClose, 200);
        }
    }

    function clearForm(prefix) {
        document.querySelectorAll(`.${prefix}-otp`).forEach(inp => inp.value = '');
        document.getElementById(`${prefix}_password`).value = '';
    }

    function openDeleteModal(id, event) {
        const user = usersData.find(u => u.id === id);
        document.getElementById('d_id').value = user.id;
        document.getElementById('d_name').innerText = user.name + ' (' + user.org + ')';
        openModal('deleteModal', event);
    }

    async function generateAndSendPassword(prefix) {
        let email = document.getElementById(prefix + '_email').value;
        if (!email) {
            showError("Please enter an email address first.");
            return;
        }
        
        let btn = document.getElementById('btn-generate-' + prefix);
        let originalText = "Generate";
        btn.innerHTML = `<i class="ph-bold ph-spinner ph-spin" style="animation: spin 1s linear infinite;"></i>`;
        btn.disabled = true;

        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
        const tokenValue = csrfToken ? csrfToken.split('=')[1] : '';

        try {
            const response = await fetch("/admin/api/generate-adviser-password/", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': tokenValue },
                body: JSON.stringify({ email: email, prefix: prefix })
            });

            const data = await response.json();
            if(data.status === 'success') {
                showToast(data.message);
                
                // 60-second cooldown timer
                let timeLeft = 60;
                let timer = setInterval(() => {
                    btn.innerHTML = `Wait ${timeLeft}s`;
                    btn.disabled = true;
                    if (timeLeft <= 0) {
                        clearInterval(timer);
                        btn.disabled = false;
                        btn.innerHTML = "Generate";
                    }
                    timeLeft -= 1;
                }, 1000);
                
            } else {
                showError("Error: " + data.message);
                btn.innerHTML = "Generate";
                btn.disabled = false;
            }
        } catch (error) {
            showError("Server Error. Please try again.");
            btn.innerHTML = "Generate";
            btn.disabled = false;
        }
    }

    function showToast(message, type='success') {
        const toast = document.getElementById('customToast');
        const icon = document.getElementById('toastIcon');
        document.getElementById('toastMessage').innerText = message;
        if (type === 'error') {
            toast.style.background = '#ef4444'; // Red
            icon.className = 'ph-bold ph-warning-circle';
        } else {
            toast.style.background = '#10b981'; // Green
            icon.className = 'ph-bold ph-check-circle';
        }
        toast.style.bottom = '30px';
        setTimeout(() => {
            toast.style.bottom = '-100px';
        }, 4000);
    }

    // 🟢 DATABASE API REQUESTS (CREATE, EDIT, DELETE) 🟢
    async function submitAction(action) {
        let payload = { action: action };
        let btn;

        if (action === 'create') {
            payload.name = document.getElementById('c_name').value;
            payload.org = document.getElementById('c_org').value;
            payload.username = document.getElementById('c_username').value;
            payload.email = document.getElementById('c_email').value;
            if(!payload.name || !payload.org || !payload.username || !payload.email) return showError("Fill all fields.");
            btn = document.getElementById('btn-create');
        } 
        else if (action === 'delete') {
            payload.id = document.getElementById('d_id').value;
            btn = document.getElementById('btn-delete');
        }

        const originalText = btn.innerHTML;
        btn.innerHTML = `<i class="ph-bold ph-spinner ph-spin" style="animation: spin 1s linear infinite;"></i> Saving...`;
        btn.disabled = true;

        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
        const tokenValue = csrfToken ? csrfToken.split('=')[1] : '';

        try {
            const response = await fetch("/admin/api/adviser-action/", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': tokenValue },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if(data.status === 'success') {
                closeModal('createOrgModal');
                closeModal('deleteModal');
                
                showToast(data.message, 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                showToast("Error: " + data.message, 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (error) {
            showToast("Server Error. Please try again.", 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            renderTable(usersData);
        }, 800);
    });
