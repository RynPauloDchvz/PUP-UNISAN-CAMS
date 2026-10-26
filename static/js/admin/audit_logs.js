new Vue({
        el: '#audit-app',
        delimiters: ['[[', ']]'],
        data: {
            isLoading: true,
            logs: (function() {
            try {
                const el = document.getElementById('audit-logs-data');
                return el ? JSON.parse(el.textContent) : [];
            } catch(e) { return []; }
        })(),
            searchQuery: '',
            statusFilter: '',
            actionFilter: '',
            isStatusFilterOpen: false,
            isActionFilterOpen: false,
            selectedLog: null,
            originRect: null,
            displayLimit: 50
        },
        mounted() {
            setTimeout(() => { this.isLoading = false; }, 800);
        },
        computed: {
            filteredLogs() {
                return this.logs.filter(log => {
                    const q = this.searchQuery.toLowerCase();
                    const matchesSearch = log.actor.toLowerCase().includes(q) ||
                                        log.ip.toLowerCase().includes(q) ||
                                        log.target.toLowerCase().includes(q) ||
                                        log.action.toLowerCase().includes(q);
                    const matchesStatus = !this.statusFilter || log.status === this.statusFilter;
                    const matchesAction = !this.actionFilter || log.action.includes(this.actionFilter);
                    
                    return matchesSearch && matchesStatus && matchesAction;
                });
            },
            displayedLogs() {
                return this.filteredLogs.slice(0, this.displayLimit);
            },
            successCount() { return this.logs.filter(l => l.status === 'Success').length; },
            failureCount() { return this.logs.filter(l => l.status === 'Failed' || l.status === 'Denied').length; },
            breachCount() { return this.logs.filter(l => l.action === 'UNAUTHORIZED').length; },
            hasChanges() {
                if (!this.selectedLog || !this.selectedLog.changes) return false;
                return Object.keys(this.selectedLog.changes).length > 0;
            }
        },
        methods: {
            loadMore() {
                this.displayLimit += 50;
            },
            formatTimestamp(ts) {
                try {
                    let d = new Date(ts);
                    if (isNaN(d)) {
                        return { date: ts.split(' ')[0] || '', time: ts.split(' ').slice(1).join(' ').replace(/:\d{2}(\s?[APap]\.?M\.?)$/, '$1') };
                    }
                    let datePart = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
                    let timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    return { date: datePart, time: timePart };
                } catch(e) {
                    return { date: ts, time: '' };
                }
            },
            formatActionTag(action) {
                if (!action) return '';
                let formatted = action.replace(/_/g, ' ');
                if (formatted.includes('APPROVE') && !formatted.includes('APPROVED')) {
                    formatted = formatted.replace('APPROVE', 'APPROVED');
                }
                if (formatted.includes('REJECT') && !formatted.includes('REJECTED')) {
                    formatted = formatted.replace('REJECT', 'REJECTED');
                }
                return formatted;
            },
            getPortalName(roleType) {
                if (!roleType) return 'System Portal';
                let roleStr = typeof roleType === 'string' ? roleType.toUpperCase() : '';
                
                if (roleStr.includes('STUDENT')) return 'Student Portal';
                if (roleStr.includes('ORGANIZER')) return 'Organizer Portal';
                if (roleStr.includes('ADVISER')) return 'Adviser Portal';
                if (roleStr.includes('ADMIN')) return 'Admin Portal';
                
                return 'System Portal';
            },
            getActionClass(action) {
                let a = action.toUpperCase();
                if (a.includes('FAILED')) return 'bg-orange-500 text-white';
                if (a.includes('UNAUTHORIZED')) return 'bg-red-500 text-white';
                if (a.includes('CREATE')) return 'bg-blue-500 text-white';
                if (a.includes('LOGIN') || a.includes('LOGOUT')) return 'bg-green-500 text-white';
                return 'bg-gray-500 text-white';
            },
            getActionTextClass(action) {
                let a = action.toUpperCase();
                if (a.includes('FAILED')) return 'text-orange-500';
                if (a.includes('UNAUTHORIZED')) return 'text-red-500';
                if (a.includes('CREATE')) return 'text-blue-500';
                if (a.includes('LOGIN') || a.includes('LOGOUT')) return 'text-green-500';
                return 'text-gray-500';
            },
            getStatusIcon(log) {
                let a = (log.action || '').toUpperCase();
                // User asked for circled icons for status signs
                if (a.includes('FAILED')) return 'ph-bold ph-x-circle text-orange-500';
                if (a.includes('UNAUTHORIZED')) return 'ph-bold ph-warning-circle text-red-500';
                if (a.includes('CREATE')) return 'ph-bold ph-check-circle text-blue-500';
                if (a.includes('LOGIN') || a.includes('LOGOUT')) return 'ph-bold ph-check-circle text-green-500';
                return 'ph-bold ph-check-circle text-gray-500';
            },
            getActivitySentence(log) {
                const actor = log.actor || 'The user';
                const action = (log.action || '').toUpperCase();
                const portal = this.getPortalName(log.role_type);
                
                if (action.includes('LOGIN_FAILED') || action.includes('LOGIN FAILED')) {
                    const reason = log.changes && log.changes.reason ? log.changes.reason : 'invalid credentials';
                    return `User attempted to login at the ${portal} but failed because: ${reason}.`;
                }
                if (action.includes('UNAUTHORIZED')) {
                    const attemptedRole = log.changes && log.changes.attempted_role ? log.changes.attempted_role : 'restricted areas';
                    return `User tried to bypass access limits and enter the ${attemptedRole} portal without permission.`;
                }
                if (action.includes('LOGIN')) {
                    return `User successfully authenticated and accessed the ${portal}.`;
                }
                if (action.includes('LOGOUT')) {
                    const duration = log.changes && log.changes.session_duration ? log.changes.session_duration : 'an active session';
                    return `User logged out of the ${portal} after staying connected for ${duration}.`;
                }
                if (action.includes('REGISTRATION') || action.includes('CREATE')) {
                    const studentNum = log.changes && log.changes.student_number ? log.changes.student_number : '';
                    return `User successfully registered a new account in the system${studentNum ? ` for ID ${studentNum}` : ''}.`;
                }
                if (action.includes('EVALUATION')) {
                    return `User successfully submitted a post-event evaluation form via the ${portal}.`;
                }
                if (action.includes('ATTENDANCE')) {
                    return `User recorded their event attendance using the ${portal} location and face matching system.`;
                }
                if (action.includes('UPDATE')) {
                    return `User updated system records or profile information via the ${portal}.`;
                }
                if (action.includes('VERIFICATION')) {
                    const studentName = log.changes && log.changes.student ? log.changes.student : 'a student';
                    return `User verified the account registration of ${studentName} via the ${portal}.`;
                }
                if (action.includes('APPROVE') || action.includes('REJECT')) {
                    const actionWord = action.includes('APPROVE') ? 'approved' : 'rejected';
                    return `User reviewed an event proposal and ${actionWord} it via the ${portal}.`;
                }
                
                return `User executed a system operation (${log.action}) inside the ${portal}.`;
            },
            viewDetails(log, event) {
                if (event && event.currentTarget) {
                    this.originRect = event.currentTarget.getBoundingClientRect();
                } else {
                    this.originRect = null;
                }
                this.selectedLog = log;
                document.body.style.overflow = 'hidden';
                
                this.$nextTick(() => {
                    this.animateModalOpen('log-modal-box', 'log-modal-backdrop', this.originRect);
                });
            },
            closeModal() {
                this.animateModalClose('log-modal-box', 'log-modal-backdrop', this.originRect, () => {
                    this.selectedLog = null;
                    document.body.style.overflow = 'auto';
                });
            },
            animateModalOpen(boxId, backdropId, originRect) {
                const box = document.getElementById(boxId);
                const backdrop = document.getElementById(backdropId);
                
                if (backdrop) {
                    backdrop.style.opacity = '0';
                    backdrop.style.transition = 'none';
                    requestAnimationFrame(() => {
                        void backdrop.offsetWidth;
                        backdrop.style.transition = 'opacity 0.3s ease-out';
                        backdrop.style.opacity = '1';
                    });
                }

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
            },
            animateModalClose(boxId, backdropId, originRect, closeCallback) {
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
                
                setTimeout(closeCallback, 300);
            }
        },
        watch: {
            searchQuery() { this.displayLimit = 50; },
            statusFilter() { this.displayLimit = 50; },
            actionFilter() { this.displayLimit = 50; }
        }
    });
