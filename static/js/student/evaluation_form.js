// 🟢 INTEGRATE INTO STUDENT BASE VUE APP 🟢
window.VUE_APP_DATA = {
    currentId: new URLSearchParams(window.location.search).get('event_id') || sessionStorage.getItem('eval_event_id'),
    currentTitle: new URLSearchParams(window.location.search).get('event_title') || sessionStorage.getItem('eval_event_title') || sessionStorage.getItem('currentEvalTitle') || "General Event Evaluation",
    currentImg: new URLSearchParams(window.location.search).get('event_img') || sessionStorage.getItem('eval_event_img') || sessionStorage.getItem('currentEvalImg') || "/static/images/background.jpg",
    currentStep: 0,
    maxVisitedStep: 0,
    feedbackComment: '',
    isSubmitting: false,
    showSuccessModal: false,
    finalRating: 0,
    emojis: ['😐', '😡', '😟', '😐', '🙂', '🤩'],
    stepLabels: ['I. Mgmt', 'II. Goals', 'III. Provisions', 'IV. Team', 'V. Logistics', 'VI. Feedback'],
    evaluationData: [
        {
            category: "I. Program Management & Organization",
            questions: [
                "The activity/program was delivered as planned.",
                "The activity/program was managed efficiently.",
                "The activity/program was well-structured and organized.",
                "The registration or attendance process was smooth and hassle-free.",
                "The program strictly followed the allocated schedule and time."
            ],
            ratings: [0, 0, 0, 0, 0]
        },
        {
            category: "II. Attainment of Objectives",
            questions: [
                "The purpose or goal of the event was clear to the attendees.",
                "The stated program objectives were successfully attained.",
                "The topics or activities were highly relevant to the attendees.",
                "The activity met my personal or academic expectations.",
                "The event successfully delivered its intended value and significance to the attendees."
            ],
            ratings: [0, 0, 0, 0, 0]
        },
        {
            category: "III. Resources & Event Provisions",
            questions: [
                "The resources, equipment, or materials provided for the event were appropriate and sufficient.",
                "The necessary information and guidelines for the event were clearly communicated beforehand.",
                "The resources/materials needed by the attendees were accessible and provided on time.",
                "The visual, audio, or physical setups effectively supported the activities.",
                "The overall provisions contributed to a better experience of the event."
            ],
            ratings: [0, 0, 0, 0, 0]
        },
        {
            category: "IV. Program/Activity Management Team",
            questions: [
                "The facilitators/organizers were present when needed.",
                "The facilitators/organizers were courteous and approachable.",
                "The facilitators/organizers were efficient in their roles.",
                "The team was responsive to the needs and questions of attendees.",
                "The event heads, speakers, or facilitators performed their roles effectively and with expertise."
            ],
            ratings: [0, 0, 0, 0, 0]
        },
        {
            category: "V. Venue & Platform Logistics",
            questions: [
                "The venue/platform had sufficient space or capacity for all attendees.",
                "The technical equipment (audio, visual, or stream quality) functioned properly.",
                "The environment was conducive and free from unnecessary distractions.",
                "The overall setup (ventilation, lighting, or online interface) was comfortable.",
                "The venue/platform was highly accessible and easy to navigate."
            ],
            ratings: [0, 0, 0, 0, 0]
        }
    ]
};

window.VUE_APP_METHODS = {
    getCategoryRatedCount(catIdx) {
        if (!this.evaluationData || !this.evaluationData[catIdx]) return 0;
        return this.evaluationData[catIdx].ratings.filter(r => r > 0).length;
    },
    isCategoryComplete(catIdx) {
        if (catIdx >= 5) return this.feedbackComment && this.feedbackComment.trim().length > 0;
        return this.getCategoryRatedCount(catIdx) === 5;
    },
    setRating(sIdx, qIdx, val) {
        this.evaluationData[sIdx].ratings[qIdx] = val;
        
        // Animation trigger for emoji
        const elId = `emoji-${sIdx}-${qIdx}`;
        this.$nextTick(() => {
            const el = document.getElementById(elId);
            if (el) {
                el.classList.add('animate-bounce', 'scale-125');
                setTimeout(() => el.classList.remove('animate-bounce', 'scale-125'), 400);
            }
        });
    },
    nextStep() {
        if (this.currentStep < 5) {
            const unratedCount = 5 - this.getCategoryRatedCount(this.currentStep);
            if (unratedCount > 0) {
                const catName = this.evaluationData[this.currentStep] ? this.evaluationData[this.currentStep].category : `Category ${this.currentStep + 1}`;
                alert(`Please provide a rating for all 5 statements in ${catName} before proceeding.`);
                return;
            }
            this.currentStep++;
            if (this.currentStep > this.maxVisitedStep) {
                this.maxVisitedStep = this.currentStep;
            }
            this.scrollToFormTop();
        }
    },
    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.scrollToFormTop();
        }
    },
    goToStep(idx) {
        if (idx <= this.maxVisitedStep) {
            this.currentStep = idx;
            this.scrollToFormTop();
        }
    },
    scrollToFormTop() {
        this.$nextTick(() => {
            const wrapper = document.getElementById('evaluationCardWrapper');
            if (wrapper) {
                const topPos = wrapper.getBoundingClientRect().top + window.pageYOffset - 80;
                window.scrollTo({ top: topPos, behavior: 'smooth' });
            }
        });
    },
    async submitEvaluation() {
        if (!this.currentId || this.currentId === 'null' || this.currentId === 'undefined') {
            alert("Event identification missing. Please launch the evaluation from the Evaluation page.");
            window.location.href = "/student/evaluation";
            return;
        }

        // Check that all 25 questions across categories 1 to 5 are rated
        for (let i = 0; i < 5; i++) {
            if (this.getCategoryRatedCount(i) < 5) {
                const catName = this.evaluationData[i] ? this.evaluationData[i].category : `Category ${i + 1}`;
                alert(`Please complete the ratings for Category ${i + 1} (${catName}) before submitting.`);
                this.currentStep = i;
                this.scrollToFormTop();
                return;
            }
        }

        // Check that open-ended feedback is provided
        if (!this.feedbackComment || this.feedbackComment.trim() === '') {
            alert("Please share your feedback, comments, or suggestions before submitting.");
            return;
        }

        this.isSubmitting = true;

        let totalScore = 0;
        let categoryScores = [];

        this.evaluationData.forEach(section => {
            let sectionSum = 0;
            section.ratings.forEach(r => {
                sectionSum += r;
                totalScore += r;
            });
            categoryScores.push({
                category: section.category,
                total: sectionSum,
                average: (sectionSum / 5).toFixed(1)
            });
        });

        const finalAvg = (totalScore / 25);
        this.finalRating = finalAvg;

        const formData = new FormData();
        formData.append('event_id', this.currentId);
        formData.append('event_title', this.currentTitle);
        formData.append('rating', finalAvg.toFixed(1));
        formData.append('comments', this.feedbackComment.trim());
        formData.append('feedback', this.feedbackComment.trim());
        formData.append('detailed_scores', JSON.stringify(categoryScores));
        formData.append('total_raw_score', totalScore);

        try {
            const csrfMatch = document.cookie.match(/csrftoken=([^;]+)/);
            const csrf = csrfMatch ? csrfMatch[1] : '';
            
            const response = await fetch("/student/submit-evaluation", {
                method: 'POST',
                headers: { 'X-CSRFToken': csrf },
                body: formData
            });
            const data = await response.json();

            if (data.status === 'success') {
                this.showSuccessModal = true;
            } else {
                alert("Error: " + data.message);
                this.isSubmitting = false;
            }
        } catch (error) {
            console.error(error);
            alert("Institutional Sync Error: Connection failed. Make sure you are logged in.");
            this.isSubmitting = false;
        }
    },
    redirectToLedger() {
        window.location.href = "/student/evaluation";
    }
};
