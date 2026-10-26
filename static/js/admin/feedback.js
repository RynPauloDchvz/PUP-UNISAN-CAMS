// Theme logic for charts (para bumagay sa Dark/Light mode)
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#9ca3af' : '#6b7280';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    // 🟢 REAL DATA FROM BACKEND 🟢
    const criteriaData = JSON.parse(document.getElementById("admin-criteria-data")?.textContent || "[0,0,0,0,0]");
    const yearLevelData = JSON.parse(document.getElementById("admin-year-data")?.textContent || "[0,0,0,0]");
    const allComments = JSON.parse(document.getElementById("admin-comments-data")?.textContent || "[]");

    function toggleDrawer(drawerId) {
        const drawer = document.getElementById(drawerId);
        const icon = document.getElementById(drawerId + 'Icon');
        
        if (drawer.classList.contains('max-h-0')) {
            drawer.classList.remove('max-h-0', 'opacity-0', 'mb-0');
            drawer.classList.add('max-h-[1000px]', 'opacity-100', 'mb-6');
            if (icon) icon.classList.add('rotate-180');
            
            // Center the first carousel item on mobile when opened
            if (window.innerWidth <= 1023) {
                const container = drawer.querySelector('.charts-container');
                const items = container ? container.querySelectorAll('.chart-box') : [];
                if (container && items.length > 0) {
                    setTimeout(() => {
                        container.scrollLeft = items[0].offsetLeft - (container.clientWidth / 2) + (items[0].clientWidth / 2);
                    }, 350); // wait for height transition to mostly finish
                }
            }
        } else {
            drawer.classList.add('max-h-0', 'opacity-0', 'mb-0');
            drawer.classList.remove('max-h-[1000px]', 'opacity-100', 'mb-6');
            if (icon) icon.classList.remove('rotate-180');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        // 🟢 BAR CHART: Ratings Per Question 🟢
        const canvasBar = document.getElementById('questionsBarChart');
        if (canvasBar) {
            const ctxBar = canvasBar.getContext('2d');
            new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: [
                        'Organization', 
                        'Objectives', 
                        'Materials', 
                        'Management Team', 
                        'Venue/Logistics'
                    ],
                    datasets: [{
                        label: 'Average Score',
                        data: criteriaData,
                        backgroundColor: criteriaData.map(score => {
                            if (score >= 4.0) return 'rgba(16, 185, 129, 0.8)'; // Green
                            if (score >= 3.0) return 'rgba(37, 99, 235, 0.8)';  // Blue
                            return 'rgba(239, 68, 68, 0.8)'; // Red
                        }),
                        borderRadius: 6,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(17, 24, 39, 0.9)',
                            titleFont: { family: 'Inter', size: 12 },
                            bodyFont: { family: 'Inter', size: 14, weight: 'bold' },
                            padding: 12,
                            displayColors: false
                        }
                    },
                    scales: {
                        x: {
                            max: 5.0,
                            grid: { color: gridColor },
                            ticks: { color: textColor, font: { family: 'Inter', weight: 'bold' } }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: textColor, font: { family: 'Inter', weight: '600' } }
                        }
                    }
                }
            });
        }

        // 🟢 DOUGHNUT CHART: Year Level Demographics 🟢
        const canvasPie = document.getElementById('yearLevelChart');
        if (canvasPie) {
            const ctxPie = canvasPie.getContext('2d');
            new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
                    datasets: [{
                        data: yearLevelData,
                        backgroundColor: [
                            '#3b82f6', // Blue
                            '#10b981', // Green
                            '#f59e0b', // Yellow
                            '#800000'  // PUP Maroon
                        ],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: textColor, font: { family: 'Inter', size: 10, weight: '600' }, boxWidth: 10, padding: 10 }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(17, 24, 39, 0.9)',
                            bodyFont: { family: 'Inter', size: 13, weight: 'bold' },
                            padding: 10
                        }
                    }
                }
            });
        }

        // 🟢 COMMENTS FILTER LOGIC 🟢
        renderComments('all');

        // Mobile Charts Carousel Focus Logic
        if (window.innerWidth <= 1023) {
            const containers = document.querySelectorAll('.charts-container');
            
            containers.forEach(container => {
                const realCharts = container.querySelectorAll('.chart-box');
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
                        root: container,
                        threshold: 0.5
                    });

                    realCharts.forEach(chart => observer.observe(chart));
                    
                    // Auto-scroll to center the first item initially (if visible)
                    setTimeout(() => {
                        if (container.clientWidth > 0) {
                            container.scrollLeft = realCharts[0].offsetLeft - (container.clientWidth / 2) + (realCharts[0].clientWidth / 2);
                        }
                    }, 100);
                }
            });
        }
    });

    function renderComments(filter) {
        const container = document.getElementById('commentsContainer');
        if (!container) return;
        container.innerHTML = '';

        const filtered = filter === 'all' ? allComments : allComments.filter(c => c.sentiment === filter);

        if (filtered.length === 0) {
            container.innerHTML = `<div class="col-span-2 py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">No comments found for this sentiment.</div>`;
            return;
        }

        filtered.forEach(c => {
            let bg, border, accent, icon, label;
            if (c.sentiment === 'positive') {
                bg = 'bg-green-50 dark:bg-green-900/10'; border = 'border-green-100 dark:border-green-900/30';
                accent = 'bg-green-200 dark:bg-green-800'; icon = 'ph-smiley'; label = 'Positive';
            } else if (c.sentiment === 'negative') {
                bg = 'bg-red-50 dark:bg-red-900/10'; border = 'border-red-100 dark:border-red-900/30';
                accent = 'bg-red-200 dark:bg-red-800'; icon = 'ph-smiley-sad'; label = 'Needs Improvement';
            } else {
                bg = 'bg-gray-50 dark:bg-gray-800/30'; border = 'border-gray-200 dark:border-gray-700';
                accent = 'bg-gray-200 dark:bg-gray-700'; icon = 'ph-smiley-meh'; label = 'Neutral';
            }

            container.innerHTML += `
                <div class="p-5 rounded-2xl ${bg} border ${border} transition-all hover:shadow-md">
                    <div class="flex items-center gap-2 mb-3">
                        <div class="w-8 h-8 rounded-full ${accent} flex items-center justify-center"><i class="ph-bold ${icon}"></i></div>
                        <div>
                            <span class="block text-xs font-black uppercase">${label}</span>
                            <span class="block text-[10px] text-gray-500">${c.year} Student</span>
                        </div>
                    </div>
                    <p class="text-sm font-medium text-gray-800 dark:text-gray-300 leading-relaxed text-justify">"${c.text}"</p>
                </div>
            `;
        });
    }

    // Custom Sentiment Dropdown Logic
    window.toggleSentimentDropdown = function() {
        const menu = document.getElementById('sentimentDropdownMenu');
        const icon = document.getElementById('sentimentCaretIcon');
        if (menu.classList.contains('max-h-0')) {
            menu.classList.remove('max-h-0', 'opacity-0');
            menu.classList.add('max-h-64', 'opacity-100');
            icon.classList.add('rotate-180');
        } else {
            closeSentimentDropdown();
        }
    }

    window.closeSentimentDropdown = function() {
        const menu = document.getElementById('sentimentDropdownMenu');
        const icon = document.getElementById('sentimentCaretIcon');
        if (menu && !menu.classList.contains('max-h-0')) {
            menu.classList.remove('max-h-64', 'opacity-100');
            menu.classList.add('max-h-0', 'opacity-0');
            icon.classList.remove('rotate-180');
        }
    }

    window.selectSentiment = function(value, text) {
        document.getElementById('sentimentSelectedText').innerText = text;
        closeSentimentDropdown();
        renderComments(value);
    }

    document.addEventListener('click', function(event) {
        const btn = document.getElementById('sentimentDropdownBtn');
        const menu = document.getElementById('sentimentDropdownMenu');
        if (btn && menu && !btn.contains(event.target) && !menu.contains(event.target)) {
            closeSentimentDropdown();
        }
    });
