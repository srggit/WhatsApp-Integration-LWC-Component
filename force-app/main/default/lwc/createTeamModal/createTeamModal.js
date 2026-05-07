import { LightningElement, track, wire, api } from 'lwc';
import getTeamUsers from '@salesforce/apex/CreateTeamController.getTeamUsers';
import getInitialTeamData from '@salesforce/apex/CreateTeamController.getInitialTeamData';
import saveTeamData from '@salesforce/apex/CreateTeamController.saveTeamData';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';


export default class CreateTeamModal extends LightningElement {
    @track isModalOpen = true;
    @track isStepOne = true;

    @track users = [];
    @api fiscalYear; // Accept from parent

    // Step 1 Fields
    @track teamName = '';
    @track region = '';
    @track availableBudget = 0;
    @track budgetAllotted = '';
    @track NoOfMembers = '';
    //@track fiscalYear = '';
    @track startDate = '';
    @track endDate = '';
    @track TeamHead = '';

    // Step 2 Fields
    @track departmentalBudgetName = '';
    @track budgetObjective = '';
    @track expectedOutcome = '';
    @track activities = [];

   

connectedCallback() {
    getInitialTeamData({ fiscalYear: this.fiscalYear })
        .then(data => {
            this.availableBudget = data.availableBudget;
            this.startDate = data.startDate;
            this.endDate = data.endDate;
        })
        .catch(error => {
            this.showToast('Error loading initial data', error.body.message, 'error');
        });
}

    @wire(getTeamUsers)
    wiredUsers({ data, error }) {
        if (data) {
            this.users = data.map(user => ({
                label: user.Name,
                value: user.Id
            }));
        }
    }

    handleAssignToChange(event) {
        const key = event.target.dataset.key;
        const selectedUserId = event.detail.value;
        const index = this.activities.findIndex(a => a.key == key);
        if (index !== -1) {
            this.activities[index].assignTo = selectedUserId;
        }
    }

    
    handleChange(event) {
        const field = event.target.dataset.id;
        this[field] = event.target.value;
    }



    handleActivityChange(event) {
        const key = event.target.dataset.key;
        const field = event.target.dataset.id;
        this.activities = this.activities.map(act => {
            if (act.key === key) {
                return { ...act, [field]: event.target.value };
            }
            return act;
        });
    }

    addActivity() {
        const uniqueKey = Date.now().toString() + Math.random().toString(36).substring(2);
        // this.activities = [...this.activities, {
        //     key: uniqueKey,
        //     name: '',
        //     outcome: '',
        //     budget: '',
        //     dates: '',
        //     assignTo: ''
        // }];
        this.activities = [...this.activities, {
            key: uniqueKey,
            name: '',
            outcome: '',
            budget: '',
            revenue: '', // 👈 Add this
            dates: '',
            assignTo: ''
        }];

    }

    removeActivity(event) {
        const keyToRemove = event.currentTarget.dataset.key;
        this.activities = this.activities.filter(activity => activity.key !== keyToRemove);
    }

    
    goToStepTwo() {
        let isValid = true;
        let missingFields = [];

        if (!this.teamName || this.teamName.trim() === '') {
            missingFields.push('Team Name');
            isValid = false;
        }

        if (!this.region || this.region.trim() === '') {
            missingFields.push('Region');
            isValid = false;
        }

        if (!this.budgetAllotted || isNaN(this.budgetAllotted) || this.budgetAllotted <= 0) {
            missingFields.push('Budget Allocated');
            isValid = false;
        }

        if (!this.TeamHead || this.TeamHead.trim() === '') {
            missingFields.push('Team Head');
            isValid = false;
        }

        if (!this.NoOfMembers || isNaN(this.NoOfMembers) || this.NoOfMembers <= 0) {
            missingFields.push('No. of Members');
            isValid = false;
        }
         if (parseFloat(this.budgetAllotted) > parseFloat(this.availableBudget)) {
            this.showToast('Error', 'Allocated budget exceeds available budget.', 'error');
            return;
        }

        if (!isValid) {
            this.showToast('Validation Error', `Please fill required fields: ${missingFields.join(', ')}`, 'warning');
            return;
        }

        this.isStepOne = false;
    }


    goToStepOne() {
        this.isStepOne = true;
    }
    
    handleTeamHeadChange(event) {
        this.TeamHead = event.detail.value;
    }
    stripHtml(html) {
        return html ? html.replace(/<[^>]*>?/gm, '').trim() : '';
    }

  
    handleSave() {
    let isValid = true;
    let missingFields = [];

    if (!this.departmentalBudgetName || this.departmentalBudgetName.trim() === '') {
        missingFields.push('Departmental Budget Name');
        isValid = false;
    }
    

   
    //const stripHtml = (html) => html.replace(/<[^>]*>/g, '').trim();
    const stripHtml = (html) => html.replace(/<(?!img)([^>]+)>/g, '').trim();


    //Rich Text Checks
    if (!stripHtml(this.budgetObjective)) {
        missingFields.push('Budget Objective');
        isValid = false;
    }

    if (!stripHtml(this.expectedOutcome)) {
        missingFields.push('Expected Outcome');
        isValid = false;
    }


    this.activities.forEach((activity, index) => {
        if (!activity.name || activity.name.trim() === '') {
            missingFields.push(`Activity ${index + 1}: Name`);
            isValid = false;
        }
        
        if (!stripHtml(activity.outcome)) {
            missingFields.push(`Activity ${index + 1}: Outcome`);
            isValid = false;
        }
         
        if (activity.budget == null || isNaN(activity.budget) || parseFloat(activity.budget) <= 0){
            missingFields.push(`Activity ${index + 1}: Budget`);
            isValid = false;
        }
        if (activity.revenue == null || isNaN(activity.revenue) || parseFloat(activity.revenue) <= 0) {
            missingFields.push(`Activity ${index + 1}: Expected Revenue`);
            isValid = false;
        }

        
        if (!activity.dates) {
            missingFields.push(`Activity ${index + 1}: Tentative Date`);
            isValid = false;
        } else {
            const start = new Date(this.startDate);
            const end = new Date(this.endDate);
            const activityDate = new Date(activity.dates);

            if (activityDate < start || activityDate > end) {
                missingFields.push(`Activity ${index + 1}: Tentative Date must be between ${this.startDate} and ${this.endDate}`);
                isValid = false;
            }
        }

        if (!activity.assignTo) {
            missingFields.push(`Activity ${index + 1}: Assign To`);
            isValid = false;
        }
    });
    
    //Proposal Budget Total Check (AFTER the above loop)
    const totalProposalBudget = this.activities.reduce((sum, act) => {
        return sum + (parseFloat(act.budget) || 0);
    }, 0);

    if (totalProposalBudget > parseFloat(this.budgetAllotted)) {
        this.showToast(
            'Error',
            `Total proposal budget (₹${totalProposalBudget}) exceeds allocated budget (₹${this.budgetAllotted}).`,
            'error'
        );
        return;
    }

    if (!isValid) {
        this.showToast('Validation Error', `Please complete the following fields:\n${missingFields.join(', ')}`, 'error');
        return;
    }

    const payload = {
        teamName: this.teamName,
        region: this.region,
        TeamHead: this.TeamHead,
        budgetAllotted: parseFloat(this.budgetAllotted),
        NoOfMembers: Number(this.NoOfMembers),
        departmentalBudgetName: this.departmentalBudgetName,
        budgetObjective: this.budgetObjective,
        expectedOutcome: this.expectedOutcome,
        fiscalYear: this.fiscalYear, //  Pass fiscalYear
        activities: this.activities
    };

    saveTeamData({ payload: JSON.stringify(payload) })
        .then(() => {
           // this.showToast('Success', 'Team created successfully!', 'success');
            this.showToast('Success', 'Team created and budget submitted for approval!', 'success');
            this.dispatchEvent(new CustomEvent('teamsaved', { bubbles: true, composed: true }));
            this.closeModal();
        })
        .catch(error => {
            this.showToast('Error', error.body.message, 'error');
            console.log(error);
        });
}



    closeModal() {
        this.dispatchEvent(new CustomEvent('close'));
        this.isModalOpen = false;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}