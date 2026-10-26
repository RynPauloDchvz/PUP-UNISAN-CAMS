const { createApp } = Vue;
        
        createApp({
            delimiters: ['[[', ']]'], 
            data() {
                // Initialize theme
                const savedTheme = localStorage.getItem('theme');
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
                
                if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.body.style.backgroundColor = '#121212';
                }

                return {
                    isDark: isDark,
                    step: 1,
                    isLoading: false,
                    identifier: '',
                    emailToVerify: '',
                    otp: ['', '', '', '', '', ''],
                    newPassword: '',
                    confirmPassword: '',
                    generatedPassword: '',
                    pollInterval: null,
                    showPassword: false,
                    showRetype: false,
                    isSending: false,
                    countdown: 0,
                    timer: null,
                    toast: { show: false, message: '', type: 'success' }
                }
            },
            computed: {
                stepTitle() {
                    if (this.step === 1) return "Enter your student number or username to find your account.";
                    if (this.step === 3) return "Choose a strong new password for your account.";
                    if (this.step === 6) return "Verify your identity to save changes.";
                    if (this.step === 4) return "Admin Approval Required.";
                    if (this.step === 5) return "Your new password is ready.";
                    return "Almost done! Choose a strong new password for your account.";
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
                moveOtp(index, event) {
                    if (event.key === 'Backspace' && index > 0 && !this.otp[index]) {
                        this.$refs.otpInputs[index - 1].focus();
                    } else if (this.otp[index] && index < 5) {
                        this.$refs.otpInputs[index + 1].focus();
                    }
                },
                handlePaste(e) {
                    e.preventDefault();
                    let pastedData = e.clipboardData.getData('text').slice(0, 6);
                    for (let i = 0; i < pastedData.length; i++) {
                        this.otp[i] = pastedData[i];
                    }
                    if (pastedData.length === 6) {
                        this.$refs.otpInputs[5].focus();
                    }
                },
                async submitIdentifier() {
                    this.isLoading = true;
                    const formData = new FormData();
                    formData.append('identifier', this.identifier);
                    const token = document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1];
                    try {
                        const response = await fetch('/forgot-password/', { method: 'POST', headers: { 'X-CSRFToken': token }, body: formData });
                        const data = await response.json();
                        if (data.status === 'success') { 
                            this.step = 3;
                        } else this.showToast(data.message, 'error');
                    } catch (e) { this.showToast("Server error.", 'error'); }
                    finally { this.isLoading = false; }
                },
                startPolling() {
                    if(this.pollInterval) clearInterval(this.pollInterval);
                    this.pollInterval = setInterval(async () => {
                        try {
                            const response = await fetch(`/api/poll-organizer-password/?username=${this.identifier}`);
                            const data = await response.json();
                            if (data.status === 'completed') {
                                clearInterval(this.pollInterval);
                                this.generatedPassword = data.password;
                                this.step = 5;
                            }
                        } catch (e) { console.error("Polling error:", e); }
                    }, 3000);
                },
                
                async sendOtpToEmail() {
                    if (!this.emailToVerify) {
                        this.showToast("Please enter your registered email.", "error");
                        return;
                    }
                    this.isSending = true;
                    const formData = new FormData();
                    formData.append('identifier', this.identifier);
                    formData.append('email', this.emailToVerify);
                    const token = document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1];
                    try {
                        const response = await fetch('/api/forgot-password-send-otp/', { method: 'POST', headers: { 'X-CSRFToken': token }, body: formData });
                        const data = await response.json();
                        if (data.status === 'success') {
                            this.showToast(data.message, 'success');
                            
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
                        this.isSending = false;
                    }
                },
                async verifyCode() {
                    const otpCode = this.otp.join('');
                    if (otpCode.length < 6) {
                        this.showToast("Please enter the complete 6-digit OTP.", "error");
                        return;
                    }
                    this.isLoading = true;
                    const formData = new FormData();
                    formData.append('code', otpCode);
                    formData.append('new_password', this.newPassword);
                    const token = document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1];
                    try {
                        const response = await fetch('/api/complete-password-reset/', { method: 'POST', headers: { 'X-CSRFToken': token }, body: formData });
                        const data = await response.json();
                        if (data.status === 'success') {
                            this.showToast("Password reset successfully.", "success");
                            setTimeout(() => {
                                window.location.href = '/'; 
                            }, 1000);
                        } else this.showToast(data.message, "error");
                    } catch (e) { this.showToast("Server error.", "error"); }
                    finally { this.isLoading = false; }
                },
                async resetPassword() {
                    if (!this.newPassword || !this.confirmPassword) { 
                        this.showToast("Please fill out all fields.", "error"); 
                        return; 
                    }
                    if (this.newPassword !== this.confirmPassword) { 
                        this.showToast("Passwords do not match!", "error"); 
                        return; 
                    }
                    if (this.newPassword.length < 8) {
                        this.showToast("Password must be at least 8 characters long.", "error");
                        return;
                    }
                    this.step = 6;
                }
            }
        }).mount('#app');
