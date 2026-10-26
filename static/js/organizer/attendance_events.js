let eventsData = [];
try {
    const el = document.getElementById('attendance-events-data');
    if (el && el.textContent) {
        eventsData = JSON.parse(el.textContent);
    }
} catch (e) {
    console.error("Error parsing attendance events data:", e);
}

    function renderEventList(dataToRender) {
        const container = document.getElementById('eventListContainer');
        if (!container) return;
        container.innerHTML = '';
        
        if (dataToRender.length === 0) {
            container.innerHTML = `
                <div class="py-10 text-center text-gray-500 dark:text-gray-400 font-medium">
                    <i class="ph-fill ph-magnifying-glass text-4xl mb-2 opacity-50"></i>
                    <p>No events found.</p>
                </div>
            `;
            return;
        }

        dataToRender.forEach(event => {
            const card = `
                <div onclick="openEventModal(${event.id}, event)" class="block group bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer">
                    <div class="flex items-center justify-between pointer-events-none">
                        <div class="flex items-start gap-4">
                            <div class="w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-2.5 shadow-sm shrink-0"></div>
                            <div>
                                <h3 class="font-black text-lg text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">${event.title}</h3>
                                <p class="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 mt-1"><i class="ph-bold ph-calendar-blank"></i> ${event.date} &nbsp;•&nbsp; <i class="ph-bold ph-users"></i> ${event.respondents} Scanned Attendees</p>
                            </div>
                        </div>
                        <i class="ph-bold ph-caret-right text-gray-400 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all text-xl"></i>
                    </div>
                </div>
            `;
            container.innerHTML += card;
        });
    }

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
        
        const filtered = eventsData.filter(event => {
            const matchesSearch = event.title.toLowerCase().includes(searchTerm);
            let matchesDate = true;
            if (selectedCalDate && event.date !== "TBA") {
                matchesDate = event.date.includes(selectedCalDate);
            }
            return matchesSearch && matchesDate;
        });
        renderEventList(filtered);
    }
    
    function openEventModal(eventId, clickEvent) {
        if(clickEvent) {
            document.documentElement.style.setProperty('--click-x', clickEvent.clientX + 'px');
            document.documentElement.style.setProperty('--click-y', clickEvent.clientY + 'px');
        }

        const ev = eventsData.find(e => e.id === eventId);
        if(!ev) return;

        document.getElementById('modalEventTitle').innerText = ev.title;
        document.getElementById('modalTimeInCount').innerText = ev.time_in_count || ev.respondents || 0;
        document.getElementById('modalTimeOutCount').innerText = ev.time_out_count || 0;
        document.getElementById('modalManageBtn').href = `/organizer/manage-attendance?event_id=${ev.id}`;

        const overlay = document.getElementById('eventModalOverlay');
        const container = document.getElementById('eventModalContainer');
        const iosWrapper = document.getElementById('eventIosWrapper');

        overlay.classList.remove('hidden');
        container.classList.remove('hidden');
        iosWrapper.classList.remove('ios-pop-wrapper-close');
        
        document.body.style.overflow = 'hidden';
    }

    function closeEventModal() {
        const overlay = document.getElementById('eventModalOverlay');
        const container = document.getElementById('eventModalContainer');
        const iosWrapper = document.getElementById('eventIosWrapper');

        iosWrapper.classList.add('ios-pop-wrapper-close');
        
        setTimeout(() => {
            overlay.classList.add('hidden');
            container.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }

    window.addEventListener('load', () => {
        renderEventList(eventsData);
    });
