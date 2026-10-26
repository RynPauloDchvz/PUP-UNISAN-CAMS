// 🟢 Reliable External Bridge for FullCalendar 🟢
window.updateVueCalendarList = function(currentDate) {
    if (window.VUE_APP_INSTANCE && typeof window.VUE_APP_INSTANCE.updateFilteredEvents === 'function') {
        window.VUE_APP_INSTANCE.updateFilteredEvents(currentDate);
    }
};

// 2. Carousel Focus Effect (Mobile Only)
function initCarouselFocus() {
    if (window.innerWidth >= 768) return; 
    const carousel = document.querySelector('.news-carousel');
    const cards = document.querySelectorAll('.news-card');
    if (!carousel || !cards.length) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('active-focus');
            else entry.target.classList.remove('active-focus');
        });
    }, {
        root: carousel,
        threshold: 0.7,
        rootMargin: '0px -10% 0px -10%'
    });
    cards.forEach(card => observer.observe(card));
    if (carousel.scrollLeft === 0) cards[0].classList.add('active-focus');
}
document.addEventListener('DOMContentLoaded', initCarouselFocus);
window.addEventListener('resize', initCarouselFocus);

// 3. FullCalendar Integration
let calendar;
function initCalendarLogic() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    const rawEvents = (window.VUE_APP_DATA && window.VUE_APP_DATA.calendarEvents) || [];
    const formattedEvents = rawEvents.map(e => ({
        id: e.id,
        title: e.title,
        start: e.date,
        backgroundColor: e.status === 'Approved' ? '#800000' : '#EAB308',
        borderColor: e.status === 'Approved' ? '#800000' : '#EAB308',
        extendedProps: { ...e }
    }));
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next', center: 'title', right: '' },
        height: 'auto',
        selectable: true,
        events: formattedEvents,
        datesSet: (info) => {
            if (window.updateVueCalendarList) {
                window.updateVueCalendarList(info.view.currentStart);
            }
        },
        dateClick: (info) => {
            if (window.VUE_APP_INSTANCE) {
                window.VUE_APP_INSTANCE.calendarFilterDate = info.dateStr;
                window.VUE_APP_INSTANCE.updateFilteredEvents();
            }
            document.querySelectorAll('.fc-daygrid-day').forEach(el => el.classList.remove('selected-day'));
            info.dayEl.classList.add('selected-day');
        },
        eventClick: (info) => handleCalendarEventClick(info.event.extendedProps, info.jsEvent)
    });
    calendar.render();
}
window.addEventListener('load', () => {
    const checkInterval = setInterval(() => {
        if (window.VUE_APP_MOUNTED) {
            clearInterval(checkInterval);
            initCalendarLogic();
        }
    }, 50);
});

function handleCalendarEventClick(evt, jsEvent) {
    document.getElementById('calModalTitle').innerText = evt.title;
    document.getElementById('calModalStatus').innerText = evt.status;
    document.getElementById('calModalDateTime').innerText = `${evt.date} • ${evt.start_time}`;
    document.getElementById('calModalVenue').innerText = evt.venue || 'TBD';
    document.getElementById('calModalDesc').innerText = evt.description || 'No description provided.';
    document.getElementById('calModalImg').src = evt.image || '/static/images/PUPLogo.png';
    
    const modal = document.getElementById('calendarEventModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';

    const wrapper = modal.querySelector('.ios-pop-wrapper');
    if (wrapper) {
        wrapper.classList.remove('ios-pop-wrapper-close');
        if (jsEvent && jsEvent.clientX) {
            wrapper.style.setProperty('--click-x', jsEvent.clientX + 'px');
            wrapper.style.setProperty('--click-y', jsEvent.clientY + 'px');
        } else {
            wrapper.style.setProperty('--click-x', '50%');
            wrapper.style.setProperty('--click-y', '50%');
        }
    }
}

function closeCalendarModal() {
    const modal = document.getElementById('calendarEventModal');
    const wrapper = modal.querySelector('.ios-pop-wrapper');
    
    const finishClose = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        // Only re-enable scrolling if the main calendar modal is NOT open
        const fullCal = document.getElementById('fullCalendarModal');
        if (!fullCal || fullCal.classList.contains('hidden')) {
            document.body.style.overflow = '';
        }
    };

    if (wrapper) {
        wrapper.classList.add('ios-pop-wrapper-close');
        setTimeout(finishClose, 350);
    } else {
        finishClose();
    }
}

function openFullCalendarModal(jsEvent) {
    const modal = document.getElementById('fullCalendarModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';

    const wrapper = modal.querySelector('.ios-pop-wrapper');
    if (wrapper) {
        wrapper.classList.remove('ios-pop-wrapper-close');
        if (jsEvent && jsEvent.clientX) {
            wrapper.style.setProperty('--click-x', jsEvent.clientX + 'px');
            wrapper.style.setProperty('--click-y', jsEvent.clientY + 'px');
        } else {
            wrapper.style.setProperty('--click-x', '50%');
            wrapper.style.setProperty('--click-y', '50%');
        }
    }

    setTimeout(() => {
        if (calendar) calendar.render();
    }, 50);
    setTimeout(() => { 
        if (calendar) {
            calendar.render(); 
            calendar.updateSize(); 
        }
    }, 450);
}

function closeFullCalendarModal() {
    const modal = document.getElementById('fullCalendarModal');
    const wrapper = modal.querySelector('.ios-pop-wrapper');
    
    const finishClose = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        
        // Re-enable scrolling only if the other modal isn't open
        const eventCal = document.getElementById('calendarEventModal');
        if (!eventCal || eventCal.classList.contains('hidden')) {
            document.body.style.overflow = '';
        }
    };

    if (wrapper) {
        wrapper.classList.add('ios-pop-wrapper-close');
        setTimeout(finishClose, 350);
    } else {
        finishClose();
    }
}

// Vue Methods
(function() {
    window.VUE_APP_METHODS = Object.assign(window.VUE_APP_METHODS || {}, {
        getMonth(dateStr) { 
            return new Date(dateStr.split('-').join('/')).toLocaleString('default', { month: 'short' }); 
        },
        getDay(dateStr) { 
            return new Date(dateStr.split('-').join('/')).getDate(); 
        },
        formatDateShort(dateStr) {
            return new Date(dateStr.split('-').join('/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        },
        markEventViewedAndOpen(evt, event) {
            if (!this.viewedEventIds.includes(evt.id)) {
                this.viewedEventIds.push(evt.id);
                this.updateFilteredEvents();
            }
            handleCalendarEventClick(evt, event);
        },
        handleCalendarEventClick(evt, event) { handleCalendarEventClick(evt, event); },
        resetCalendarFilter() {
            this.calendarFilterDate = null;
            document.querySelectorAll('.fc-daygrid-day').forEach(el => el.classList.remove('selected-day'));
            this.updateFilteredEvents();
        },
        updateFilteredEvents(currentDate) {
            if (currentDate) this.calendarCurrentMonth = currentDate;
            const activeMonth = this.calendarCurrentMonth;
            const year = activeMonth.getFullYear();
            const month = activeMonth.getMonth();
            const allEvts = this.calendarEvents || [];
            
            this.filteredCalendarEvents = allEvts.filter(e => {
                if (this.viewedEventIds && this.viewedEventIds.includes(e.id)) return false;
                const d = new Date(e.date.split('-').join('/'));
                const matchesMonth = d.getFullYear() === year && d.getMonth() === month;
                if (this.calendarFilterDate) return e.date === this.calendarFilterDate;
                return matchesMonth;
            }).sort((a, b) => new Date(a.date.split('-').join('/')) - new Date(b.date.split('-').join('/')));
        }
    });
})();

// Officer Carousel Focus Script
document.addEventListener("DOMContentLoaded", () => {
    // Wait for Vue to render the elements
    const checkExist = setInterval(() => {
        const container = document.getElementById('officers-scroll');
        const cards = document.querySelectorAll('.officer-card-item');
        
        if (container && cards.length > 0) {
            clearInterval(checkExist);
            
            const updateFocus = () => {
                let minDist = Infinity;
                let focusedCard = null;
                const containerCenter = container.getBoundingClientRect().left + container.offsetWidth / 2;
                
                cards.forEach(card => {
                    const cardCenter = card.getBoundingClientRect().left + card.offsetWidth / 2;
                    const dist = Math.abs(containerCenter - cardCenter);
                    if (dist < minDist) {
                        minDist = dist;
                        focusedCard = card;
                    }
                });
                
                cards.forEach(card => {
                    if (card === focusedCard) {
                        card.style.transform = 'scale(1.05)';
                        card.style.opacity = '1';
                        card.classList.add('ring-2', 'ring-pup-maroon', 'dark:ring-pup-gold', 'shadow-xl');
                        card.classList.remove('shadow-sm');
                    } else {
                        card.style.transform = 'scale(0.85)';
                        card.style.opacity = '0.5';
                        card.classList.remove('ring-2', 'ring-pup-maroon', 'dark:ring-pup-gold', 'shadow-xl');
                        card.classList.add('shadow-sm');
                    }
                });
            };

            container.addEventListener('scroll', updateFocus);
            window.addEventListener('resize', updateFocus);
            
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    const containerCenter = container.offsetWidth / 2;
                    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
                    container.scrollTo({
                        left: cardCenter - containerCenter,
                        behavior: 'smooth'
                    });
                });
            });

            setTimeout(updateFocus, 100);
        }
    }, 200);
});
