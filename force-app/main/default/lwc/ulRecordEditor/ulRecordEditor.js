import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class UlRecordEditor extends LightningElement {

    @api objectApiName;
    @api recordId;
    @api fields = [];
    @api mode = 'create'; // create | edit | view

    get cardTitle() {
        if (this.mode === 'edit') {
            return 'Edit Record';
        }
        if (this.mode === 'view') {
            return 'View Record';
        }
        return 'New Record';
    }

    get showButtons() {
        return this.mode !== 'view';
    }

    handleSubmit(event) {
        // additional validation if required
    }

    handleSuccess(event) {
        const toast = new ShowToastEvent({
            title: 'Success',
            message: 'Record saved successfully',
            variant: 'success'
        });
        this.dispatchEvent(toast);

        this.dispatchEvent(
            new CustomEvent('success', {
                detail: event.detail.id
            })
        );
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }
}