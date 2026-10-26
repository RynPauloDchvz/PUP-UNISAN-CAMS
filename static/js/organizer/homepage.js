document.addEventListener('mousedown', function(e) {
  if (document.body.style.overflow === 'hidden' || e.target.closest('.ios-pop-wrapper')) return;
  document.documentElement.style.setProperty('--click-x', e.clientX + 'px');
  document.documentElement.style.setProperty('--click-y', e.clientY + 'px');
}, true);

(function() {
  let latestNews = [];
  let calendarEvents = [];
  let orgOfficers = [];
  try {
    const newsEl = document.getElementById('latest-news-data');
    if (newsEl && newsEl.textContent) latestNews = JSON.parse(newsEl.textContent);
    const calEl = document.getElementById('calendar-events-data');
    if (calEl && calEl.textContent) calendarEvents = JSON.parse(calEl.textContent);
    const offEl = document.getElementById('org-officers-data');
    if (offEl && offEl.textContent) orgOfficers = JSON.parse(offEl.textContent);
  } catch(e) {
    console.error("Error parsing homepage JSON data:", e);
  }

  window.VUE_APP_DATA = Object.assign(window.VUE_APP_DATA || {}, {
    latestNews: latestNews,
    calendarEvents: calendarEvents,
    filteredCalendarEvents: [],
    calendarFilterDate: null,
    calendarCurrentMonth: new Date(),
    activeDrawer: null,
    orgOfficers: orgOfficers
  });
})();


// 1. Slideshow Logic
  let slideIndex = 0;
  function showSlides() {
    let i;
    let slides = document.getElementsByClassName("slide");
    if(!slides.length) return;
    for (i = 0; i < slides.length; i++) slides[i].style.display = "none"; 
    slideIndex++;
    if (slideIndex> slides.length) {slideIndex = 1}  
    slides[slideIndex-1].style.display = "block"; 
    setTimeout(showSlides, 4000); 
  }
  document.addEventListener('DOMContentLoaded', showSlides);

  // 2. Carousel Focus Effect Logic
  function initCarouselFocus() {
    if (window.innerWidth>= 768) return; 
    const carousel = document.querySelector('.news-carousel');
    const cards = document.querySelectorAll('.news-card');
    if (!carousel || !cards.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('active-focus');
        else entry.target.classList.remove('active-focus');
      });
    }, {
      root: carousel, threshold: 0.7, rootMargin: '0px -10% 0px -10%'
    });
    cards.forEach(card => observer.observe(card));
    if (carousel.scrollLeft === 0 && cards[0]) cards[0].classList.add('active-focus');
  }
  document.addEventListener('DOMContentLoaded', initCarouselFocus);
  window.addEventListener('resize', initCarouselFocus);

  // Officers Focus Effect Logic (Strict Single Center Focus)
  function initOfficerFocus() {
    const carousel = document.getElementById('officers-scroll');
    // We use setTimeout because Vue might need a tick to render v-for items
    setTimeout(() => {
      const cards = document.querySelectorAll('.officer-card-item');
      if (!carousel || !cards.length) return;
      
      let isScrolling;
      
      function updateCenterFocus() {
        let closestCard = null;
        let minDistance = Infinity;
        
        // Get the center of the viewport relative to the container
        const carouselRect = carousel.getBoundingClientRect();
        const carouselCenter = carouselRect.left + carouselRect.width / 2;

        cards.forEach(card => {
          const cardRect = card.getBoundingClientRect();
          const cardCenter = cardRect.left + cardRect.width / 2;
          const distance = Math.abs(carouselCenter - cardCenter);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestCard = card;
          }
        });

        cards.forEach(card => {
          if (card === closestCard) {
            card.classList.add('officer-active');
          } else {
            card.classList.remove('officer-active');
          }
        });
      }

      carousel.addEventListener('scroll', () => {
        window.cancelAnimationFrame(isScrolling);
        isScrolling = window.requestAnimationFrame(updateCenterFocus);
      });
      window.addEventListener('resize', updateCenterFocus);
      
      // Run once initially
      updateCenterFocus();
    }, 300);
  }
  document.addEventListener('DOMContentLoaded', initOfficerFocus);
  window.addEventListener('resize', initOfficerFocus);

  // 3. Calendar Integration
  let calendar;
  document.addEventListener('DOMContentLoaded', () => {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    const rawEvents = window.VUE_APP_DATA.calendarEvents || [];
    const formattedEvents = rawEvents.map(e => ({
      id: e.id, title: e.title, start: e.date,
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
        const appElement = document.getElementById('app');
        if (appElement && appElement.__vue_app__) {
          const vm = appElement.__vue_app__._instance.proxy;
          vm.calendarCurrentMonth = info.view.currentStart;
          vm.updateFilteredEvents();
        }
      },
      dateClick: (info) => {
        const appElement = document.getElementById('app');
        if (appElement && appElement.__vue_app__) {
          const vm = appElement.__vue_app__._instance.proxy;
          vm.calendarFilterDate = info.dateStr;
          vm.updateFilteredEvents();
        }
        document.querySelectorAll('.fc-daygrid-day').forEach(el => el.classList.remove('selected-day'));
        info.dayEl.classList.add('selected-day');
      },
      eventClick: (info) => handleCalendarEventClick(info.event.extendedProps, info.jsEvent)
    });
    calendar.render();
  });

  function handleCalendarEventClick(evt, jsEvent) {
    const modal = document.getElementById('calendarEventModal');
    const wrapper = modal.querySelector('.ios-pop-wrapper');
    if (wrapper && jsEvent) {
        wrapper.style.transformOrigin = `${jsEvent.clientX}px ${jsEvent.clientY}px`;
    }
    document.getElementById('calModalTitle').innerText = evt.title;
    document.getElementById('calModalStatus').innerText = evt.status;
    document.getElementById('calModalDateTime').innerText = `${evt.date} • ${evt.start_time}`;
    document.getElementById('calModalVenue').innerText = evt.venue || 'TBD';
    document.getElementById('calModalDesc').innerText = evt.description || 'No description provided.';
    document.getElementById('calModalImg').src = evt.image || '/static/images/background.jpg';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }
  
  function openFullCalendarModal(e) {
    const modal = document.getElementById('fullCalendarModal');
    const wrapper = modal.querySelector('.ios-pop-wrapper');
    if (wrapper && e) {
        wrapper.style.transformOrigin = `${e.clientX}px ${e.clientY}px`;
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    if (calendar) {
      setTimeout(() => { calendar.render(); }, 100);
      setTimeout(() => { calendar.render(); calendar.updateSize(); }, 450);
    }
  }
  function closeFullCalendarModal() {
    const modal = document.getElementById('fullCalendarModal');
    const wrapper = modal.querySelector('.ios-pop-wrapper');
    if (wrapper) {
        wrapper.classList.add('ios-pop-wrapper-close');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
            wrapper.classList.remove('ios-pop-wrapper-close');
        }, 350);
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }
  }

  function closeCalendarModal() {
    const modal = document.getElementById('calendarEventModal');
    const wrapper = modal.querySelector('.ios-pop-wrapper');
    if (wrapper) {
        wrapper.classList.add('ios-pop-wrapper-close');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
            wrapper.classList.remove('ios-pop-wrapper-close');
        }, 350);
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }
  }

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
      handleCalendarEventClick(evt, jsEvent) { handleCalendarEventClick(evt, jsEvent); },
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
          const d = new Date(e.date.split('-').join('/'));
          const matchesMonth = d.getFullYear() === year && d.getMonth() === month;
          if (this.calendarFilterDate) return e.date === this.calendarFilterDate;
          return matchesMonth;
        }).sort((a, b) => new Date(a.date.split('-').join('/')) - new Date(b.date.split('-').join('/')));
      }
    });
  })();
