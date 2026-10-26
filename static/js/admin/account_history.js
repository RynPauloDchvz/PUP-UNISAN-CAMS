let historyData = [];
try {
    const el = document.getElementById('history-data');
    if (el && el.textContent) historyData = JSON.parse(el.textContent);
} catch (e) {
    console.error("Error parsing historyData:", e);
}

    function renderTable(data) {
        const tbody = document.getElementById('tableBody');
        const mobileList = document.getElementById('mobileList');
        tbody.innerHTML = '';
        mobileList.innerHTML = '';
        
        if(data.length === 0) {
            const searchVal = (window.innerWidth <= 900) ? document.getElementById('searchInputMobile').value : document.getElementById('searchInput').value;
            let emptyStateHtml = '';
            
            if (searchVal.trim() === '') {
                emptyStateHtml = `
                    <div style="text-align: center; padding: 40px; color: var(--text-muted); background: var(--card-bg); border-radius: 12px; border: 1px dashed var(--border);">
                        <i class="ph-bold ph-users" style="font-size: 3rem; opacity: 0.3; margin-bottom: 10px; display: block;"></i>
                        <p style="margin: 0; font-size: 0.95rem;">No history records available yet.</p>
                    </div>
                `;
            } else {
                emptyStateHtml = `
                    <div style="text-align: center; padding: 40px; color: var(--text-muted); background: var(--card-bg); border-radius: 12px; border: 1px dashed var(--border);">
                        <i class="ph-bold ph-magnifying-glass" style="font-size: 3rem; opacity: 0.3; margin-bottom: 10px; display: block;"></i>
                        <p style="margin: 0; font-size: 0.95rem;">No account found matching "<b>${searchVal}</b>".</p>
                    </div>
                `;
            }
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 0; border: none;">${emptyStateHtml}</td></tr>`;
            mobileList.innerHTML = emptyStateHtml;
            return;
        }

        data.forEach(user => {
            // Desktop Row
            const row = `
                <tr>
                    <td>
                        <div class="user-cell">
                            <img src="${user.avatar}" class="user-avatar">
                            <div>
                                <span class="user-name">${user.name}</span>
                                <span class="user-username">${user.username}</span>
                            </div>
                        </div>
                    </td>
                    <td style="font-weight: 700;">${user.type}</td>
                    <td style="font-weight: 800; color: var(--accent);">${user.org}</td>
                    <td>${user.year}</td>
                    <td><span class="badge badge-rejected">${user.status}</span></td>
                    <td style="text-align: center;">
                        <button class="btn-action-small" onclick="viewProfile('${user.id}', event)">
                            <i class="ph-bold ph-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;

            // Mobile Card
            const card = `
                <div class="history-card">
                    <img src="${user.avatar}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border);">
                    <div style="flex-grow: 1;">
                        <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-main); display: block;">${user.name}</span>
                        <div style="display: flex; gap: 8px; align-items: center; margin-top: 3px;">
                            <span style="font-size: 0.7rem; font-weight: 700; color: var(--accent);">${user.org}</span>
                            <span class="badge badge-rejected" style="font-size: 0.6rem; padding: 2px 6px;">${user.status}</span>
                        </div>
                    </div>
                    <button class="btn-action-small" onclick="viewProfile('${user.id}', event)" style="padding: 10px; border-radius: 8px; flex-shrink: 0;">
                        <i class="ph-bold ph-eye" style="font-size: 1.1rem; margin:0;"></i>
                    </button>
                </div>
            `;
            mobileList.innerHTML += card;
        });
    }

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('active'));
        }
    });

    function toggleCustomDropdown(menuId) {
        const container = document.getElementById(menuId).closest('.custom-dropdown');
        const isActive = container.classList.contains('active');
        document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('active'));
        if (!isActive) container.classList.add('active');
    }

    function selectFilter(inputId, value, labelText) {
        document.getElementById(inputId).value = value;
        document.getElementById(inputId + 'Label').innerText = labelText;
        document.getElementById(inputId).dispatchEvent(new Event('change'));
        document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('active'));
        
        // Highlight active item
        const dropdownMenu = document.getElementById(inputId + 'Container').querySelector('.custom-dropdown-menu');
        if (dropdownMenu) {
            dropdownMenu.querySelectorAll('.dropdown-item').forEach(el => el.classList.remove('active'));
            const activeEl = Array.from(dropdownMenu.querySelectorAll('.dropdown-item')).find(el => el.innerText.includes(labelText) || el.innerText === labelText);
            if(activeEl) activeEl.classList.add('active');
        }
    }

    function filterHistory() {
        const searchInput = (window.innerWidth <= 900) ? document.getElementById('searchInputMobile') : document.getElementById('searchInput');
        const search = searchInput ? searchInput.value.toLowerCase() : '';
        const type = document.getElementById('typeFilter').value;
        const org = document.getElementById('orgFilter').value;
        const year = document.getElementById('yearFilter').value;
        
        // Hide Year Filter if Adviser or Student Org
        if (type === 'Adviser') {
            document.body.classList.add('hide-year');
        } else {
            document.body.classList.remove('hide-year');
        }
        
        const filtered = historyData.filter(user => {
            const matchSearch = user.name.toLowerCase().includes(search) || user.username.toLowerCase().includes(search);
            const matchType = type === 'all' || user.type === type;
            const matchOrg = org === 'all' || user.org === org;
            const matchYear = type === 'Adviser' || year === 'all' || user.year === year || user.year === 'N/A';
            return matchSearch && matchType && matchOrg && matchYear;
        });
        renderTable(filtered);
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

    function viewProfile(id, event) {
        const user = historyData.find(u => u.id == id);
        if (!user) return;
        
        const safeAvatar = user.avatar ? user.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`;
        document.getElementById('v_avatar').src = safeAvatar;
        
        const coverEl = document.getElementById('v_cover_container');
        if (user.cover) {
            coverEl.style.backgroundImage = `url('${user.cover}')`;
        } else {
            coverEl.style.backgroundImage = "url('/static/images/PUP1.jpg')";
        }
        
        document.getElementById('v_name').innerText = user.name;
        document.getElementById('v_type_badge').innerText = user.type;
        document.getElementById('v_username').innerText = user.username;
        document.getElementById('v_org').innerText = user.org;
        document.getElementById('v_year').innerText = user.year || 'N/A';
        
        const vBirthContainer = document.getElementById('v_birthdate_container');
        const vYearContainer = document.getElementById('v_year_container');
        const vUserContainer = document.getElementById('v_username_container');
        const vOrgContainer = document.getElementById('v_org_container');

        if (user.type === 'Student Org') {
            if (vBirthContainer) vBirthContainer.style.display = 'none';
            if (vYearContainer) {
                vYearContainer.style.display = 'block';
                vYearContainer.style.order = '1';
                vYearContainer.style.gridColumn = 'auto';
            }
            if (vOrgContainer) vOrgContainer.style.order = '2';
            if (vUserContainer) {
                vUserContainer.style.order = '3';
                vUserContainer.style.gridColumn = '1 / -1';
            }
        } else if (user.type === 'Adviser') {
            if (vBirthContainer) vBirthContainer.style.display = 'none';
            if (vYearContainer) vYearContainer.style.display = 'none';
            if (vUserContainer) {
                vUserContainer.style.order = '1';
                vUserContainer.style.gridColumn = 'auto';
            }
            if (vOrgContainer) vOrgContainer.style.order = '2';
        } else {
            // Student
            if (vBirthContainer) vBirthContainer.style.display = 'none';
            if (vUserContainer) {
                vUserContainer.style.order = '1';
                vUserContainer.style.gridColumn = 'auto';
            }
            if (vOrgContainer) {
                vOrgContainer.style.order = '2';
                vOrgContainer.style.gridColumn = 'auto';
            }
            if (vYearContainer) {
                vYearContainer.style.display = 'block';
                vYearContainer.style.order = '3';
                vYearContainer.style.gridColumn = '1 / -1';
            }
            
            const vBirth = document.getElementById('v_birthdate');
            if (vBirth) {
                if (user.birthdate && user.birthdate !== '') {
                    let dateObj = new Date(user.birthdate);
                    let formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                    vBirth.innerText = isNaN(dateObj) ? user.birthdate : formattedDate;
                } else {
                    vBirth.innerText = 'Not Provided';
                }
            }
        }
        
        openModal('profileModal', event);
    }
    
    

    window.addEventListener('load', () => {
        const historyBtn = document.getElementById('historyBackButton');
        const historyBtnText = document.getElementById('historyBtnText');
        const typeFilter = document.getElementById('typeFilter');
        
        const urlParams = new URLSearchParams(window.location.search);
        const source = urlParams.get('source');
        const referrer = document.referrer;
        
        if (source === 'adviser' || referrer.includes('manage_advisers') || referrer.includes('manage-advisers')) {
            historyBtn.href = "/admin/manage-advisers/";
            historyBtnText.innerText = "Back to Adviser";
            selectFilter('typeFilter', 'Adviser', 'Org Advisers Only');
        } else if (source === 'org' || referrer.includes('manage_organizers') || referrer.includes('manage-organizers')) {
            historyBtn.href = "/admin/manage-organizers/";
            historyBtnText.innerText = "Back to Organizer";
            selectFilter('typeFilter', 'Student Org', 'Student Orgs Only');
        } else if (source === 'student' || referrer.includes('manage_accounts') || referrer.includes('manage-accounts')) {
            historyBtn.href = "/admin/manage-accounts/";
            historyBtnText.innerText = "Back to Student";
            selectFilter('typeFilter', 'Student', 'Students Only');
        } else {
            historyBtn.href = "/admin/manage-accounts/";
            historyBtnText.innerText = "Back to Active";
            selectFilter('typeFilter', 'all', 'All Accounts');
        }

        setTimeout(() => {
            filterHistory();
        }, 800);
    });
