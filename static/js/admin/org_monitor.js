    let systemEvents = [];
    try {
        const el = document.getElementById('org-monitor-data');
        if (el && el.textContent) systemEvents = JSON.parse(el.textContent);
    } catch (e) {
        console.error("Error parsing systemEvents:", e);
    }

    // 🟢 Kunin ang Org parameter sa URL at I-set ang Variable 🟢
    const urlParams = new URLSearchParams(window.location.search);
    let currentOrg = urlParams.get('org') ? urlParams.get('org').toUpperCase() : 'ALL';



    // 🟢 RENDER LIST & STATS 🟢
    function filterMonitor() {
        const searchInput = document.getElementById('searchEvent').value.trim();
        const searchVal = searchInput.toLowerCase();
        
        const filtered = systemEvents.filter(e => {
            const matchOrg = currentOrg === 'ALL' || e.org === currentOrg;
            const matchSearch = e.title.toLowerCase().includes(searchVal);
            return matchOrg && matchSearch;
        });

        renderList(filtered, searchInput.length > 0, searchInput);
        updateStats(filtered);
    }

    function updateStats(data) {
        document.getElementById('statTotalEvents').innerText = data.length;
        if(data.length === 0) {
            document.getElementById('statTotalAttendees').innerText = '0';
            document.getElementById('statAvgRating').innerText = '0.0';
            document.getElementById('statAvgSentiment').innerText = '0%';
            return;
        }
        
        let totalAtt = 0, totalScore = 0, totalSent = 0;
        let eventsWithEvals = 0;
        
        data.forEach(e => { 
            totalAtt += e.respondents; 
            if (e.respondents > 0) {
                totalScore += e.score; 
                totalSent += e.sentiment; 
                eventsWithEvals++;
            }
        });
        
        document.getElementById('statTotalAttendees').innerText = totalAtt;
        document.getElementById('statAvgRating').innerText = eventsWithEvals > 0 ? (totalScore / eventsWithEvals).toFixed(1) : '0.0';
        document.getElementById('statAvgSentiment').innerText = eventsWithEvals > 0 ? Math.round(totalSent / eventsWithEvals) + '%' : '0%';
    }

    function renderList(data, isSearch = false, searchVal = "") {
        const container = document.getElementById('monitorListContainer');
        container.innerHTML = '';
        
        if (data.length === 0) {
            if (isSearch) {
                container.innerHTML = `
                    <div style="padding: 60px 20px; text-align: center; color: var(--text-muted);">
                        <i class="ph-bold ph-magnifying-glass" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                        <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 5px;">No results found</h4>
                        <p style="font-weight: 600; font-size: 0.9rem;">No event record found matching "${searchVal}"</p>
                    </div>`;
            } else {
                container.innerHTML = `
                    <div style="padding: 60px 20px; text-align: center; color: var(--text-muted);">
                        <i class="ph-bold ph-calendar-blank" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                        <p style="font-weight: 600; font-size: 1rem;">No event records found for ${currentOrg === 'ALL' ? 'any organization' : currentOrg}.</p>
                    </div>`;
            }
            return;
        }

        data.forEach(event => {
            let scoreColor = event.score >= 4.0 ? '#10b981' : '#f59e0b';
            
            const card = `
                <div class="event-row" onclick="window.location.href='/admin/org-monitor/detail/?event_id=' + ${event.id}">
                    <div class="event-info">
                        <div class="event-icon">${event.org}</div>
                        <div class="event-info-text">
                            <span class="event-title" title="${event.title}">${event.title}</span>
                            <div class="event-meta">
                                <span><i class="ph-bold ph-calendar-blank"></i> ${event.date}</span>
                                <span><i class="ph-bold ph-users"></i> ${event.respondents} Respondents</span>
                                <span style="color: ${scoreColor}; font-weight: 800;"><i class="ph-fill ph-star"></i> ${event.score.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="event-action"><i class="ph-bold ph-caret-right"></i></div>
                </div>
            `;
            container.innerHTML += card;
        });
    }



    window.addEventListener('load', () => {
        setTimeout(() => {
            filterMonitor();
        }, 800);
    });

    // Mobile Search Toggle
    function toggleMobileSearch() {
        const wrapper = document.getElementById('searchBoxWrapper');
        const header = document.getElementById('tableHeaderFlex');
        const toggleBtn = document.getElementById('mobileSearchToggle');
        
        if (wrapper.classList.contains('active')) {
            wrapper.classList.remove('active');
            header.classList.remove('search-active');
            toggleBtn.style.opacity = '1';
            toggleBtn.style.pointerEvents = 'auto';
        } else {
            wrapper.classList.add('active');
            header.classList.add('search-active');
            toggleBtn.style.opacity = '0';
            toggleBtn.style.pointerEvents = 'none';
            setTimeout(() => {
                document.getElementById('searchEvent').focus();
            }, 300);
        }
    }
