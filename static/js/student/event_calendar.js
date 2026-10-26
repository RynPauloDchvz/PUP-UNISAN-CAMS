let calendar; // global

function toggleMobileCalendar(event) {
    const wrapper = document.getElementById('calendar-wrapper');
    if (wrapper.classList.contains('hidden')) {
        // Force center origin so fullscreen doesn't tilt from edge click
        wrapper.style.setProperty('--click-x', '50%');
        wrapper.style.setProperty('--click-y', '50%');

        wrapper.classList.remove('hidden', 'lg:flex', 'rounded-3xl', 'ios-pop-wrapper-close');
        wrapper.classList.add('flex', 'fixed', 'inset-0', 'z-[5000]', 'shadow-2xl', '!rounded-none', 'ios-pop-wrapper');
        document.body.style.overflow = 'hidden';
        setTimeout(() => { if (calendar) calendar.render(); }, 50);
    } else {
        wrapper.classList.remove('ios-pop-wrapper');
        wrapper.classList.add('ios-pop-wrapper-close');
        setTimeout(() => {
            wrapper.classList.add('hidden', 'lg:flex', 'rounded-3xl');
            wrapper.classList.remove('flex', 'fixed', 'inset-0', 'z-[5000]', 'shadow-2xl', '!rounded-none', 'ios-pop-wrapper-close');
            wrapper.style.opacity = '';
            wrapper.style.transition = '';
            document.body.style.overflow = '';
        }, 350);
    }
}

function initCalendarLogic() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    let allEvents = [];
    try {
        const dataEl = document.getElementById('calendar-events-data');
        if (dataEl && dataEl.textContent) {
            allEvents = JSON.parse(dataEl.textContent);
        }
    } catch (e) {
        console.error("Error parsing calendar events data:", e);
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        themeSystem: 'standard',
        events: allEvents,
        datesSet: function(info) {
            // Update the banner based on the current view
            const viewTitle = info.view.title.toUpperCase();
            const bannerTextEl = document.querySelector('#totalEventsBanner + p');
            if (bannerTextEl) {
                bannerTextEl.innerText = `Total Upcoming Events on ${viewTitle}`;
            }

            // Calculate count for the visible month
            const currentYear = info.view.currentStart.getFullYear();
            const currentMonth = info.view.currentStart.getMonth();
            const today = new Date();
            today.setHours(0,0,0,0);

            const count = allEvents.filter(evt => {
                const evtDate = new Date(evt.start);
                return evtDate.getFullYear() === currentYear && 
                       evtDate.getMonth() === currentMonth &&
                       evtDate >= today;
            }).length;

            const bannerCountEl = document.getElementById('totalEventsBanner');
            if (bannerCountEl) {
                bannerCountEl.innerText = count;
            }

            // Filter masterlist cards to match the month
            const masterlistCards = document.querySelectorAll('.js-masterlist-card');
            let visibleCount = 0;
            masterlistCards.forEach(card => {
                const cardDate = new Date(card.dataset.fullDate);
                if (cardDate.getFullYear() === currentYear && cardDate.getMonth() === currentMonth) {
                    card.classList.remove('hidden');
                    card.classList.add('flex');
                    visibleCount++;
                } else {
                    card.classList.remove('flex');
                    card.classList.add('hidden');
                }
            });

            // Handle empty state for masterlist
            let emptyMsg = document.getElementById('masterlistEmptyMsg');
            if (visibleCount === 0) {
                if (!emptyMsg) {
                    const msgDiv = document.createElement('div');
                    msgDiv.id = 'masterlistEmptyMsg';
                    msgDiv.className = 'text-center py-10 opacity-50';
                    msgDiv.innerHTML = '<i class="ph-bold ph-calendar-x text-4xl mb-2"></i><p class="text-sm">No events this month.</p>';
                    document.getElementById('masterlistContainer').appendChild(msgDiv);
                } else {
                    emptyMsg.classList.remove('hidden');
                }
            } else if (emptyMsg) {
                emptyMsg.classList.add('hidden');
            }
        },
        eventClick: function(info) {
            const eventTitle = info.event.title;
            const props = info.event.extendedProps;
            
            // Format date for display
            const eventDate = info.event.start.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            }).toUpperCase();

            // Get click coordinates from FullCalendar's jsEvent
            const jsEvent = info.jsEvent;
            openModal(
                eventTitle, 
                props.category, 
                eventDate, 
                props.time, 
                props.venue, 
                props.description, 
                props.image,
                props.id,
                jsEvent
            );
        },
        height: '100%'
    });
    calendar.render();

    // Masterlist card clicks
    const masterlistCards = document.querySelectorAll('.js-masterlist-card');
    masterlistCards.forEach(card => {
        card.addEventListener('click', (e) => {
            openModal(
                card.dataset.title,
                card.dataset.category,
                card.dataset.date,
                card.dataset.time,
                card.dataset.venue,
                card.dataset.desc,
                card.dataset.img,
                card.dataset.id,
                e
            );
        });
    });

    function openModal(title, category, date, time, venue, desc, imgSrc, eventId, clickEvent) {
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalCategory').innerText = category;
        document.getElementById('modalDateTime').innerHTML = `<i class="ph-fill ph-calendar text-pup-maroon dark:text-pup-gold text-lg"></i> ${date} • ${time}`;
        document.getElementById('modalVenue').innerHTML = `<i class="ph-fill ph-map-pin text-pup-maroon dark:text-pup-gold text-lg"></i> ${venue}`;
        document.getElementById('modalDesc').innerText = desc;
        
        const imgEl = document.getElementById('modalImg');
        imgEl.src = imgSrc;
        imgEl.onerror = function() {
            this.src = "/static/images/PUPLogo.png";
            this.classList.remove('object-cover');
            this.classList.add('object-contain', 'p-4');
        };

        const baseUrl = "/student/school-events/";
        const targetUrl = eventId ? `${baseUrl}?event_id=${eventId}` : baseUrl;
        
        const desktopBtn = document.getElementById('modalActionBtnDesktop');
        if(desktopBtn) desktopBtn.href = targetUrl;
        
        const mobileBtn = document.getElementById('modalActionBtnMobile');
        if(mobileBtn) mobileBtn.href = targetUrl;

        const modal = document.getElementById('masterlistModal');
        const modalContent = document.getElementById('masterlistModalContent');

        // Set iOS animation origin
        const cx = clickEvent ? clickEvent.clientX + 'px' : '50%';
        const cy = clickEvent ? clickEvent.clientY + 'px' : '50%';
        modalContent.style.setProperty('--click-x', cx);
        modalContent.style.setProperty('--click-y', cy);
        modalContent.classList.remove('ios-pop-wrapper-close');
        modalContent.classList.add('ios-pop-wrapper');

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const modal = document.getElementById('masterlistModal');
        const modalContent = document.getElementById('masterlistModalContent');
        modalContent.classList.remove('ios-pop-wrapper');
        modalContent.classList.add('ios-pop-wrapper-close');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 350);
    }

    const closeBtn = document.getElementById('btnTopClose');
    if(closeBtn) closeBtn.addEventListener('click', closeModal);
    
    const bgOverlay = document.getElementById('bgOverlayClose');
    if(bgOverlay) bgOverlay.addEventListener('click', closeModal);
}

window.addEventListener('load', () => {
    const checkInterval = setInterval(() => {
        if (window.VUE_APP_MOUNTED) {
            clearInterval(checkInterval);
            initCalendarLogic();
        }
    }, 100);
});
