function initTheme() {
            const savedTheme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);
            if (savedTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            updateIcons(savedTheme);
            
            const sidebarState = localStorage.getItem('sidebarState');
            if(sidebarState === 'collapsed') {
                document.body.classList.remove('sidebar-expanded');
            }
        }
        
        function toggleTheme() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            if (newTheme === 'dark') {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
            localStorage.setItem('theme', newTheme);
            updateIcons(newTheme);
        }
        
        function updateIcons(theme) {
            const icons = document.querySelectorAll('.theme-toggle');
            icons.forEach(icon => {
                if(theme === 'light') icon.classList.replace('ph-moon', 'ph-sun');
                else icon.classList.replace('ph-sun', 'ph-moon');
            });
        }

        // 🟢 SCRIPT PARA MAG-CLOSE ANG DROPDOWN KAPAG PUMINDOT SA LABAS 🟢
        window.addEventListener('click', function(e) {
            const manageDropdown = document.getElementById('manageDropdown');
            const orgDropdown = document.getElementById('orgMonitorDropdown');
            
            if (manageDropdown && !manageDropdown.contains(e.target)) {
                manageDropdown.classList.remove('open');
            }
            if (orgDropdown && !orgDropdown.contains(e.target)) {
                orgDropdown.classList.remove('open');
            }
        });

        function toggleSidebar() {
            const body = document.body;
            body.classList.toggle('sidebar-expanded');
            if (body.classList.contains('sidebar-expanded')) {
                localStorage.setItem('sidebarState', 'expanded');
            } else {
                localStorage.setItem('sidebarState', 'collapsed');
                document.getElementById('manageDropdown')?.classList.remove('open');
                document.getElementById('orgMonitorDropdown')?.classList.remove('open');
            }
        }
        
        function confirmLogout() { 
            const modal = document.getElementById('logoutModal');
            modal.style.display = 'flex'; 
            setTimeout(() => { modal.classList.add('active'); }, 10);
        }
        
        function closeModal(modalId) {
            const modal = document.getElementById(modalId);
            modal.classList.remove('active');
            setTimeout(() => { modal.style.display = 'none'; }, 200);
        }

        // 🟢 ADMIN NOTIFICATION SYSTEM (VANILLA JS) 🟢
        let adminNotifications = [];
        let adminReadNotifs = JSON.parse(localStorage.getItem('admin_read_notifs') || '[]');
        let activeBanners = [];

        function toggleAdminNotifications() {
            const dropdown = document.getElementById('adminNotifDropdown');
            dropdown.classList.toggle('active');
            if(dropdown.classList.contains('active')) { fetchAdminNotifs(); }
        }

        // Close dropdown when clicking outside
        window.addEventListener('click', function(e) {
            const dropdown = document.getElementById('adminNotifDropdown');
            const bellIcon = document.getElementById('notifBell');
            const badge = document.getElementById('notifBadge');
            
            if (dropdown && !dropdown.contains(e.target) && e.target !== bellIcon && e.target !== badge) {
                dropdown.classList.remove('active');
            }
        });

        function fetchAdminNotifs() {
            if(document.hidden) return;
            fetch('/admin/api/notifications/')
                .then(r => r.json())
                .then(data => {
                    if(data.status === 'success') {
                        const newNotifs = data.notifications;
                        
                        // Check for new unread notifications (Popup banners disabled as requested)
                        newNotifs.forEach(notif => {
                            const exists = adminNotifications.find(n => n.id === notif.id);
                            if(!exists && !adminReadNotifs.includes(notif.id)) {
                                // showNotificationBanner(notif);
                            }
                        });
                        
                        adminNotifications = newNotifs;
                        renderAdminNotifDropdown();
                    }
                }).catch(e => console.log('Error fetching notifications:', e));
        }

        function renderAdminNotifDropdown() {
            const unreadCount = adminNotifications.filter(n => !adminReadNotifs.includes(n.id)).length;
            const bell = document.getElementById('notifBell');
            const badge = document.getElementById('notifBadge');
            const dropBadge = document.getElementById('notifDropdownBadge');
            const list = document.getElementById('notifList');
            const mobileBell = document.getElementById('notifBellMobile');
            const mobileBadge = document.getElementById('notifBadgeMobile');

            if(unreadCount > 0) {
                if (bell) bell.classList.add('notify-active');
                if (badge) { badge.style.display = 'flex'; badge.innerText = unreadCount > 9 ? '9+' : unreadCount; }
                if (dropBadge) dropBadge.innerText = unreadCount + ' New';
                
                if (mobileBell) mobileBell.classList.add('notify-active');
                if (mobileBadge) {
                    mobileBadge.style.display = 'flex';
                    mobileBadge.innerText = unreadCount > 9 ? '9+' : unreadCount;
                }
            } else {
                if (bell) bell.classList.remove('notify-active');
                if (badge) badge.style.display = 'none';
                if (dropBadge) dropBadge.innerText = '0 New';
                
                if (mobileBell) mobileBell.classList.remove('notify-active');
                if (mobileBadge) mobileBadge.style.display = 'none';
            }

            if(!list) return;

            if(adminNotifications.length === 0) {
                list.innerHTML = `
                    <div style="padding: 30px; text-align: center; color: var(--text-muted);">
                        <i class="ph-bold ph-bell-slash" style="font-size: 2.5rem; margin-bottom: 10px; opacity: 0.5;"></i>
                        <p style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">No notifications yet</p>
                    </div>`;
                return;
            }

            let html = '';
            adminNotifications.slice(0, 5).forEach(notif => {
                const isRead = adminReadNotifs.includes(notif.id);
                let icon = 'ph-bell';
                if(notif.type === 'alert') icon = 'ph-warning-circle';
                if(notif.type === 'event') icon = 'ph-calendar-check';

                html += `
                    <div class="notif-item" onclick="handleAdminNotifClick('${notif.id}', '${notif.url || '#'}')" style="opacity: ${isRead ? '0.6' : '1'};">
                        <div class="notif-item-icon"><i class="ph-fill ${icon}"></i></div>
                        <div style="flex: 1; overflow: hidden;">
                            <h5 style="font-size: 0.75rem; font-weight: 800; color: var(--text-main); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase;">${notif.title}</h5>
                            <p style="font-size: 0.7rem; color: var(--text-muted); line-height: 1.2; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${notif.message}</p>
                            <span style="font-size: 0.6rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">${notif.date}</span>
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;
        }

        function handleAdminNotifClick(id, url) {
            if(!adminReadNotifs.includes(id)) {
                adminReadNotifs.push(id);
                localStorage.setItem('admin_read_notifs', JSON.stringify(adminReadNotifs));
            }
            if(url && url !== '#') {
                window.location.href = url;
            } else {
                renderAdminNotifDropdown();
            }
        }

        function showNotificationBanner(notif) {
            const container = document.getElementById('banner-container');
            if(!container) return;

            const banner = document.createElement('div');
            banner.className = 'notification-banner';
            
            let icon = 'ph-bell';
            if(notif.type === 'alert') icon = 'ph-warning-circle';
            if(notif.type === 'event') icon = 'ph-calendar-check';

            banner.innerHTML = `
                <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(128,0,0,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--pup-maroon); font-size: 1.2rem;">
                    <i class="ph-fill ${icon}"></i>
                </div>
                <div style="flex-grow: 1; overflow: hidden;">
                    <h4 style="font-size: 0.75rem; font-weight: 900; color: var(--text-main); text-transform: uppercase; margin-bottom: 2px;">${notif.title}</h4>
                    <p style="font-size: 0.7rem; color: var(--text-muted); font-weight: 500; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${notif.message}</p>
                </div>
                <button onclick="this.parentElement.remove()" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 5px;">
                    <i class="ph-bold ph-x"></i>
                </button>
            `;

            banner.onclick = (e) => {
                if(e.target.tagName !== 'BUTTON' && e.target.tagName !== 'I') {
                    handleAdminNotifClick(notif.id, notif.url);
                }
            };

            container.appendChild(banner);
            
            // Auto hide after 6 seconds
            setTimeout(() => {
                if(container.contains(banner)) {
                    banner.classList.add('hiding');
                    setTimeout(() => {
                        if(container.contains(banner)) banner.remove();
                    }, 300);
                }
            }, 6000);
        }

        // --- Mobile Layout Logic (Bottom Nav & Modals) ---
        function toggleProfileBubble() {
            const overlay = document.getElementById('profileBubbleOverlay');
            const card = document.getElementById('profileBubbleCard');
            if (overlay.classList.contains('active')) {
                overlay.classList.remove('active');
                card.classList.remove('active');
            } else {
                overlay.classList.add('active');
                card.classList.add('active');
            }
        }

        function openBottomSheet(sheetId, btnEl) {
            const overlayId = sheetId.replace('Sheet', 'Overlay');
            document.getElementById(overlayId).classList.add('active');
            document.getElementById(sheetId).classList.add('active');
            updateNavIndicator(btnEl);
        }

        function closeBottomSheet(sheetId) {
            const overlayId = sheetId.replace('Sheet', 'Overlay');
            document.getElementById(overlayId).classList.remove('active');
            document.getElementById(sheetId).classList.remove('active');
            
            // Revert indicator back to the truly active link
            setTimeout(() => {
                const trulyActive = document.querySelector('.mobile-nav-scroll .nav-item-btn.active');
                if (trulyActive) updateNavIndicator(trulyActive);
            }, 300);
        }

        function navigateBottomNav(btnEl, url) {
            updateNavIndicator(btnEl);
            setTimeout(() => {
                window.location.href = url;
            }, 200);
        }

        function updateNavIndicator(targetEl) {
            const indicator = document.getElementById('navIndicator');
            const scrollContainer = document.getElementById('mobileNavScroll');
            if (!indicator || !targetEl || !scrollContainer) return;
            
            // Remove active classes from others visually
            document.querySelectorAll('.mobile-nav-scroll .nav-item-btn').forEach(btn => {
                if(btn !== targetEl && !btn.classList.contains('active')) {
                    btn.querySelector('i').classList.replace('ph-fill', 'ph-bold');
                }
            });

            // Make target visually active
            targetEl.querySelector('i').classList.replace('ph-bold', 'ph-fill');

            const containerRect = scrollContainer.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();
            
            // Calculate relative position accounting for scroll
            const offsetLeft = targetRect.left - containerRect.left + scrollContainer.scrollLeft;
            
            indicator.style.width = `${targetRect.width}px`;
            indicator.style.left = `${offsetLeft}px`;
            indicator.style.opacity = '1';
        }

        function updateNavArrows() {
            const scroll = document.getElementById('mobileNavScroll');
            const leftArrow = document.getElementById('navLeftArrow');
            const rightArrow = document.getElementById('navRightArrow');
            if (!scroll || !leftArrow || !rightArrow) return;
            
            leftArrow.style.opacity = scroll.scrollLeft > 5 ? '1' : '0';
            rightArrow.style.opacity = (scroll.scrollLeft < scroll.scrollWidth - scroll.clientWidth - 5) ? '1' : '0';
        }

        function initMobileNav() {
            if (window.innerWidth > 900) return;
            const activeNav = document.querySelector('.mobile-nav-scroll .nav-item-btn.active');
            if (activeNav) {
                // Ensure layout is rendered before calculating width
                setTimeout(() => updateNavIndicator(activeNav), 100);
                // Center the active item in the scroll view
                activeNav.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
            setTimeout(updateNavArrows, 150);
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth <= 900) {
                initMobileNav();
                updateNavArrows();
            }
        });

        window.addEventListener('load', () => { 
            initTheme(); 
            initMobileNav();

            fetchAdminNotifs();
            setInterval(fetchAdminNotifs, 15000); // Poll every 15s

            // Geo-location tracking for Admins
            if (navigator.geolocation) {
                navigator.geolocation.watchPosition((pos) => {
                    fetch('/api/update-user-location/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': (document.cookie.split('; ').find(row => row.startsWith('csrftoken=')) ? document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1] : '')
                        },
                        body: JSON.stringify({
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude
                        })
                    }).catch(err => console.log(err));
                }, (err) => console.log('Location access denied'), { enableHighAccuracy: true });
            }
        });

        document.addEventListener("DOMContentLoaded", () => {
            const shatterLoader = document.getElementById("global-shatter-loader");
            if (shatterLoader) {
                setTimeout(() => {
                    shatterLoader.style.opacity = '0';
                    shatterLoader.style.pointerEvents = 'none';
                }, 400); 
            }

            document.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', function(e) {
                    if (this.target === '_blank' || this.hasAttribute('download')) return;
                    const href = this.getAttribute('href');
                    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
                    if (href.startsWith('http') && !this.href.includes(window.location.host)) return;
                    
                    if (shatterLoader) {
                        shatterLoader.style.opacity = '1';
                        shatterLoader.style.pointerEvents = 'auto';
                    }
                });
            });

            // Live GPS Location Sync for Document Tracking
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    fetch("/api/update-user-location/", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": (document.cookie.split('; ').find(row => row.startsWith('csrftoken=')) ? document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1] : '')
                        },
                        body: JSON.stringify({
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude
                        })
                    }).catch(() => {});
                }, () => {}, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
            }
        });
