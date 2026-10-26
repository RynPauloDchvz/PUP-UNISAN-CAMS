// Use existing if defined by page, else new object
        window.VUE_APP_DATA = window.VUE_APP_DATA || {};
        window.VUE_APP_METHODS = window.VUE_APP_METHODS || {};

        const baseAppConfig = {
            delimiters: ['[[', ']]'],
            data() {
                return {
                    isDark: false,
                    isLogoutModalOpen: false,
                    showProfileBubble: false,
                    studentNum: "{{ request.user.username }}",
                    currentUrl: "{{ request.resolver_match.url_name }}",
                    
                    // --- 📱 Bottom Nav Logic 📱 ---
                    navRefs: [],
                    indicatorOffset: 0,
                    indicatorWidth: 0,
                    activeIndex: -1,
                    navItems: [
                        { name: 'Home', label: 'Home', icon: 'ph ph-house', iconActive: 'ph-fill ph-house', url: "/student/dashboard" },
                        { name: 'Events', label: 'Events', icon: 'ph ph-ticket', iconActive: 'ph-fill ph-ticket', url: "/student/school-events" },
                        { name: 'Calendar', label: 'Calendar', icon: 'ph ph-calendar-blank', iconActive: 'ph-fill ph-calendar-blank', url: "/student/calendar" },
                        { name: 'Evaluation', label: 'Evaluation', icon: 'ph ph-clipboard-text', iconActive: 'ph-fill ph-clipboard-text', url: "/student/evaluation" },
                        { name: 'Theme', label: 'Mode', icon: 'ph ph-moon', iconActive: 'ph-fill ph-sun', url: null }
                    ],

                    latestNews: [],
                    upcomingEvents: [],
                    selectedEvent: {},
                    isEventModalOpen: false,
                    allNotifs: [],
                    readNotifs: JSON.parse(localStorage.getItem('student_read_notifs') || '[]'),
                    filteredNotifs: [],
                    isMsgModalOpen: false,
                    currentMsg: {},
                    isLoading: true, // 🟢 Start with loading state

                    // --- Notification System ---
                    unreadNotifCount: 0,
                    popupBanners: [],
                    shownBannerIds: JSON.parse(sessionStorage.getItem('shown_banners') || '[]'),
                    showNotifDropdown: false,

                    ...window.VUE_APP_DATA
                }
            },
            created() {
                if (this.currentUrl === 'student_profile') {
                    this.activeIndex = -1;
                } else {
                    const urlToIndex = {
                        'student_homepage': 0,
                        'student_school_events': 1,
                        'student_event_calendar': 2,
                        'student_evaluation': 3
                    };
                    this.activeIndex = urlToIndex[this.currentUrl] !== undefined ? urlToIndex[this.currentUrl] : 0;
                }
            },
            mounted() {
                // 🟢 Simulate loading delay for modern feel 🟢
                setTimeout(() => {
                    this.isLoading = false;
                }, 800);

                const savedTheme = localStorage.getItem('theme');
                if (savedTheme === 'dark') {
                    this.isDark = true;
                    document.documentElement.classList.add('dark');
                }

                this.fetchNotifications();
                setInterval(this.fetchNotifications, 10000);

                this.initIndicator();
                window.addEventListener('resize', () => this.calculatePosition(this.activeIndex));
                
                // Global logic to handle search redirection from banner
                if (this.currentUrl === 'student_school_events') {
                    const searchQuery = sessionStorage.getItem('eventSearchQuery');
                    if (searchQuery) {
                        setTimeout(() => {
                            const searchInput = document.getElementById('eventSearch');
                            if (searchInput) {
                                searchInput.value = searchQuery;
                                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            sessionStorage.removeItem('eventSearchQuery');
                        }, 500);
                    }
                }
            },
            methods: {
                ...window.VUE_APP_METHODS,
                async fetchNotifications() {
                    if (document.hidden) return; 
                    try {
                        const response = await fetch("/student/api/notifications/");
                        if (!response.ok) return; 
                        const data = await response.json();
                        if (data.status === 'success') {
                            this.allNotifs = data.notifications;
                            this.updateNotificationState();
                        }
                    } catch (error) {
                        // Silent fail to avoid clogging the console during server restarts or transient network issues
                    }
                },
                updateNotificationState() {
                    const unread = this.allNotifs.filter(n => !this.readNotifs.includes(n.id));
                    this.unreadNotifCount = unread.length;

                    // New unread that haven't been shown as banners
                    const newNotifs = unread.filter(n => !this.shownBannerIds.includes(n.id));
                    
                    if (newNotifs.length > 0) {
                        // Add to banners (at the top), max 5
                        this.popupBanners = [...newNotifs, ...this.popupBanners].slice(0, 5);
                        
                        // Mark as shown
                        newNotifs.forEach(n => this.shownBannerIds.push(n.id));
                        sessionStorage.setItem('shown_banners', JSON.stringify(this.shownBannerIds));

                        // Auto-hide banners after 8 seconds
                        newNotifs.forEach(n => {
                            setTimeout(() => {
                                this.closeBanner(n.id);
                            }, 8000);
                        });
                    }
                },
                closeBanner(id) {
                    this.popupBanners = this.popupBanners.filter(b => b.id !== id);
                },
                toggleNotifDropdown() {
                    this.showNotifDropdown = !this.showNotifDropdown;
                },
                handleNotifClick(notif, event) {
                    this.showNotifDropdown = false;
                    this.openMessageModal(notif);
                    if (event) {
                        this.$nextTick(() => {
                            const wrapper = document.querySelector('.ios-pop-wrapper');
                            if (wrapper) {
                                wrapper.style.setProperty('--click-x', event.clientX + 'px');
                                wrapper.style.setProperty('--click-y', event.clientY + 'px');
                            }
                        });
                    }
                },
                handleBannerClick(banner) {
                    let searchTitle = banner.title;
                    searchTitle = searchTitle
                        .replace('Upcoming: ', '')
                        .replace('Attendance Issue: ', '')
                        .replace('🔥 NEW EVENT: ', '')
                        .replace('📅 RESCHEDULED: ', '');
                    
                    if (!this.readNotifs.includes(banner.id)) {
                        this.readNotifs.push(banner.id);
                        localStorage.setItem('student_read_notifs', JSON.stringify(this.readNotifs));
                    }
                    
                    sessionStorage.setItem('eventSearchQuery', searchTitle.trim());
                    window.location.href = "/student/school-events";
                },
                setNavRef(index, el) {
                    this.navRefs[index] = el;
                },
                initIndicator() {
                    if (this.activeIndex === -1 || this.activeIndex === 4) return;
                    this.$nextTick(() => {
                        setTimeout(() => this.calculatePosition(this.activeIndex), 150);
                        setTimeout(() => this.calculatePosition(this.activeIndex), 600);
                    });
                },
                calculatePosition(index) {
                    if (index === -1 || index === 4) {
                        this.indicatorWidth = 0;
                        return;
                    }
                    const el = this.navRefs[index];
                    if (el) {
                        const offsetLeft = el.offsetLeft;
                        const width = el.offsetWidth;
                        this.indicatorWidth = width - 10;
                        this.indicatorOffset = offsetLeft + 5;
                    }
                },
                toggleTheme() {
                    this.isDark = !this.isDark;
                    document.documentElement.classList.toggle('dark');
                    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
                },
                handleHeaderProfileClick() {
                    if (window.innerWidth >= 768) {
                        window.location.href = "/student/profile";
                    } else {
                        if (this.currentUrl === 'student_profile') return;
                        this.showProfileBubble = !this.showProfileBubble;
                    }
                },
                handleNavClick(item, index) {
                    if (item.name === 'Theme') {
                        this.toggleTheme();
                    } else {
                        this.activeIndex = index;
                        this.calculatePosition(index);
                        if (item.url) {
                            setTimeout(() => {
                                window.location.href = item.url;
                            }, 250);
                        }
                    }
                },
                checkUnreadStatus() {
                    // Deprecated: Replaced by API fetching in fetchNotifications()
                },
                openLogoutModal() {
                    this.isLogoutModalOpen = true;
                    document.body.style.overflow = 'hidden';
                },
                closeLogoutModal() {
                    this.isLogoutModalOpen = false;
                    document.body.style.overflow = '';
                },
                // --- 🔔 Unified Notification Helpers 🔔 ---
                isRead(id) {
                    return this.readNotifs.includes(id);
                },
                getNotifBorderClass(type, status) {
                    if (type === 'event' || status === 'Approved') return 'border-l-green-500';
                    if (type === 'new') return 'border-l-amber-500';
                    if (type === 'update') return 'border-l-purple-500';
                    if (type === 'evaluation') return 'border-l-indigo-500';
                    if (type === 'alert' || status === 'Rejected') return 'border-l-red-500';
                    return 'border-l-blue-500';
                },
                getIconBg(type) {
                    if (type === 'event') return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
                    if (type === 'new') return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
                    if (type === 'update') return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
                    if (type === 'evaluation') return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400';
                    if (type === 'alert') return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
                    return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
                },
                getIconClass(type) {
                    if (type === 'event') return 'ph-calendar-star';
                    if (type === 'new') return 'ph-sparkle';
                    if (type === 'update') return 'ph-calendar-check';
                    if (type === 'evaluation') return 'ph-star-half';
                    if (type === 'alert') return 'ph-warning-circle';
                    return 'ph-megaphone';
                },
                getModalIconWrapperClass(type) {
                    if (type === 'event') return 'border-green-100 bg-green-50 text-green-500 dark:border-green-900/30 dark:bg-green-900/20';
                    if (type === 'new') return 'border-amber-100 bg-amber-50 text-amber-500 dark:border-amber-900/30 dark:bg-amber-900/20';
                    if (type === 'update') return 'border-purple-100 bg-purple-50 text-purple-500 dark:border-purple-900/30 dark:bg-purple-900/20';
                    if (type === 'evaluation') return 'border-indigo-100 bg-indigo-50 text-indigo-500 dark:border-indigo-900/30 dark:bg-indigo-900/20';
                    if (type === 'alert') return 'border-red-100 bg-red-50 text-red-500 dark:border-red-900/30 dark:bg-red-900/20';
                    return 'border-blue-100 bg-blue-50 text-blue-500 dark:border-blue-900/30 dark:bg-blue-900/20';
                },
                getModalTitleClass(type) {
                    if (type === 'event') return 'text-green-600 dark:text-green-500';
                    if (type === 'new') return 'text-amber-600 dark:text-amber-500';
                    if (type === 'update') return 'text-purple-600 dark:text-purple-500';
                    if (type === 'evaluation') return 'text-indigo-600 dark:text-indigo-500';
                    if (type === 'alert') return 'text-red-600 dark:text-red-500';
                    return 'text-blue-600 dark:text-blue-500';
                },
                openMessageModal(notif) {
                    if (!this.readNotifs.includes(notif.id)) {
                        this.readNotifs.push(notif.id);
                        localStorage.setItem('student_read_notifs', JSON.stringify(this.readNotifs));
                        this.updateNotificationState();
                    }
                    this.currentMsg = notif;
                    this.isMsgModalOpen = true;
                    document.body.style.overflow = 'hidden';
                },
                markAllAsRead() {
                    const allIds = this.allNotifs.map(n => n.id);
                    this.readNotifs = [...new Set([...this.readNotifs, ...allIds])];
                    localStorage.setItem('student_read_notifs', JSON.stringify(this.readNotifs));
                    this.unreadNotifCount = 0;
                },
                getStaticImageUrl(filename) {
                    if (!filename) return "/static/images/PUPLogo.png";
                    if (filename.startsWith('/') || filename.startsWith('http')) return filename;
                    return "/static/images/" + filename;
                },
                handleImageError(event) {
                    event.target.src = "/static/images/PUPLogo.png";
                },
                openEventModal(data, event) {
                    this.selectedEvent = data;
                    this.isEventModalOpen = true;
                    document.body.style.overflow = 'hidden'; 
                    if (event) {
                        this.$nextTick(() => {
                            const wrapper = document.querySelector('.ios-pop-wrapper');
                            if (wrapper) {
                                wrapper.style.setProperty('--click-x', event.clientX + 'px');
                                wrapper.style.setProperty('--click-y', event.clientY + 'px');
                            }
                        });
                    }
                },
                closeModal() {
                    const wrappers = document.querySelectorAll('.ios-pop-wrapper');
                    if (wrappers.length > 0) {
                        wrappers.forEach(w => w.classList.add('ios-pop-wrapper-close'));
                        setTimeout(() => {
                            this.isEventModalOpen = false;
                            this.isMsgModalOpen = false;
                            document.body.style.overflow = '';
                        }, 350);
                    } else {
                        this.isEventModalOpen = false;
                        this.isMsgModalOpen = false;
                        document.body.style.overflow = ''; 
                    }
                },
                viewEventDetails() {
                    this.closeModal();
                    window.location.href = "/student/school-events"; 
                },
                startActionEvaluation(event) {
                    // Save context and move to official form
                    sessionStorage.setItem('currentEvalTitle', event.title);
                    sessionStorage.setItem('currentEvalCategory', 'Organization Activity');
                    sessionStorage.setItem('currentEvalImg', event.image || "/static/images/PUPLogo.png");
                    window.location.href = "/student/evaluation-form";
                }
            }
        };

        window.addEventListener('load', () => {
            if (!window.VUE_APP_MOUNTED) {
                const app = Vue.createApp(baseAppConfig);
                window.VUE_APP_INSTANCE = app.mount('#app');
                window.VUE_APP_MOUNTED = true;
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
  });

function toggleOrgDropdown() {
    const menu = document.getElementById('orgSwitcherMenu');
    if (menu) menu.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
    const container = document.getElementById('orgSwitcherDropdownContainer');
    const menu = document.getElementById('orgSwitcherMenu');
    if (container && menu && !container.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

async function switchActiveOrg(orgCode, orgName) {
    const currentActive = (document.getElementById('student-active-org-data') ? JSON.parse(document.getElementById('student-active-org-data').textContent) : '');
    if (orgCode === currentActive) {
        const menu = document.getElementById('orgSwitcherMenu');
        if (menu) menu.classList.add('hidden');
        return;
    }

    const overlay = document.getElementById('orgSwitchOverlay');
    const targetTitle = document.getElementById('switchTargetTitle');
    const targetLogo = document.getElementById('switchTargetLogo');

    if (targetTitle) targetTitle.textContent = `Switching to ${orgCode}...`;
    if (targetLogo) {
        targetLogo.src = orgCode === 'PUSO' ? '/static/images/orgImage/PUSO/PUSO.jpg' : (['PRIDE', 'PRIDEVerse', 'BahaghariU'].includes(orgCode) ? '/static/images/footer/bahaghari.png' : `/static/images/orgImage/${orgCode}/${orgCode}.png`);
    }

    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
    }

    try {
        const formData = new FormData();
        formData.append('target_org', orgCode);

        let tokenValue = '';
        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
        if (csrfToken) tokenValue = csrfToken.split('=')[1];

        await fetch('/api/switch-active-org/', {
            method: 'POST',
            headers: { 'X-CSRFToken': tokenValue },
            body: formData
        });

        setTimeout(() => {
            window.location.reload();
        }, 750);
    } catch (err) {
        window.location.reload();
    }
}
