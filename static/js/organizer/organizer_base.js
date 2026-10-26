window.VUE_APP_DATA = Object.assign(window.VUE_APP_DATA || {}, {
    currentUrl: (function() {
        try {
            const el = document.getElementById('organizer-base-config');
            return el ? JSON.parse(el.textContent).currentUrl : '';
        } catch(e) { return ''; }
    })(),
    unreadNotifCount: 0,
    showNotifDropdown: false,
    notifications: [],
    showMobileDrawer: false,
    showLogoutModal: false
});

function openLogout(e) {
            if(e) e.preventDefault();
            const modal = document.getElementById('custom-logout-modal');
            const card = document.getElementById('custom-logout-card');
            modal.classList.remove('opacity-0', 'pointer-events-none');
            card.classList.remove('scale-95');
            card.classList.add('scale-100');
            document.body.style.overflow = 'hidden';
        }
        function closeLogout() {
            const modal = document.getElementById('custom-logout-modal');
            const card = document.getElementById('custom-logout-card');
            modal.classList.add('opacity-0', 'pointer-events-none');
            card.classList.remove('scale-100');
            card.classList.add('scale-95');
            document.body.style.overflow = '';
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            // Scroll active mobile nav item into view
            setTimeout(() => {
                const activeNavItem = document.querySelector('.active-unit-elevated');
                if (activeNavItem) {
                    activeNavItem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            }, 300); // Slight delay to ensure Vue has rendered the list
        });

        window.STATIC_IMAGES_BASE = "{% static 'images/' %}";
        window.DEFAULT_LOGO = "{% static 'images/PUPLogo.png' %}";

document.addEventListener("DOMContentLoaded", () => {
      const shatterLoader = document.getElementById("global-shatter-loader");
      if (shatterLoader) {
          setTimeout(() => {
              shatterLoader.style.opacity = '0';
              shatterLoader.style.pointerEvents = 'none';
          }, 400); 
      }

      document.querySelectorAll('a').forEach(link => {
          link.addEventListener('click', function(e) {
              if (this.target === '_blank' || this.hasAttribute('download')) return;
              const href = this.getAttribute('href');
              if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
              if (href.startsWith('http') && !this.href.includes(window.location.host)) return;
              
              if (shatterLoader) {
                  shatterLoader.style.opacity = '1';
                  shatterLoader.style.pointerEvents = 'auto';
              }
          });
      });

      // Live GPS Location Sync for Document Tracking
      if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition((pos) => {
              fetch("/api/update-user-location/", {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                      "X-CSRFToken": (document.cookie.split('; ').find(row => row.startsWith('csrftoken=')) ? document.cookie.split('; ').find(row => row.startsWith('csrftoken=')).split('=')[1] : '')
                  },
                  body: JSON.stringify({
                      latitude: pos.coords.latitude,
                      longitude: pos.coords.longitude
                  })
              }).catch(() => {});
          }, () => {}, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
      }
  });
