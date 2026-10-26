// Automatic Device Dark/Light Theme Detection
        function applySystemTheme() {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
        applySystemTheme();
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySystemTheme);
        }

        // Direct browser file:/// preview fallback (avoids net::ERR_FILE_NOT_FOUND when opened without Django)
        if (window.location.protocol === 'file:') {
            document.addEventListener('DOMContentLoaded', function() {
                var logo = document.getElementById('cams-logo');
                if (logo && (!logo.complete || logo.naturalWidth === 0 || logo.src.indexOf('%7B') !== -1)) {
                    logo.src = '../static/images/loading_icon.png';
                }
                var fav = document.getElementById('cams-favicon');
                if (fav) {
                    fav.href = '../static/images/loading_icon.png';
                }
            });
        }

        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        pup: {
                            maroon: '#800000',
                            maroonDark: '#600000',
                            maroonLight: '#990000',
                            gold: '#D4AF37',
                            goldLight: '#E5C158',
                        }
                    }
                }
            }
        }
