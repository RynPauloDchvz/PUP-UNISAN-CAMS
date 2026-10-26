let notifications = [];
    let currentFiltered = [];
    let readNotifs = JSON.parse(localStorage.getItem('admin_read_notifs') || '[]');
    let notifOriginRect = null;

    function animateModalOpen(boxId, backdropId, originRect) {
        const box = document.getElementById(boxId);
        const backdrop = document.getElementById(backdropId);
        
        backdrop.classList.remove('hidden');
        backdrop.classList.add('flex');
        
        backdrop.style.opacity = '0';
        backdrop.style.transition = 'none';
        
        requestAnimationFrame(() => {
            void backdrop.offsetWidth;
            backdrop.style.transition = 'opacity 0.3s ease-out';
            backdrop.style.opacity = '1';
        });

        if (box) {
            if (originRect) {
                const startX = originRect.left + originRect.width / 2 - window.innerWidth / 2;
                const startY = originRect.top + originRect.height / 2 - window.innerHeight / 2;
                const scaleX = originRect.width / window.innerWidth;
                const scaleY = originRect.height / window.innerHeight;
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
    }

    function animateModalClose(boxId, backdropId, originRect, closeCallback) {
        const box = document.getElementById(boxId);
        const backdrop = document.getElementById(backdropId);
        
        if (backdrop) {
            backdrop.style.transition = 'opacity 0.3s ease-in';
            backdrop.style.opacity = '0';
        }

        if (box) {
            if (originRect) {
                const startX = originRect.left + originRect.width / 2 - window.innerWidth / 2;
                const startY = originRect.top + originRect.height / 2 - window.innerHeight / 2;
                const scaleX = originRect.width / window.innerWidth;
                const scaleY = originRect.height / window.innerHeight;
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
        
        setTimeout(() => {
            if (backdrop) {
                backdrop.classList.add('hidden');
                backdrop.classList.remove('flex');
            }
            if (closeCallback) closeCallback();
        }, 300);
    }

    function renderNotifications(dataList) {
        const container = document.getElementById('notificationsContainer');
        if (!container) return;
        
        const query = document.getElementById('searchInput').value.trim();
        
        if (dataList.length === 0) {
            const emptyIcon = query ? 'ph-magnifying-glass' : 'ph-bell-slash';
            const emptyText = query ? `No notification found matching "${query}"` : 'You have no notifications yet.';
            
            container.innerHTML = `
                <div class="p-12 text-center">
                    <i class="ph-fill ${emptyIcon} text-5xl text-gray-300 dark:text-gray-700 mb-3 block"></i>
                    <h3 class="text-gray-500 dark:text-gray-400 text-lg font-normal">
                        ${emptyText}
                    </h3>
                </div>
            `;
            return;
        }

        let htmlString = '';
        dataList.forEach((notif, index) => {
            const isRead = readNotifs.includes(notif.id);
            
            let borderClass = 'border-l-blue-500';
            let iconBg = 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
            let iconClass = 'ph-megaphone';

            if (notif.type === 'student') {
                borderClass = 'border-l-blue-500';
                iconBg = 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
                iconClass = 'ph-user-plus';
            } else if (notif.type === 'alert') {
                borderClass = 'border-l-red-500';
                iconBg = 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
                iconClass = 'ph-warning-circle';
            } else if (notif.type === 'event') {
                if (notif.status === 'Approved') {
                    borderClass = 'border-l-green-500';
                    iconBg = 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
                    iconClass = 'ph-calendar-check';
                } else if (notif.status === 'Rejected') {
                    borderClass = 'border-l-red-500';
                    iconBg = 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
                    iconClass = 'ph-x-circle';
                } else {
                    borderClass = 'border-l-yellow-500';
                    iconBg = 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
                    iconClass = 'ph-calendar-star';
                }
            } else if (notif.type === 'message') {
                borderClass = 'border-l-pup-maroon dark:border-l-pup-gold';
                iconBg = 'bg-maroon-50 text-pup-maroon dark:bg-gold-900/10 dark:text-pup-gold';
                iconClass = 'ph-envelope-open';
            }

            const readClass = isRead 
                ? 'opacity-60 bg-gray-50 dark:bg-[#111111] border-gray-300 dark:border-gray-800' 
                : 'bg-transparent dark:bg-transparent border-gray-100 dark:border-gray-800';

            htmlString += `
                <div onclick="handleNotifClick(${index}, event)" 
                     class="notif-card-transition cursor-pointer border-b border-l-[5px] last:border-b-0 p-4 sm:p-5 sm:py-6 flex flex-row items-center justify-between gap-2 sm:gap-4 ${borderClass} ${readClass} hover:bg-gray-50 dark:hover:bg-[#1a1a1a]">
                    
                    <div class="flex flex-row items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div class="hidden sm:flex w-12 h-12 rounded-full items-center justify-center shrink-0 text-xl shadow-inner ${iconBg} overflow-hidden border border-gray-200 dark:border-gray-700">
                            ${notif.avatar ? `<img src="${notif.avatar}" alt="Org Profile" class="w-full h-full object-cover">` : `<i class="ph-fill ${iconClass}"></i>`}
                        </div>
                        
                        <div class="flex-1 min-w-0 flex flex-col gap-0.5 sm:gap-1">
                            <h4 class="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">${notif.title}</h4>
                            <span class="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">${notif.sender}</span>
                            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-pup-maroon dark:text-pup-gold truncate">${notif.org}</span>
                            
                            <p class="hidden sm:block text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed mt-1">
                                ${notif.message}
                            </p>
                        </div>
                    </div>
                    
                    <div class="shrink-0 text-right flex flex-col justify-center pl-3 sm:pl-4 border-l border-gray-100 dark:border-gray-800 sm:border-none sm:pl-0">
                        <span class="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 block tracking-wider whitespace-nowrap">${notif.date}</span>
                        <span class="text-xs sm:text-sm font-black text-pup-maroon dark:text-pup-gold block uppercase tracking-wider whitespace-nowrap mt-0.5">${notif.time || ''}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = htmlString;
    }

    function filterNotifications() {
        const query = document.getElementById('searchInput').value.toLowerCase().trim();
        if (query === "") {
            currentFiltered = notifications;
        } else {
            currentFiltered = notifications.filter(n => 
                (n.title || '').toLowerCase().includes(query) || 
                (n.sender || '').toLowerCase().includes(query) || 
                (n.message || '').toLowerCase().includes(query)
            );
        }
        renderNotifications(currentFiltered);
    }

    function handleNotifClick(index, event) {
        const notif = currentFiltered[index];
        if (event && event.currentTarget) {
            notifOriginRect = event.currentTarget.getBoundingClientRect();
        } else {
            notifOriginRect = null;
        }

        if (!readNotifs.includes(notif.id)) {
            readNotifs.push(notif.id);
            localStorage.setItem('admin_read_notifs', JSON.stringify(readNotifs));
            updateNotificationBadge();
            renderNotifications(currentFiltered);
        }
        
        // Populate and open modal
        document.getElementById('modalTitle').innerText = notif.title;
        document.getElementById('modalSender').innerText = notif.sender + ' | ' + notif.org;
        document.getElementById('modalDate').innerText = notif.date + ' - ' + notif.time;
        document.getElementById('modalMessage').innerText = notif.message;
        
        if (notif.avatar) {
            document.getElementById('modalSenderAvatar').src = notif.avatar;
            document.getElementById('modalSenderAvatar').classList.remove('hidden');
            document.getElementById('modalSenderIcon').classList.add('hidden');
        } else {
            document.getElementById('modalSenderAvatar').classList.add('hidden');
            document.getElementById('modalSenderIcon').classList.remove('hidden');
        }
        
        if (notif.url && notif.url !== '#') {
            document.getElementById('modalActionBtn').onclick = () => window.location.href = notif.url;
            document.getElementById('modalActionBtn').style.display = 'block';
        } else {
            document.getElementById('modalActionBtn').style.display = 'none';
        }
        
        document.body.style.overflow = 'hidden';
        animateModalOpen('notif-modal-box', 'notif-modal-backdrop', notifOriginRect);
    }
    
    function closeNotifModal() {
        animateModalClose('notif-modal-box', 'notif-modal-backdrop', notifOriginRect, () => {
            document.body.style.overflow = 'auto';
        });
    }

    function markAllAsRead() {
        notifications.forEach(n => {
            if (!readNotifs.includes(n.id)) {
                readNotifs.push(n.id);
            }
        });
        localStorage.setItem('admin_read_notifs', JSON.stringify(readNotifs));
        updateNotificationBadge();
        renderNotifications(currentFiltered);
    }
    
    function updateNotificationBadge() {
        const unreadCount = notifications.filter(n => !readNotifs.includes(n.id)).length;
        
        // This targets badges that we'll add to the admin_base navbar
        const desktopBadge = document.getElementById('notifBadge');
        const mobileBadge = document.getElementById('notifBadgeMobile');
        
        if (unreadCount > 0) {
            if (desktopBadge) { desktopBadge.style.display = 'flex'; desktopBadge.innerText = unreadCount; }
            if (mobileBadge) { mobileBadge.style.display = 'flex'; mobileBadge.innerText = unreadCount; }
        } else {
            if (desktopBadge) desktopBadge.style.display = 'none';
            if (mobileBadge) mobileBadge.style.display = 'none';
        }
    }

    function initNotifications() {
        try {
            const rawData = document.getElementById('django-notifs-data').textContent;
            if (rawData && rawData.trim() !== '') {
                notifications = JSON.parse(rawData.trim());
                currentFiltered = notifications;
                renderNotifications(notifications);
                updateNotificationBadge();
            } else {
                renderNotifications([]);
                updateNotificationBadge();
            }
        } catch (error) {
            console.error("Error loading notifications:", error);
            renderNotifications([]);
        }
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initNotifications);
    } else {
        initNotifications();
    }
