import { LightningElement, api } from 'lwc';
import submitForApproval from '@salesforce/apex/ApprovalController.submitForApproval';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ApprovalSubmit extends LightningElement {
    @api recordId;

    handleSubmit() {
        submitForApproval({ recordId: this.recordId })
            .then(result => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success',
                    message: result,
                    variant: 'success'
                }));
            })
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: error.body.message,
                    variant: 'error'
                }));
            });
    }
}