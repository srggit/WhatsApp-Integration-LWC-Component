import { LightningElement, track } from 'lwc';
import searchByEmail from '@salesforce/apex/LeadContactSearchController.searchByEmail';
import createLead from '@salesforce/apex/LeadContactSearchController.createLead';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';

export default class LeadContactSearch extends NavigationMixin(LightningElement) {
    @track email = '';
    @track isLoading = false;
    @track recordList = [];
    @track showCreatePrompt = false;
    @track showModal = false;
    @track leadFormFields = {};

    columns = [
        { label: 'Type', fieldName: 'recordType' },
        { label: 'Name', fieldName: 'name' },
        { label: 'Email', fieldName: 'email' },
        { label: 'Phone', fieldName: 'phone' },
        { label: 'Account', fieldName: 'accountName' },
        { label: 'Lead Status', fieldName: 'leadStatus' }
    ];

    leadStatusOptions = [
        { label: 'Open - Not Contacted', value: 'Open - Not Contacted' },
        { label: 'Working - Contacted', value: 'Working - Contacted' },
        { label: 'Closed - Converted', value: 'Closed - Converted' },
        { label: 'Closed - Not Converted', value: 'Closed - Not Converted' }
    ];

    debounceTimeout;

    handleEmailChange(event) {
        this.email = event.target.value;
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            if (this.email) {
                this.searchEmail();
            } else {
                this.recordList = [];
                this.showCreatePrompt = false;
            }
        }, 500);
    }

    searchEmail() {
        this.isLoading = true;
        searchByEmail({ email: this.email })
            .then(results => {
                this.recordList = results;
                this.showCreatePrompt = results.length === 0;
            })
            .catch(error => {
                this.recordList = [];
                this.showCreatePrompt = false;
                this.showToast('Error', error.body.message, 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    openCreateModal() {
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
    }

    handleFieldChange(event) {
        const field = event.target.name;
        this.leadFormFields[field] = event.target.value;
    }

    handleCreateLead() {
        const leadData = {
            FirstName: this.leadFormFields.FirstName,
            LastName: this.leadFormFields.LastName,
            Phone: this.leadFormFields.Phone,
            Company: this.leadFormFields.Company,
            Status: this.leadFormFields.Status,
            Email: this.email
        };

        createLead({ newLead: leadData })
            .then(id => {
                this.showToast('Success', 'Lead created successfully', 'success');
                this.showModal = false;
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: id,
                        objectApiName: 'Lead',
                        actionName: 'view'
                    }
                });
            })
            .catch(error => {
                this.showToast('Error', error.body.message, 'error');
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}