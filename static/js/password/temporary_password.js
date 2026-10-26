const { createApp } = Vue;
        
        createApp({
            delimiters: ['[[', ']]'], 
            data() {
                const savedTheme = localStorage.getItem('theme');
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
                
                if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.body.style.backgroundColor = '#121212';
                }

                return {
                    isDark: isDark,
                    isLoading: false,
                    isSent: false,
                    email: '',
                    countdown: 0,
                    timer: null,
                    toast: { show: false, message: '', type: 'success' }
                }
            },
            methods: {
                showToast(message, type='success') {
                    this.toast.message = message;
                    this.toast.type = type;
                    this.toast.show = true;
                    setTimeout(() => { this.toast.show = false; }, 4000);
                },
                toggleTheme() {
                    this.isDark = !this.isDark;
                    if (this.isDark) {
                        document.documentElement.classList.add('dark');
                        document.body.style.backgroundColor = '#121212';
                        localStorage.setItem('theme', 'dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                        document.body.style.backgroundColor = '#ffffff';
                        localStorage.setItem('theme', 'light');
                    }
                },
                async requestPassword() {
                    if (!this.email) {
                        this.showToast("Please enter your registered email.", "error");
                        return;
                    }
                    this.isLoading = true;
                    const formData = new FormData();
                    formData.append('email', this.email);
                    const token = document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1];
                    try {
                        const response = await fetch('/api/request-temporary-password/', { 
                            method: 'POST', 
                            headers: { 'X-CSRFToken': token }, 
                            body: formData 
                        });
                        const data = await response.json();
                        if (data.status === 'success') {
                            this.isSent = true;
                            
                            this.countdown = 60;
                            if (this.timer) clearInterval(this.timer);
                            this.timer = setInterval(() => {
                                this.countdown--;
                                if (this.countdown <= 0) clearInterval(this.timer);
                            }, 1000);
                        } else {
                            this.showToast(data.message, 'error');
                        }
                    } catch (e) {
                        this.showToast("Connection error", 'error');
                    } finally {
                        this.isLoading = false;
                    }
                }
            }
        }).mount('#app');
