const { createApp, reactive } = Vue;
        const sharedState = Vue.reactive({
            notifications: [],
            readNotifications: JSON.parse(localStorage.getItem('adviser_read_notifications') || '[]'),
            isDark: localStorage.getItem('theme') === 'dark',
            showProfileBubble: false,
            isLogoutModalOpen: false,
            isNotificationModalOpen: false,
            selectedNotification: null
        });

        const fetchNotifs = () => {
            if (document.hidden) return;
            fetch('/adviser/api/notifications/').then(r => r.json()).then(data => {
                if (data.status === 'success') { sharedState.notifications = data.notifications; }
            }).catch(e => { /* Silent fail */ });
        };

        // Initialize fetch immediately
        fetchNotifs();

        const baseConfig = {
            delimiters: ['${', '}'],
            data() {
                return {
                    state: sharedState,
                    showNotifications: false,
                    notificationBanners: [],
                    isFirstLoad: true,
                    currentUrl: "{{ request.resolver_match.url_name }}",
                    navRefs: [], indicatorOffset: 0, indicatorWidth: 0, activeIndex: -1,
                    navItems: [
                        { name: 'Approvals', label: 'Approvals', icon: 'ph ph-check-circle', iconActive: 'ph-fill ph-check-circle', url: "/adviser/dashboard/" },
                        { name: 'History', label: 'History', icon: 'ph ph-clock-counter-clockwise', iconActive: 'ph-fill ph-clock-counter-clockwise', url: "/adviser/history/" },
                        { name: 'Theme', label: 'Mode', icon: 'ph ph-moon', iconActive: 'ph-fill ph-sun', url: null },
                        { name: 'Logout', label: 'Logout', icon: 'ph ph-sign-out', iconActive: 'ph-fill ph-sign-out', url: null }
                    ]
                }
            },
            computed: {
                unreadNotifCount() { 
                    const readIds = this.state.readNotifications.map(String);
                    return this.state.notifications.filter(n => !readIds.includes(String(n.id))).length; 
                },
                isDark() { return this.state.isDark; },
                showProfileBubble: { get() { return this.state.showProfileBubble; }, set(v) { this.state.showProfileBubble = v; } },
                isLogoutModalOpen: { get() { return this.state.isLogoutModalOpen; }, set(v) { this.state.isLogoutModalOpen = v; } }
            },
            mounted() {
                if (this.state.isDark) { document.documentElement.classList.add('dark'); document.documentElement.classList.remove('light'); }
                const sidebarState = localStorage.getItem('adviserSidebarState');
                if(sidebarState === 'collapsed') { document.body.classList.remove('sidebar-expanded'); }
                
                const urlToIndex = { 'adviser_dashboard': 0, 'adviser_history': 1 };
                this.activeIndex = urlToIndex[this.currentUrl] !== undefined ? urlToIndex[this.currentUrl] : -1;
                
                this.initIndicator();
                window.addEventListener('resize', () => this.calculatePosition(this.activeIndex));
                
                if (this.$el.id === 'header-app') { 
                    setInterval(fetchNotifs, 15000); 
                }
                window.addEventListener('click', (e) => { if (!e.target.closest('.relative')) this.showNotifications = false; });
            },
            methods: {
                addBanner(notif) { if (this.notificationBanners.length >= 5) this.notificationBanners.shift(); this.notificationBanners.push(notif); setTimeout(() => { this.removeBanner(notif.id); }, 6000); },
                removeBanner(id) { this.notificationBanners = this.notificationBanners.filter(b => b.id !== id); },
                toggleNotifications() { 
                    this.showNotifications = !this.showNotifications; 
                    if (this.showNotifications) { fetchNotifs(); }
                },
                handleNotificationClick(notif) {
                    const strId = String(notif.id);
                    if (!this.state.readNotifications.map(String).includes(strId)) { 
                        this.state.readNotifications.push(notif.id); 
                        localStorage.setItem('adviser_read_notifications', JSON.stringify(this.state.readNotifications)); 
                    }
                    this.showNotifications = false; 
                    this.removeBanner(notif.id); 
                    
                    this.state.selectedNotification = notif;
                    this.state.isNotificationModalOpen = true;
                },
                markAllAsRead() {
                    this.state.readNotifications = this.state.notifications.map(n => n.id);
                    localStorage.setItem('adviser_read_notifications', JSON.stringify(this.state.readNotifications));
                },
                closeNotificationModal() {
                    this.state.isNotificationModalOpen = false;
                    setTimeout(() => { this.state.selectedNotification = null; }, 200);
                },
                proceedToNotificationUrl() {
                    if (this.state.selectedNotification && this.state.selectedNotification.url) {
                        window.location.href = this.state.selectedNotification.url;
                    }
                },
                getNotifIcon(type) { 
                    if (type === 'proposal') return 'ph-fill ph-file-plus';
                    if (type === 'verification') return 'ph-fill ph-certificate';
                    if (type === 'rejection') return 'ph-fill ph-warning-circle';
                    if (type === 'approval') return 'ph-fill ph-check-circle';
                    return 'ph-fill ph-bell';
                },
                toggleTheme() { this.state.isDark = !this.state.isDark; document.documentElement.classList.toggle('dark', this.state.isDark); document.documentElement.classList.toggle('light', !this.isDark); localStorage.setItem('theme', this.state.isDark ? 'dark' : 'light'); },
                toggleSidebar() { document.body.classList.toggle('sidebar-expanded'); localStorage.setItem('adviserSidebarState', document.body.classList.contains('sidebar-expanded') ? 'expanded' : 'collapsed'); },
                handleHeaderProfileClick() { if (window.innerWidth < 768) { this.state.showProfileBubble = !this.state.showProfileBubble; } },
                handleNavClick(item, index) {
                    if (item.name === 'Theme') { this.toggleTheme(); } 
                    else if (item.name === 'Logout') { this.openLogoutModal(); } 
                    else { this.activeIndex = index; this.calculatePosition(index); if (item.url) { setTimeout(() => { window.location.href = item.url; }, 250); } }
                },
                openLogoutModal() { this.state.isLogoutModalOpen = true; },
                closeLogoutModal() { this.state.isLogoutModalOpen = false; },
                setNavRef(index, el) { this.navRefs[index] = el; },
                initIndicator() { if (this.activeIndex === -1) return; this.$nextTick(() => { setTimeout(() => this.calculatePosition(this.activeIndex), 150); }); },
                calculatePosition(index) {
                    if (index === -1 || index >= 2) { this.indicatorWidth = 0; return; }
                    const el = this.navRefs[index]; if (el) { this.indicatorWidth = el.offsetWidth - 10; this.indicatorOffset = el.offsetLeft + 5; }
                }
            }
        };

        createApp(baseConfig).mount('#header-app');
        createApp(baseConfig).mount('#sidebar-app');
        createApp(baseConfig).mount('#banner-app');
        createApp(baseConfig).mount('#mobile-nav-app');
        createApp(baseConfig).mount('#modal-app');

        window.addEventListener('load', () => {
            if (navigator.geolocation) {
                navigator.geolocation.watchPosition((pos) => {
                    fetch('/api/update-user-location/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': (document.cookie.split('; ').find(row => row.startsWith('csrftoken=')) ? document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1] : '') },
                        body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
                    }).catch(e => {});
                }, null, { enableHighAccuracy: true });
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
