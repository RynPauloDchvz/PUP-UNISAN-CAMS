</script>
<script>
    // 🟢 REAL DATA FROM BACKEND 🟢
    let eventHistoryData = [];
try {
    const el = document.getElementById('event-history-data');
    if (el && el.textContent) {
        eventHistoryData = JSON.parse(el.textContent);
    }
} catch (e) {
    console.error("Error parsing eventHistoryData:", e);
}

    let distChartInstance = null;

    // 🟢 RENDER EVENT LIST (Tumatanggap ng data para sa Filter) 🟢
    function renderEventList(dataToRender) {
        const container = document.getElementById('eventListContainer');
        if (!container) return;
        container.innerHTML = '';
        
        if (dataToRender.length === 0) {
            container.innerHTML = `
                <div class="py-10 text-center text-gray-500 dark:text-gray-400 font-medium">
                    <i class="ph-fill ph-magnifying-glass text-4xl mb-2 opacity-50"></i>
                    <p>No events found matching your filter.</p>
                </div>
            `;
            return;
        }

        dataToRender.forEach(eventItem => {
            let dotColor = eventItem.score >= 4.0 ? 'bg-green-500 dark:bg-green-400' : 'bg-orange-500 dark:bg-orange-400';

            const card = `
                <div onclick="openPerformanceModal(${eventItem.id}, event)" class="cursor-pointer group bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 flex items-center justify-between hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
                    <div class="flex items-start gap-4">
                        <div class="w-2.5 h-2.5 rounded-full ${dotColor} mt-2.5 shadow-sm shrink-0"></div>
                        <div>
                            <h3 class="font-black text-lg text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">${eventItem.title}</h3>
                            <p class="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 mt-1"><i class="ph-bold ph-calendar-blank"></i> ${eventItem.date} &nbsp;•&nbsp; <i class="ph-bold ph-users"></i> ${eventItem.respondents} Respondents</p>
                        </div>
                    </div>
                    <i class="ph-bold ph-caret-right text-gray-400 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all text-xl"></i>
                </div>
            `;
            container.innerHTML += card;
        });
    }

    // 🟢 OVERALL STATS MODAL LOGIC 🟢
    function openOverallStatsModal(e) {
        const overlay = document.getElementById('overallStatsOverlay');
        const container = document.getElementById('overallStatsContainer');
        const wrapper = document.getElementById('overallStatsWrapper');
        
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX || (rect.left + rect.width / 2);
        const clickY = e.clientY || (rect.top + rect.height / 2);
        
        wrapper.style.setProperty('--click-x', clickX + 'px');
        wrapper.style.setProperty('--click-y', clickY + 'px');

        wrapper.classList.remove('ios-pop-wrapper-close');
        wrapper.classList.add('ios-pop-wrapper');
        
        overlay.classList.remove('hidden');
        container.classList.remove('hidden');
        
        setTimeout(() => {
            document.body.style.overflow = 'hidden';
        }, 10);
    }

    function closeOverallStatsModal() {
        const overlay = document.getElementById('overallStatsOverlay');
        const wrapper = document.getElementById('overallStatsWrapper');
        
        wrapper.classList.remove('ios-pop-wrapper');
        wrapper.classList.add('ios-pop-wrapper-close');
        
        setTimeout(() => {
            overlay.classList.add('hidden');
            document.getElementById('overallStatsContainer').classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }

    // 🟢 SEARCH & CALENDAR FILTER LOGIC 🟢
    let currentCalDate = new Date();
    let selectedCalDate = null;

    function toggleCalendarPopover() {
        const popover = document.getElementById('calendarPopover');
        if (popover.classList.contains('hidden')) {
            popover.classList.remove('hidden');
            renderCalendar();
            setTimeout(() => {
                popover.classList.remove('scale-95', 'opacity-0');
                popover.classList.add('scale-100', 'opacity-100');
            }, 10);
        } else {
            closeCalendarPopover();
        }
    }

    function closeCalendarPopover() {
        const popover = document.getElementById('calendarPopover');
        if (popover && !popover.classList.contains('hidden')) {
            popover.classList.remove('scale-100', 'opacity-100');
            popover.classList.add('scale-95', 'opacity-0');
            setTimeout(() => popover.classList.add('hidden'), 300);
        }
    }

    document.addEventListener('click', (event) => {
        const popover = document.getElementById('calendarPopover');
        const btn = document.getElementById('calendarFilterBtn');
        if (popover && !popover.classList.contains('hidden')) {
            if (!popover.contains(event.target) && !btn.contains(event.target)) {
                closeCalendarPopover();
            }
        }
    });

    function changeMonth(dir) {
        currentCalDate.setMonth(currentCalDate.getMonth() + dir);
        renderCalendar();
    }

    function renderCalendar() {
        const grid = document.getElementById('calendarDaysGrid');
        const title = document.getElementById('calendarMonthYear');
        grid.innerHTML = '';
        
        const year = currentCalDate.getFullYear();
        const month = currentCalDate.getMonth();
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        title.innerText = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            grid.innerHTML += `<div class="p-2"></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${monthNames[month]} ${String(day).padStart(2, '0')}, ${year}`;
            const isSelected = selectedCalDate === dateStr;
            const bgClass = isSelected ? 'bg-pup-maroon text-white dark:bg-pup-gold dark:text-black font-black shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 font-bold';
            
            grid.innerHTML += `
                <button type="button" onclick="selectDateFilter('${dateStr}')" class="w-8 h-8 mx-auto flex items-center justify-center rounded-lg text-[11px] transition-all ${bgClass}">
                    ${day}
                </button>
            `;
        }
    }

    function selectDateFilter(dateStr) {
        selectedCalDate = dateStr;
        filterEvents();
        closeCalendarPopover();
    }

    function clearDateFilter() {
        selectedCalDate = null;
        filterEvents();
        closeCalendarPopover();
    }

    function filterEvents() {
        const searchTerm = document.getElementById('searchEvent').value.toLowerCase();

        const filtered = eventHistoryData.filter(event => {
            const matchSearch = event.title.toLowerCase().includes(searchTerm);
            
            let matchDate = true;
            if (selectedCalDate) {
                matchDate = (event.date === selectedCalDate);
            }

            return matchSearch && matchDate;
        });

        renderEventList(filtered);
    }

    // 🟢 OPEN MODAL & RENDER CHART 🟢
    function openPerformanceModal(id, e) {
        const eventData = eventHistoryData.find(evt => evt.id == id);
        if (!eventData) return;

        document.getElementById('modalEventTitle').innerText = eventData.title;
        document.getElementById('modalAvgScore').innerText = eventData.score.toFixed(1);
        
        const percent = eventData.sentiment;
        const emojiEl = document.getElementById('modalEvalEmoji');
        const gradeEl = document.getElementById('modalEvalGrade');
        const sentimentEl = document.getElementById('modalSentiment');
        
        sentimentEl.innerText = percent + '%';
        
        if (percent >= 90) { emojiEl.innerText = '🤩'; gradeEl.innerText = 'Outstanding'; sentimentEl.className = 'text-3xl font-black text-green-600 dark:text-green-500'; gradeEl.className = 'text-[0.65rem] font-black text-green-600 dark:text-green-400 mt-1 uppercase tracking-tighter'; }
        else if (percent >= 75) { emojiEl.innerText = '😊'; gradeEl.innerText = 'Satisfactory'; sentimentEl.className = 'text-3xl font-black text-blue-600 dark:text-blue-500'; gradeEl.className = 'text-[0.65rem] font-black text-blue-600 dark:text-blue-400 mt-1 uppercase tracking-tighter'; }
        else if (percent >= 50) { emojiEl.innerText = '😐'; gradeEl.innerText = 'Average'; sentimentEl.className = 'text-3xl font-black text-yellow-600 dark:text-yellow-500'; gradeEl.className = 'text-[0.65rem] font-black text-yellow-600 dark:text-yellow-400 mt-1 uppercase tracking-tighter'; }
        else { emojiEl.innerText = '😡'; gradeEl.innerText = 'Needs Improvement'; sentimentEl.className = 'text-3xl font-black text-red-600 dark:text-red-500'; gradeEl.className = 'text-[0.65rem] font-black text-red-600 dark:text-red-400 mt-1 uppercase tracking-tighter'; }

        // 🟢 SET FEEDBACK LINK 🟢
        const fbBtn = document.getElementById('modalFeedbackBtn');
        fbBtn.onclick = () => {
            window.location.href = `/organizer/feedback/detail?event_id=${eventData.id}`;
        };

        const modal = document.getElementById('performanceModal');
        const box = document.getElementById('performanceModalBox');
        
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX || (rect.left + rect.width / 2);
        const clickY = e.clientY || (rect.top + rect.height / 2);
        
        box.style.setProperty('--click-x', clickX + 'px');
        box.style.setProperty('--click-y', clickY + 'px');

        box.classList.remove('ios-pop-wrapper-close');
        box.classList.add('ios-pop-wrapper');

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            renderSmoothChart(eventData.dist);
        }, 10);
    }

    // 🟢 CLOSE MODAL 🟢
    function closePerformanceModal() {
        const modal = document.getElementById('performanceModal');
        const box = document.getElementById('performanceModalBox');
        
        box.classList.remove('ios-pop-wrapper');
        box.classList.add('ios-pop-wrapper-close');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
        }, 300);
    }

    // 🟢 SMOOTH AREA CHART 🟢
    function renderSmoothChart(dataArray) {
        const canvas = document.getElementById('distributionChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        let gradient = ctx.createLinearGradient(0, 0, 0, 180);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.5)'); 
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

        if (distChartInstance) { distChartInstance.destroy(); }

        distChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1★', '2★', '3★', '4★', '5★'],
                datasets: [{
                    data: dataArray,
                    borderColor: '#3b82f6', 
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4, 
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.9)', // Dark background for tooltip
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        padding: 10,
                        titleFont: { family: 'Inter', size: 12 },
                        bodyFont: { family: 'Inter', size: 14, weight: 'bold' },
                        displayColors: false
                    }
                },
                scales: {
                    y: { 
                        display: false, 
                        beginAtZero: true,
                        max: Math.max(...dataArray) + 15
                    }, 
                    x: { 
                        grid: { display: false }, 
                        ticks: { color: '#9ca3af', font: { family: 'Inter', weight: 'bold', size: 12 } },
                        border: { display: false }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
            }
        });
    }

    // Initialize list on load
    window.addEventListener('load', () => {
        renderEventList(eventHistoryData);
    });
