import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import createAccountContactWithFile from '@salesforce/apex/AccountContactCreatorController.createAccountContactWithFile';

export default class AccountContactCreator extends NavigationMixin(LightningElement) {
    @track accountName = '';
    @track accountWebsite = '';
    @track contactFirstName = '';
    @track contactLastName = '';
    @track contactEmail = '';
    @track contactPhone = '';
    @track fileName = '';
    @track fileData = '';
    @track fileContentType = '';
    @track isLoading = false;

    handleInputChange(event) {
        const fieldName = event.target.name;
        const value = event.target.value;

        switch(fieldName) {
            case 'accountName':
                this.accountName = value;
                break;
            case 'accountWebsite':
                this.accountWebsite = value;
                break;
            case 'contactFirstName':
                this.contactFirstName = value;
                break;
            case 'contactLastName':
                this.contactLastName = value;
                break;
            case 'contactEmail':
                this.contactEmail = value;
                break;
            case 'contactPhone':
                this.contactPhone = value;
                break;
        }
    }

    handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            this.fileName = file.name;
            this.fileContentType = file.type;

            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                this.fileData = base64;
            };
            reader.readAsDataURL(file);
        } else {
            this.fileName = '';
            this.fileData = '';
            this.fileContentType = '';
        }
    }

    validateForm() {
        const allValid = [
            ...this.template.querySelectorAll('lightning-input')
        ].reduce((validSoFar, inputCmp) => {
            inputCmp.reportValidity();
            return validSoFar && inputCmp.checkValidity();
        }, true);

        if (!allValid) {
            this.showToast('Error', 'Please fill all required fields', 'error');
            return false;
        }

        return true;
    }

    handleSave() {
        if (!this.validateForm()) {
            return;
        }

        this.isLoading = true;
        this.saveRecord(false);
    }

    handleSaveAndNew() {
        if (!this.validateForm()) {
            return;
        }

        this.isLoading = true;
        this.saveRecord(true);
    }

    saveRecord(saveAndNew) {
        createAccountContactWithFile({
            accountName: this.accountName,
            accountWebsite: this.accountWebsite,
            contactFirstName: this.contactFirstName,
            contactLastName: this.contactLastName,
            contactEmail: this.contactEmail,
            contactPhone: this.contactPhone,
            fileName: this.fileName,
            fileData: this.fileData,
            fileContentType: this.fileContentType
        })
        .then(result => {
            this.isLoading = false;
            this.showToast('Success', 'Account, Contact and File created successfully', 'success');

            if (saveAndNew) {
                this.resetForm();
            } else {
                this.navigateToContact(result);
            }
        })
        .catch(error => {
            this.isLoading = false;
            this.showToast(
                'Error',
                error.body ? error.body.message : 'An error occurred',
                'error'
            );
        });
    }

    handleCancel() {
        this.resetForm();
    }

    resetForm() {
        this.accountName = '';
        this.accountWebsite = '';
        this.contactFirstName = '';
        this.contactLastName = '';
        this.contactEmail = '';
        this.contactPhone = '';
        this.fileName = '';
        this.fileData = '';
        this.fileContentType = '';

        // Reset lightning-input components
        const inputs = this.template.querySelectorAll('lightning-input');
        if (inputs) {
            inputs.forEach(input => {
                input.value = '';
            });
        }
    }

    navigateToContact(contactId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: contactId,
                objectApiName: 'Contact',
                actionName: 'view'
            }
        });
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }
}