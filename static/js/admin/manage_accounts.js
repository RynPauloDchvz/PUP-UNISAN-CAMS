let usersData = [];
try {
    const el = document.getElementById('students-data');
    if (el && el.textContent) usersData = JSON.parse(el.textContent);
} catch (e) {
    console.error("Error parsing studentsData:", e);
}
    let isBulkManageActive = false;
    let selectedUserIds = new Set();

    function renderTable(data, searchString = "", orgFilter = "all") {
        const tbody = document.getElementById('tableBody');
        const mobileList = document.getElementById('mobileCardList');
        if (tbody) tbody.innerHTML = '';
        if (mobileList) mobileList.innerHTML = '';
        
        if (data.length === 0) {
            let messageHtml = '';
            let iconClass = 'ph-magnifying-glass';
            
            if (searchString) {
                messageHtml = `No student account found matching "<span style="color: var(--text-main);">${searchString}</span>"`;
            } else {
                if (orgFilter !== 'all') {
                    iconClass = 'ph-users';
                    messageHtml = `No students found in this organization. <br><span style="font-size:0.85rem; font-weight:500;">Please wait for students to enroll to fill the org.</span>`;
                } else {
                    iconClass = 'ph-users';
                    messageHtml = `No student accounts found in the system.`;
                }
            }
            
            if(tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px 20px; color: var(--text-muted);"><i class="ph-bold ${iconClass}" style="font-size: 3rem; color: var(--border); margin-bottom: 10px; display: block;"></i><span style="font-weight: 600; font-size: 1rem; display: block; line-height: 1.4;">${messageHtml}</span></td></tr>`;
            if(mobileList) mobileList.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-muted);"><i class="ph-bold ${iconClass}" style="font-size: 3rem; color: var(--border); margin-bottom: 10px; display: block;"></i><span style="font-weight: 600; font-size: 1rem; display: block; line-height: 1.4;">${messageHtml}</span></div>`;
            return;
        }

        data.forEach(user => {
            let badgeClass = user.status === 'Active' ? 'badge-approved' : 'badge-pending';
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
                                <span class="user-username">${user.email || 'Student'}</span>
                            </div>
                        </div>
                    </td>
                    <td style="font-family: monospace; font-weight: 600; text-align: center;">${user.username}</td>
                    <td style="font-weight: 800; color: var(--accent); text-align: center;">${user.org}</td>
                    <td style="text-align: center;"><span class="badge ${badgeClass}">${user.status}</span></td>
                    <td style="text-align: center; vertical-align: middle;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 auto; width: 100%;">
                            <button class="btn-action-small desktop-manage-dropdown btn-view-action" onclick="event.stopPropagation(); openViewModal(${user.id}, event)" title="View Details">
                                <i class="ph-bold ph-eye"></i>
                            </button>
                            <button class="btn-action-small desktop-manage-dropdown btn-transfer-action" onclick="event.stopPropagation(); openSingleTransferModal(${user.id}, event)" title="Transfer to Student Org">
                                <i class="ph-bold ph-arrows-left-right"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            if (tbody) tbody.innerHTML += row;

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
            
            document.querySelectorAll('.desktop-manage-dropdown').forEach(btn => btn.style.display = 'none');
            document.querySelectorAll('.student-checkbox').forEach(chk => {
                if (selectedUserIds.has(parseInt(chk.value))) {
                    chk.checked = true;
                    document.getElementById(`student-card-${chk.value}`).classList.add('selected');
                }
            });
            document.querySelectorAll('.desktop-row').forEach(row => row.style.cursor = 'pointer');
        }
    }

    // 🟢 ANIMATED DROPDOWN CONTROLS 🟢
    function toggleOrgDropdown(e) {
        if(e) e.stopPropagation();
        const menu = document.getElementById('orgFilterMenu');
        const isClosed = menu.style.maxHeight === '0px' || menu.style.maxHeight === '';
        document.querySelectorAll('.custom-dropdown-menu').forEach(m => m.style.maxHeight = null);
        if (isClosed) {
            menu.style.maxHeight = menu.scrollHeight + "px";
        } else {
            menu.style.maxHeight = null;
        }
    }

    function selectOrgFilter(e, value, text) {
        if(e) e.stopPropagation();
        document.getElementById('orgFilterLabel').innerText = text;
        
        document.querySelectorAll('#orgFilterMenu .dropdown-item').forEach(item => item.classList.remove('active'));
        if(e) e.target.classList.add('active');
        
        document.getElementById('orgFilterMenu').style.maxHeight = null;
        
        const search = document.getElementById('searchInput').value.toLowerCase();
        const filtered = usersData.filter(user => {
            const matchSearch = user.name.toLowerCase().includes(search) || user.username.toLowerCase().includes(search);
            const matchOrg = value === 'all' || user.org === value;
            return matchSearch && matchOrg;
        });
        renderTable(filtered, search, value);
    }

    // 🟢 FILTER USERS 🟢
    function filterUsers() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        let orgValue = 'all';
        const activeOrgItem = document.querySelector('#orgFilterMenu .dropdown-item.active');
        if (activeOrgItem) {
            const onclickText = activeOrgItem.getAttribute('onclick');
            const match = onclickText.match(/selectOrgFilter\(event,\s*'([^']+)'/);
            if (match) orgValue = match[1];
        }
        
        const filtered = usersData.filter(user => {
            const matchSearch = user.name.toLowerCase().includes(search) || user.username.toLowerCase().includes(search);
            const matchOrg = orgValue === 'all' || user.org === orgValue;
            return matchSearch && matchOrg;
        });
        renderTable(filtered, search, orgValue);
    }

    // 🟢 BULK MANAGE LOGIC 🟢
    function toggleBulkManage() {
        isBulkManageActive = !isBulkManageActive;
        const btnManage = document.getElementById('btnToggleManage');
        const btnDeact = document.getElementById('btnBulkDeactivate');
        
        if (isBulkManageActive) {
            if(btnManage) btnManage.innerHTML = `<i class="ph-bold ph-x"></i> Cancel`;
            if(btnDeact) btnDeact.style.display = 'block';
            
            document.querySelectorAll('.student-checkbox').forEach(chk => chk.style.display = 'block');
            
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

    function openDeleteModal(id, event) {
        const user = usersData.find(u => u.id === id);
        document.getElementById('d_id').value = user.id;
        document.getElementById('d_name').innerText = user.name;
        openModal('deleteModal', event);
    }

    function openBulkTransferModal(event) {
        if (selectedUserIds.size === 0) {
            document.getElementById('alertModalMessage').innerText = "Please select at least one student to transfer.";
            openModal('alertModal', event);
            return;
        }
        document.getElementById('t_id').value = Array.from(selectedUserIds).join(',');
        document.getElementById('t_name').innerText = selectedUserIds.size + " selected student(s)";
        
        const staticBox = document.getElementById('transferOrgStaticBox');
        const staticLabel = document.getElementById('transferStaticOrgLabel');
        const dropdown = document.getElementById('transferOrgDropdown');
        if (staticBox) staticBox.style.display = 'flex';
        if (dropdown) dropdown.style.display = 'none';
        if (staticLabel) staticLabel.innerText = "Each student's assigned organization";
        document.getElementById('t_target_org').value = 'KEEP_ASSIGNED';

        openModal('transferModal', event);
    }

    function openSingleTransferModal(id, event) {
        const user = usersData.find(u => u.id === id);
        if (!user) return;
        document.getElementById('t_id').value = user.id;
        document.getElementById('t_name').innerText = user.name;
        
        const staticBox = document.getElementById('transferOrgStaticBox');
        const staticLabel = document.getElementById('transferStaticOrgLabel');
        const dropdown = document.getElementById('transferOrgDropdown');
        const menu = document.getElementById('transferOrgMenu');
        const targetInput = document.getElementById('t_target_org');
        const assignedOrg = user.org || 'Assigned Org';

        const coOrgs = Array.isArray(user.co_orgs) ? user.co_orgs : [];
        if (coOrgs.length > 0) {
            // Show selection between primary assigned org and co-org(s) only
            if (staticBox) staticBox.style.display = 'none';
            if (dropdown) dropdown.style.display = 'block';
            if (menu) {
                menu.innerHTML = '';
                const primItem = document.createElement('div');
                primItem.className = 'dropdown-item active';
                primItem.innerText = `${assignedOrg} (Primary Org)`;
                primItem.onclick = (e) => selectTransferOrg(assignedOrg, `${assignedOrg} (Primary Org)`, e);
                menu.appendChild(primItem);
                
                coOrgs.forEach(co => {
                    if (co.toUpperCase() !== assignedOrg.toUpperCase()) {
                        const coItem = document.createElement('div');
                        coItem.className = 'dropdown-item';
                        coItem.innerText = `${co} (Co-Organization)`;
                        coItem.onclick = (e) => selectTransferOrg(co, `${co} (Co-Organization)`, e);
                        menu.appendChild(coItem);
                    }
                });
            }
            document.getElementById('transferOrgLabel').innerText = `${assignedOrg} (Primary Org)`;
            targetInput.value = assignedOrg;
        } else {
            // Purely automatic transfer based on student's assigned org
            if (staticBox) staticBox.style.display = 'flex';
            if (dropdown) dropdown.style.display = 'none';
            if (staticLabel) staticLabel.innerText = assignedOrg;
            targetInput.value = assignedOrg;
        }

        openModal('transferModal', event);
    }

    function openSingleTransferFromViewModal(event) {
        const id = parseInt(document.getElementById('v_id').value);
        closeModal('viewDetailsModal');
        setTimeout(() => {
            openSingleTransferModal(id, event);
        }, 250);
    }

    function openSingleDeleteFromViewModal(event) {
        const id = parseInt(document.getElementById('v_id').value);
        closeModal('viewDetailsModal');
        setTimeout(() => {
            openDeleteModal(id, event);
        }, 250);
    }

    function toggleTransferOrgDropdown(e) {
        if(e) e.stopPropagation();
        const dropdown = document.getElementById('transferOrgDropdown');
        dropdown.classList.toggle('active');
        const menu = document.getElementById('transferOrgMenu');
        if (dropdown.classList.contains('active')) {
            menu.style.maxHeight = '220px';
        } else {
            menu.style.maxHeight = '0';
        }
    }

    function selectTransferOrg(val, label, e) {
        if(e) e.stopPropagation();
        document.getElementById('transferOrgLabel').innerText = label;
        document.getElementById('t_target_org').value = val;
        const menu = document.getElementById('transferOrgMenu');
        if (menu) {
            menu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            if (e && e.target) e.target.classList.add('active');
            menu.style.maxHeight = '0';
        }
        const dropdown = document.getElementById('transferOrgDropdown');
        if (dropdown) dropdown.classList.remove('active');
    }

    async function submitTransferAction() {
        const targetIds = document.getElementById('t_id').value;
        const targetOrg = document.getElementById('t_target_org').value;
        const btn = document.getElementById('btnConfirmTransfer');
        const textSpan = document.getElementById('btnTransferText');
        
        if (!targetIds) {
            showToast("No account selected.", "error");
            return;
        }

        const originalText = textSpan.innerHTML;
        btn.disabled = true;
        textSpan.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Transferring...';

        try {
            const res = await fetch("/admin/api/student-action/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    action: 'transfer_to_org',
                    id: targetIds,
                    target_org: targetOrg
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                closeModal('transferModal');
                showToast(data.message, "success");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showToast(data.message || "Failed to transfer account.", "error");
                btn.disabled = false;
                textSpan.innerHTML = originalText;
            }
        } catch (err) {
            showToast("Connection error during transfer.", "error");
            btn.disabled = false;
            textSpan.innerHTML = originalText;
        }
    }

    // 🟢 MODAL CONTROLS 🟢
    function openViewModal(id, event) {
        const user = usersData.find(u => u.id === id);
        const safeAvatar = user.avatar ? user.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`;
        document.getElementById('v_id').value = user.id;
        document.getElementById('v_avatar').src = safeAvatar;
        
        const coverEl = document.getElementById('v_cover_container');
        if (user.cover) {
            coverEl.style.backgroundImage = `url('${user.cover}')`;
        } else {
            coverEl.style.backgroundImage = "url('/static/images/PUP1.jpg')";
        }
        
        document.getElementById('v_name').innerText = user.name;
        document.getElementById('v_org').innerText = user.org;
        document.getElementById('v_username').innerText = user.username;
        document.getElementById('v_year').innerText = user.year || 'N/A';
        
        let formattedDate = 'N/A';
        if (user.birthdate) {
            let dateObj = new Date(user.birthdate);
            if (!isNaN(dateObj)) {
                formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            } else {
                formattedDate = user.birthdate;
            }
        }
        document.getElementById('v_birthdate').innerText = formattedDate;
        
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
        
        if (window.innerWidth <= 900) {
            modal.classList.remove('active');
            setTimeout(() => { modal.style.display = 'none'; }, 200);
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
            
            setTimeout(() => {
                modal.style.display = 'none';
                modalBox.style.transform = '';
                modalBox.style.transition = '';
                modalBox.style.opacity = '';
                modal._originElement = null;
            }, 300);
        } else {
            modal.classList.remove('active');
            setTimeout(() => { modal.style.display = 'none'; }, 200);
        }
    }

    function toggleMenu(id) {
        document.querySelectorAll('.actions-dropdown').forEach(d => { if(d.id !== `dropdown-${id}`) d.classList.remove('active'); });
        const drop = document.getElementById(`dropdown-${id}`);
        if (drop) drop.classList.toggle('active');
    }

    window.onclick = function(event) {
        if (!event.target.closest('.custom-dropdown-summary')) {
            document.querySelectorAll('.custom-dropdown-menu').forEach(m => m.style.maxHeight = null);
        }
        if (!event.target.matches('.btn-action-small') && !event.target.matches('.ph-dots-three-outline-vertical')) {
            document.querySelectorAll('.actions-dropdown').forEach(d => d.classList.remove('active'));
        }
    }

    let toastTimeout;
    function showToast(message, type='success') {
        const toast = document.getElementById('customToast');
        if (!toast) return;
        const icon = document.getElementById('customToastIcon');
        const msgSpan = document.getElementById('customToastMsg');
        
        if (msgSpan) msgSpan.innerText = message;
        if (type === 'success') {
            toast.style.background = '#10B981'; // Green
            if (icon) icon.className = 'ph-bold ph-check-circle';
        } else if (type === 'warning') {
            toast.style.background = '#F59E0B'; // Orange
            if (icon) icon.className = 'ph-bold ph-warning';
        } else {
            toast.style.background = '#EF4444'; // Red
            if (icon) icon.className = 'ph-bold ph-warning-circle';
        }
        
        toast.style.bottom = '30px';
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.style.bottom = '-100px';
        }, 4000);
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

    // 🟢 SERVER ACTIONS 🟢
    async function submitAction(action) {
        let payload = { action: action, id: document.getElementById('d_id').value };
        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1];

        try {
            const response = await fetch("/admin/api/student-action/", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if(data.status === 'success') {
                location.reload(); 
            } else { 
                alert("Error: " + data.message); 
            }
        } catch (error) { 
            alert("Server Error. Please try again."); 
        }
    }

    // INIT
    window.addEventListener('load', () => {
        setTimeout(() => {
            renderTable(usersData, '', 'all');
        }, 800);
    });
