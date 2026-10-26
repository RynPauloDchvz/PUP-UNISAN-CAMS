// Modal Functions
    let iosOriginX = null;
    let iosOriginY = null;

    function openReviewModal(e, orgName, eventTitle, requestText, coverPhotoUrl) {
        // Record click origin for iOS animation
        iosOriginX = null;
        iosOriginY = null;
        if (e) {
            if (e.clientX !== undefined && e.clientX !== 0) {
                iosOriginX = e.clientX;
                iosOriginY = e.clientY;
            } else if (e.touches && e.touches.length > 0) {
                iosOriginX = e.touches[0].clientX;
                iosOriginY = e.touches[0].clientY;
            } else if (e.currentTarget) {
                const rect = e.currentTarget.getBoundingClientRect();
                iosOriginX = rect.left + rect.width / 2;
                iosOriginY = rect.top + rect.height / 2;
            }
        }

        document.getElementById('modalOrgBadge').innerText = orgName;
        document.getElementById('modalEventTitle').innerText = eventTitle;
        
        // Extract actual description by removing tags used for docx (e.g. Target: ... | Equipment: ... | Desc: ...)
        let finalDesc = requestText;
        if (requestText && requestText.includes('| Desc:')) {
            const parts = requestText.split('| Desc:');
            finalDesc = parts[parts.length - 1].trim();
        } else if (requestText && requestText.includes('Desc:')) {
            const parts = requestText.split('Desc:');
            finalDesc = parts[parts.length - 1].trim();
        }
        
        document.getElementById('modalRequestText').innerText = finalDesc || 'No event description provided.';
        
        const banner = document.getElementById('modalBanner');
        const overlay = document.getElementById('modalBannerOverlay');
        
        if (coverPhotoUrl && coverPhotoUrl.trim() !== '') {
            banner.style.backgroundImage = `url('${coverPhotoUrl}')`;
            overlay.style.display = 'block';
        } else {
            banner.style.backgroundImage = 'none';
            banner.style.backgroundColor = 'var(--pup-maroon)';
            overlay.style.display = 'none';
        }
        
        const modal = document.getElementById('reviewModal');
        const modalBox = modal.querySelector('.modal-box');
        
        // Reset transforms
        modalBox.style.transition = 'none';
        modalBox.style.transform = 'none';
        modal.style.display = 'flex';
        
        // Set scale(1) temporarily to get accurate measurements without CSS transform interference
        modalBox.style.transform = 'scale(1)';
        void modalBox.offsetWidth;
        
        const targetRect = modalBox.getBoundingClientRect();
        
        if (iosOriginX !== null && iosOriginY !== null) {
            const deltaX = iosOriginX - (targetRect.left + targetRect.width / 2);
            const deltaY = iosOriginY - (targetRect.top + targetRect.height / 2);
            
            modalBox.style.transformOrigin = 'center center';
            modalBox.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.15)`;
            modalBox.style.opacity = '0';
            
            // Force reflow
            void modalBox.offsetWidth;
            
            // Start animation
            modalBox.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease';
            modalBox.style.transform = 'translate(0px, 0px) scale(1)';
            modalBox.style.opacity = '1';
        }

        setTimeout(() => modal.classList.add('active'), 10);
    }

    function closeReviewModal() {
        const modal = document.getElementById('reviewModal');
        const modalBox = modal.querySelector('.modal-box');
        
        modal.classList.remove('active');
        
        if (iosOriginX !== null && iosOriginY !== null) {
            const targetRect = modalBox.getBoundingClientRect();
            
            const deltaX = iosOriginX - (targetRect.left + targetRect.width / 2);
            const deltaY = iosOriginY - (targetRect.top + targetRect.height / 2);
            
            modalBox.style.transformOrigin = 'center center';
            modalBox.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease';
            modalBox.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.15)`;
            modalBox.style.opacity = '0';
        }

        setTimeout(() => {
            modal.style.display = 'none';
            modalBox.style.transform = '';
            modalBox.style.transition = '';
            modalBox.style.opacity = '';
        }, 300);
    }

    // Charts Configuration
    let ratingChart, sentimentChart, eventChart;

    function renderCharts() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        const textColor = isDark ? '#9ca3af' : '#6b7280';
        const gold = '#D4AF37';
        const maroon = '#800000';

        const ctxRating = document.getElementById('ratingChart').getContext('2d');
        
        // Create gradient for rating bars
        const ratingGradient = ctxRating.createLinearGradient(0, 0, 400, 0);
        ratingGradient.addColorStop(0, 'rgba(212, 175, 55, 0.8)'); // gold
        ratingGradient.addColorStop(1, 'rgba(212, 175, 55, 1)');
        
        ratingChart = new Chart(ctxRating, {
            type: 'bar',
            data: {
                labels: ['5 Star', '4 Star', '3 Star', '2 Star', '1 Star'],
                datasets: [{
                    label: 'Ratings',
                    data: JSON.parse(document.getElementById("admin-ratings-data")?.textContent || "[0,0,0,0,0]"),
                    backgroundColor: [
                        ratingGradient,
                        ratingGradient,
                        'rgba(23, 162, 184, 0.8)', // info
                        'rgba(255, 193, 7, 0.8)', // warning
                        'rgba(220, 53, 69, 0.8)'  // danger
                    ],
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: { 
                indexAxis: 'y', responsive: true, maintainAspectRatio: false, 
                scales: { 
                    x: { grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, precision: 0, font: {family: 'Inter', weight: 600} } }, 
                    y: { grid: { display: false }, ticks: { color: textColor, font: {family: 'Inter', weight: 'bold'} } } 
                }, 
                plugins: { 
                    legend: { display: false },
                    tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleFont: {family: 'Inter'}, bodyFont: {family: 'Inter'}, padding: 12, cornerRadius: 8 }
                } 
            }
        });

        const ctxSentiment = document.getElementById('sentimentChart').getContext('2d');
        sentimentChart = new Chart(ctxSentiment, {
            type: 'doughnut',
            data: {
                labels: ['Positive', 'Neutral', 'Negative'],
                datasets: [{
                    data: JSON.parse(document.getElementById("admin-sentiment-data")?.textContent || "[0,0,0]"),
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], // Modern Tailwind colors
                    borderWidth: 0, hoverOffset: 8
                }]
            },
            options: { 
                responsive: true, maintainAspectRatio: false, cutout: '75%',
                layout: { padding: 10 },
                plugins: { 
                    legend: { position: 'bottom', labels: { color: textColor, padding: 20, usePointStyle: true, pointStyle: 'circle', font: {family: 'Inter', weight: 600} } },
                    tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', bodyFont: {family: 'Inter', size: 14}, padding: 12, cornerRadius: 8 }
                } 
            }
        });

        const ctxEvent = document.getElementById('eventChart').getContext('2d');
        
        // Create gradient for area chart
        const eventGradient = ctxEvent.createLinearGradient(0, 0, 0, 300);
        eventGradient.addColorStop(0, 'rgba(128, 0, 0, 0.4)');
        eventGradient.addColorStop(1, 'rgba(128, 0, 0, 0.0)');

        eventChart = new Chart(ctxEvent, {
            type: 'line',
            data: {
                labels: JSON.parse(document.getElementById("admin-event-freq-labels")?.textContent || "[]"),
                datasets: [{
                    label: 'Events Held',
                    data: JSON.parse(document.getElementById("admin-event-freq-values")?.textContent || "[]"),
                    borderColor: maroon, 
                    backgroundColor: eventGradient,
                    borderWidth: 3, tension: 0.5, fill: true, // Smoother curve with tension 0.5
                    pointBackgroundColor: gold, pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 7
                }]
            },
            options: { 
                responsive: true, maintainAspectRatio: false, 
                interaction: { mode: 'index', intersect: false },
                scales: { 
                    y: { beginAtZero: true, ticks: { color: textColor, precision: 0, font: {family: 'Inter'} }, grid: { color: gridColor, drawBorder: false } }, 
                    x: { ticks: { color: textColor, font: {family: 'Inter', weight: 600} }, grid: { display: false } } 
                }, 
                plugins: { 
                    legend: { display: false },
                    tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleFont: {family: 'Inter'}, bodyFont: {family: 'Inter', weight: 'bold'}, padding: 12, cornerRadius: 8, displayColors: false }
                } 
            }
        });
    }

    function updateChartsTheme(theme) {
        if(!ratingChart) return;
        const isDark = theme === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        const textColor = isDark ? '#9ca3af' : '#6b7280';
        
        [ratingChart, eventChart].forEach(chart => {
            if(chart.options.scales.x) {
                chart.options.scales.x.ticks.color = textColor;
                if(chart.options.scales.x.grid) chart.options.scales.x.grid.color = gridColor;
            }
            if(chart.options.scales.y) {
                chart.options.scales.y.ticks.color = textColor;
                if(chart.options.scales.y.grid) chart.options.scales.y.grid.color = gridColor;
            }
            chart.update();
        });
        
        sentimentChart.options.plugins.legend.labels.color = textColor;
        sentimentChart.update();
    }

    window.addEventListener('load', () => {
        // Delay to show skeleton
        setTimeout(() => {
            renderCharts();
            
            // Mobile Charts Carousel Focus Logic
            if (window.innerWidth <= 900) {
                const mainContainer = document.querySelector('#main-content-area .charts-container');
                const realCharts = mainContainer.querySelectorAll('.chart-box');
                
                if (realCharts.length > 0) {
                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                entry.target.classList.add('focused-chart');
                            } else {
                                entry.target.classList.remove('focused-chart');
                            }
                        });
                    }, {
                        root: mainContainer,
                        threshold: 0.5
                    });

                    realCharts.forEach(chart => observer.observe(chart));
                    
                    // Auto-scroll to center the first item initially
                    setTimeout(() => {
                        mainContainer.scrollLeft = realCharts[0].offsetLeft - (mainContainer.clientWidth / 2) + (realCharts[0].clientWidth / 2);
                    }, 100);
                }
            }
        }, 1000);
    });

    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            setTimeout(() => {
                const newTheme = document.documentElement.getAttribute('data-theme');
                updateChartsTheme(newTheme);
            }, 50); 
        });
    });
