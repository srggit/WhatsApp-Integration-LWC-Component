import { LightningElement, track } from 'lwc';
const COURSE_DETAILS = {
    ENG301: { title: 'British Literature I', faculty: 'Dr. Priya Sharma' },
    ENG302: { title: 'American Literature', faculty: 'Prof. Anjali Menon' },
    ENG303: { title: 'Indian Writing in English', faculty: 'Dr. Kavitha Nair' },
    ENG304: { title: 'Literary Theory', faculty: 'Dr. Rajesh Kumar' },
    ENG305: { title: 'Academic Writing', faculty: 'Prof. Meera Krishnan' }
};

export default class PsgrPortalFeedbackAndHelp extends LightningElement {
    @track activeTab = 'courseFeedback';
    fullStars = Array.from({ length: 5 }, (_, i) => i + 1);
    fourStars = Array.from({ length: 4 }, (_, i) => i + 1);

    @track showFeedbackModal = false;

    handleSubmit() {
        this.showFeedbackModal = true;
    }
    closeFeedbackModal() {
        this.showFeedbackModal = false;
    }
    @track selectedCourseCode = '';
    @track selectedCourseTitle = '';
    @track selectedCourseFaculty = '';
    @track showCourseDetails = false;
    handleCourseSelect(event) {
        const code = event.target.value;
        this.selectedCourseCode = code;
        if (code && COURSE_DETAILS[code]) {
            this.selectedCourseTitle = COURSE_DETAILS[code].title;
            this.selectedCourseFaculty = COURSE_DETAILS[code].faculty;
            this.showCourseDetails = true;
        } else {
            this.showCourseDetails = false;
            this.selectedCourseTitle = '';
            this.selectedCourseFaculty = '';
        }
    }
 @track selectedRating = 0;
  handleStarClick(event) {
        this.selectedRating = parseInt(event.currentTarget.dataset.value, 10);
    }
    isStarFilled(star) {
    return star <= this.selectedRating;
}
get stars() {
    return Array.from({ length: 5 }, (_, i) => ({
        value: i + 1,
        filled: i + 1 <= this.selectedRating
    }));
}
handleFeedbackSubmit() {
    // Check if both course and rating are selected
    if (!this.selectedCourseCode || !this.selectedRating) {
        this.showBottomToast('Please select a course and provide a rating', 'error');
        return;
    }
    this.showBottomToast('Feedback submitted successfully! Thank you for your input.', 'success');
   setTimeout(() => { this.showFeedbackModal = false;}, 500); 
   this.selectedCourseCode = '';
    this.selectedCourseTitle = '';
    this.selectedCourseFaculty = '';
    this.showCourseDetails = false;
    this.selectedRating = 0;
}
showBottomToast(message, type = 'success') {
    this.toastMessage = message;
    this.showToast = true;
    this.toastClass = type === 'error' ? 'psgr-toast psgr-toast-error' : 'psgr-toast';

    // SVGs that match your screenshot icons:
    const successIconSVG = `<svg width="19" height="19" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#000"/><path d="M6.6 10.7l2.2 2.3 4-4.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
    const errorIconSVG = `<svg width="19" height="19" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#000"/><rect x="9" y="5" width="2" height="6" fill="#fff"/><circle cx="10" cy="13" r="1.2" fill="#fff"/></svg>`;

    // Insert icon
    window.requestAnimationFrame(() => {
        const iconSpan = this.template.querySelector('.psgr-toast-icon');
        if(iconSpan) iconSpan.innerHTML = type === 'error' ? errorIconSVG : successIconSVG;
    });

    // Auto-hide
    setTimeout(() => { this.showToast = false; }, 3500);
}



    
    @track faqSearch = '';
    @track faqCategory = 'all';
    @track expandedFaq = '';

    @track showSupportModal = false;

    // Modal form values
    @track modalIssueCategory = 'Academic Issues';
    @track modalPriorityLevel = 'Low - General inquiry';
    @track modalSubject = '';
    @track modalRelatedCourse = 'Not course related';
    @track modalDetailedDescription = '';
    @track modalContactMethod = 'Email Response';
    @track modalHasFiles = false;
    @track modalIsUrgent = false;

    // For original question textarea
    @track issueDescription = '';

    openSupportModal() {
        this.showSupportModal = true;
        // Optionally fill description from the lower textarea if used
        this.modalDetailedDescription = this.issueDescription;
        this.modalSubject ='';
           }
    closeSupportModal() {
        this.showSupportModal = false;
    }

    // Handlers for each modal input
    handleModalIssueCategory(event) { this.modalIssueCategory = event.target.value; }
    handleModalPriorityLevel(event) { this.modalPriorityLevel = event.target.value; }
    handleModalSubject(event) { this.modalSubject = event.target.value; }
    handleModalRelatedCourse(event) { this.modalRelatedCourse = event.target.value; }
    handleModalDetailedDescription(event) { this.modalDetailedDescription = event.target.value; }
    handleModalContactMethod(event) { this.modalContactMethod = event.target.value; }
    handleModalHasFiles(event) { this.modalHasFiles = event.target.checked; }
    handleModalIsUrgent(event) { this.modalIsUrgent = event.target.checked; }
    handleIssueDescription(event) { this.issueDescription = event.target.value; }

   submitSupportTicket() {
    // Validate required fields
        if (!this.modalSubject || !this.modalDetailedDescription) {
            this.showBottomToast('Please fill in all required fields', 'error');
            return;
        }
        // Determine message by priority
        let msg = '';
        if (this.modalPriorityLevel.startsWith('High')) {
            msg = "High Priority support ticket submitted successfully! You'll receive a response within 4 hours.";
        } else if (this.modalPriorityLevel.startsWith('Medium')) {
            msg = "Medium Priority support ticket submitted successfully! You'll receive a response within 24 hours.";
        } else {
            msg = "Low Priority support ticket submitted successfully! You'll receive a response within 48 hours.";
        }
        this.showBottomToast(msg, 'success');
        this.closeSupportModal();
        // Optionally you can reset modal fields here
    }


    // ADD at the start of your class
    @track showToast = false;
    @track toastMessage = '';
    @track toastClass = 'psgr-toast';
    @track toastIcon = '';

    showBottomToast(message, type = 'success') {
        this.toastMessage = message;
        this.showToast = true;
        this.toastClass = type === 'error' ? 'psgr-toast psgr-toast-error' : 'psgr-toast';
        
        // SVG strings for black & white icons
        const successIconSVG = `<svg width="19" height="19" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="9" r="8" fill="#000000"/>
            <path d="M7 11l3 3 5-7" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        const errorIconSVG = `<svg width="19" height="19" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="9" r="8" fill="#000000"/>
            <path d="M9 5v4" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="9" cy="13" r="1" fill="#FFFFFF"/>
        </svg>`;

        // Wait for next tick to insert SVG HTML
        window.requestAnimationFrame(() => {
            const iconSpan = this.template.querySelector('.psgr-toast-icon');
            if(iconSpan) {
                iconSpan.innerHTML = type === 'error' ? errorIconSVG : successIconSVG;
            }
        });

        // Hide toast after 3.5 seconds
        setTimeout(() => { this.showToast = false; }, 3500);
    }


    faqs = [
        { category: 'academic', question: 'How do I download my attendance report?', answer: "Go to the Attendance section, click on 'Download Report' button at the top right. You can also filter by course before downloading." },
        { category: 'academic', question: 'How do I submit an assignment?', answer: "Navigate to Assignments & Quizzes section, find your assignment, and click 'Submit'. Upload your file (PDF/DOC format) and add any remarks before submitting." },
        { category: 'academic', question: 'Where can I check my CO/PO attainment?', answer: "Visit the CO/PO Mapping section to view your Course Outcome to Program Outcome mapping progress and detailed reports." },
        { category: 'academic', question: 'How do I request attendance correction?', answer: "In the Attendance section, click 'Request Correction', fill in the date, course, current status, requested status, and provide a reason for the correction." },
        { category: 'technical', question: "I'm having trouble logging into the portal", answer: "Ensure you're using your correct student ID and password. If you've forgotten your password, use the 'Forgot Password' link or contact the IT helpdesk." },
        { category: 'technical', question: 'Files are not downloading properly', answer: "Check your internet connection and browser settings. Clear your browser cache and try again. If the issue persists, try using a different browser." },
        { category: 'technical', question: 'The portal is running slowly', answer: "This might be due to high server load. Try refreshing the page or accessing during off-peak hours. Clear your browser cache for better performance." },
        { category: 'technical', question: "I can't see my latest grades", answer: "Grades are updated by faculty after evaluation. If it's been more than a week since submission, contact your course faculty or the academic office." },
        { category: 'general', question: 'How do I contact my course faculty?', answer: "Faculty contact information is available in the 'My Courses' section. You can also use the 'Ask Faculty Question' feature in each course detail page." },
        { category: 'general', question: 'Where can I find the academic calendar?', answer: "The academic calendar is available in the Timetable & Calendar section, showing important dates, exam schedules, and holidays." },
        { category: 'general', question: 'How do I update my personal information?', answer: "Personal information updates need to be requested through the academic office. Contact the registrar's office with required documents." },
        { category: 'general', question: 'Can I access the portal from my mobile phone?', answer: "Yes, the portal is mobile-responsive and can be accessed from any device with an internet connection and web browser." }
    ];

    // Tab controls (unchanged)
    get courseFeedbackTabClass() {
        return this.activeTab === 'courseFeedback' ? 'tab active' : 'tab';
    }
    get helpFaqTabClass() {
        return this.activeTab === 'helpFaq' ? 'tab active' : 'tab';
    }
    get contactSupportTabClass() {
        return this.activeTab === 'contactSupport' ? 'tab active' : 'tab';
    }
    get showCourseFeedbackSection() {
        return this.activeTab === 'courseFeedback';
    }
    get showHelpFaqSection() {
        return this.activeTab === 'helpFaq';
    }
    get showContactSupportSection() {
        return this.activeTab === 'contactSupport';
    }
    showCourseFeedback() { this.activeTab = 'courseFeedback'; }
    showHelpFaq() { this.activeTab = 'helpFaq'; }
    showContactSupport() { this.activeTab = 'contactSupport'; }

    handleFaqSearch(event) {
        this.faqSearch = event.target.value.toLowerCase();
    }
    handleFaqCategoryChange(event) {
        this.faqCategory = event.target.value;
    }
    handleFaqClick(event) {
        const question = event.currentTarget.getAttribute('data-question');
        this.expandedFaq = (this.expandedFaq === question) ? '' : question;
    }

    // Filter and attach isExpanded property to each FAQ for true LWC conditional
    get filteredAcademicFaqs() {
        return this.faqs
            .filter(faq => faq.category === 'academic' && faq.question.toLowerCase().includes(this.faqSearch))
            .map(faq => ({ ...faq, isExpanded: this.expandedFaq === faq.question }));
    }
    get filteredTechnicalFaqs() {
        return this.faqs
            .filter(faq => faq.category === 'technical' && faq.question.toLowerCase().includes(this.faqSearch))
            .map(faq => ({ ...faq, isExpanded: this.expandedFaq === faq.question }));
    }
    get filteredGeneralFaqs() {
        return this.faqs
            .filter(faq => faq.category === 'general' && faq.question.toLowerCase().includes(this.faqSearch))
            .map(faq => ({ ...faq, isExpanded: this.expandedFaq === faq.question }));
    }

    get showAcademicFaqs() {
        return this.faqCategory === 'all' || this.faqCategory === 'academic';
    }
    get showTechnicalFaqs() {
        return this.faqCategory === 'all' || this.faqCategory === 'technical';
    }
    get showGeneralFaqs() {
        return this.faqCategory === 'all' || this.faqCategory === 'general';
    }
    get noFaqsFound() {
        return (
            (!this.showAcademicFaqs || this.filteredAcademicFaqs.length === 0) &&
            (!this.showTechnicalFaqs || this.filteredTechnicalFaqs.length === 0) &&
            (!this.showGeneralFaqs || this.filteredGeneralFaqs.length === 0)
        );
    }
}