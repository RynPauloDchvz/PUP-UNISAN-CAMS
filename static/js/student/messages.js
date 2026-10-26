(function() {
    let allNotifsFromDjango = [];
    try {
        const dataEl = document.getElementById('django-notifs-data');
        if (dataEl && dataEl.textContent && dataEl.textContent.trim() !== '') {
            allNotifsFromDjango = JSON.parse(dataEl.textContent.trim());
        }
    } catch (error) {
        console.error("Error loading notifications:", error);
    }

    const notifData = {
        allNotifs: allNotifsFromDjango,
        filteredNotifs: allNotifsFromDjango,
        readNotifs: JSON.parse(localStorage.getItem('student_read_notifs') || '[]')
    };

    window.VUE_APP_DATA = window.VUE_APP_DATA || {};
    Object.assign(window.VUE_APP_DATA, notifData);

    window.VUE_APP_METHODS = window.VUE_APP_METHODS || {};
    Object.assign(window.VUE_APP_METHODS, {
        filterNotifications(event) {
            const query = event.target.value.toLowerCase().trim();
            this.filteredNotifs = this.allNotifs.filter(n => 
                (n.title || '').toLowerCase().includes(query) || 
                (n.sender || '').toLowerCase().includes(query) || 
                (n.message || '').toLowerCase().includes(query)
            );
        },
        isRead(id) {
            return this.readNotifs.includes(id);
        },
        markAllAsRead() {
            const allIds = this.allNotifs.map(n => n.id);
            this.readNotifs = [...new Set([...this.readNotifs, ...allIds])];
            localStorage.setItem('student_read_notifs', JSON.stringify(this.readNotifs));
        },
        handleNotifClick(notif) {
            // 1. Mark as read
            if (!this.readNotifs.includes(notif.id)) {
                this.readNotifs.push(notif.id);
                localStorage.setItem('student_read_notifs', JSON.stringify(this.readNotifs));
            }

            // 2. Logic-based redirection (Matching Banner/Icon Standard)
            const title = notif.title || "";
            const type = notif.type || "";
            
            // Patterns for Events
            if (type === 'event' || type === 'new' || type === 'update' || type === 'alert' || 
                title.includes('Upcoming: ') || title.includes('Attendance Issue: ') || 
                title.includes('NEW EVENT') || title.includes('RESCHEDULED')) {
                
                let searchTitle = title
                    .replace('Upcoming: ', '')
                    .replace('Attendance Issue: ', '')
                    .replace('🔥 NEW EVENT: ', '')
                    .replace('📅 RESCHEDULED: ', '');

                sessionStorage.setItem('eventSearchQuery', searchTitle.trim());
                window.location.href = "/student/school-events";
                return;
            }

            // Patterns for Evaluations
            if (type === 'evaluation' || title.toLowerCase().includes('evaluation') || title.toLowerCase().includes('feedback')) {
                window.location.href = "/student/evaluation";
                return;
            }

            // Default Patterns
            if (title.includes('Welcome')) {
                window.location.href = "/student/homepage";
                return;
            }

            // Fallback to School Events (Participation Hub)
            window.location.href = "/student/school-events";
        }
    });
})();
