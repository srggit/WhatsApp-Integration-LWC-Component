// import { LightningElement, api, wire } from 'lwc';
// import getTeamDetails from '@salesforce/apex/TeamDetailsController.getTeamDetails';
// import getUpcomingSchedules from '@salesforce/apex/TeamDetailsController.getUpcomingSchedules';

// export default class TeamDetailsPage extends LightningElement {
//     @api teamId;
//     @api fiscalYear;

//     teamData;
//     upcomingSchedule = [];

//     columns = [
//     {
//         label: 'Activity Name',
//         fieldName: 'name',
//         type: 'text',
//         cellAttributes: { class: 'slds-p-around_medium' }
//     },

//     {
//         label: 'Asked Budget',
//         fieldName: 'budget',
//         type: 'currency',
//         typeAttributes: { currencyCode: 'INR' },
//         cellAttributes: { class: 'slds-p-around_medium' }
//     },
//     {
//         label: 'Tentative Date',
//         fieldName: 'formattedDate',
//         type: 'text',
//         cellAttributes: { class: 'slds-p-around_medium' }
//     },
//     {
//         label: 'Team Member',
//         fieldName: 'teamMember',
//         type: 'text',
//         cellAttributes: { class: 'slds-p-around_medium' }
//     },
//     {
//         label: 'Expected Revenue',
//         fieldName: 'expectedRevenue',
//         type: 'currency',
//         typeAttributes: { currencyCode: 'INR' },
//         cellAttributes: { class: 'slds-p-around_medium' }
//     },
//     {
//         label: 'Approved Budget',
//         fieldName: 'approvedBudget',
//         type: 'currency',
//         typeAttributes: { currencyCode: 'INR' },
//         cellAttributes: { class: 'slds-p-around_medium' }
//     },
//     {
//         label: 'Actual Revenue',
//         fieldName: 'actualRevenue',
//         type: 'currency',
//         typeAttributes: { currencyCode: 'INR' },
//         cellAttributes: { class: 'slds-p-around_medium' }
//     }
// ];


//     @wire(getTeamDetails, { teamId: '$teamId', fiscalYear: '$fiscalYear' })
//     wiredDetails({ data, error }) {
//         if (data) {
//             this.teamData = data;
//         } else if (error) {
//             console.error('Error loading team details:', error);
//         }
//     }

//     @wire(getUpcomingSchedules, { teamId: '$teamId', fiscalYear: '$fiscalYear' })
// wiredSchedule({ data, error }) {
//     if (data) {
//         this.upcomingSchedule = data;
//     } else if (error) {
//         console.error('Error loading schedule:', error);
//     }
// }

//     get hasBusinessGoals() {
//         return (this.teamData?.budgetObjective && this.teamData.budgetObjective.trim() !== '') ||
//                (this.teamData?.expectedOutcome && this.teamData.expectedOutcome.trim() !== '');
//     }

//     get hasYearlyActivities() {
//         return Array.isArray(this.teamData?.activities) && this.teamData.activities.length > 0;
//     }

//     handleBackClick() {
//         this.dispatchEvent(new CustomEvent('back'));
//     }

// }


import { LightningElement, api, wire, track } from 'lwc';
import getTeamDetails from '@salesforce/apex/TeamDetailsController.getTeamDetails';
import getUpcomingSchedules from '@salesforce/apex/TeamDetailsController.getUpcomingSchedules';
import updateProposals from '@salesforce/apex/TeamDetailsController.updateProposals';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import { refreshApex } from '@salesforce/apex';

export default class TeamDetailsPage extends LightningElement {
    @api teamId;
    @api fiscalYear;

    @track teamData;
    wiredTeamResult;
    @track upcomingSchedule = [];

    //pagination
    currentPage = 1;
    pageSize = 5;
    totalPages = 0;
    pagedActivities = [];//used for datatable
    disablePrevious = true;
    disableNext = false;


    @wire(getTeamDetails, { teamId: '$teamId', fiscalYear: '$fiscalYear' })
    wiredDetails(result) {
        this.wiredTeamResult = result;
        const { data, error } = result;
        if (data) {
            this.teamData = data;
        } else if (error) {
            console.error('Error loading team details:', error);
        }

        if (this.teamData?.activities?.length > 0) {
            this.totalPages = Math.ceil(this.teamData.activities.length / this.pageSize);
            this.updatePagedActivities();
        }

    }

    updatePagedActivities() {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        this.pagedActivities = this.teamData.activities.slice(start, end);

        this.disablePrevious = this.currentPage === 1;
        this.disableNext = this.currentPage === this.totalPages;
    }


    handleNext() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagedActivities();
        }
    }

    handlePrevious() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePagedActivities();
        }
    }


    get isEditable() {
        return this.teamData?.departmentalBudgetStatus === 'Approved';
    }

    get columns() {
        const isEditable = this.isEditable;
        return [
            {
                label: 'Activity Name',
                fieldName: 'name',
                type: 'button',
                typeAttributes: {
                    label: { fieldName: 'name' },
                    variant: 'base',
                    name: 'showExpectedOutcome',
                    class: 'custom-link'
                },
                cellAttributes: { class: 'slds-text-link' }
            },
            {
                label: 'Asked Budget',
                fieldName: 'budget',
                type: 'currency',
                typeAttributes: { currencyCode: 'INR' },
                cellAttributes: { class: 'slds-p-around_medium' }
            },
            {
                label: 'Tentative Date',
                fieldName: 'formattedDate',
                type: 'text',
                cellAttributes: { class: 'slds-p-around_medium' }
            },
            {
                label: 'Team Member',
                fieldName: 'teamMember',
                type: 'text',
                cellAttributes: { class: 'slds-p-around_medium' }
            },
            {
                label: 'Expected Revenue',
                fieldName: 'expectedRevenue',
                type: 'currency',
                typeAttributes: { currencyCode: 'INR' },
                cellAttributes: { class: 'slds-p-around_medium' }
            },
            {
                label: 'Approved Budget',
                fieldName: 'approvedBudget',
                type: 'currency',
                typeAttributes: { currencyCode: 'INR' },
                editable: isEditable,
                cellAttributes: { class: 'slds-p-around_medium' }
            },
            {
                label: 'Actual Revenue',
                fieldName: 'actualRevenue',
                type: 'currency',
                typeAttributes: { currencyCode: 'INR' },
                editable: isEditable,
                cellAttributes: { class: 'slds-p-around_medium' }
            }
        ];
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        if (actionName === 'showExpectedOutcome') {
            this.modalExpectedOutcome = row.expectedOutcome;
            this.isModalOpen = true;
        }
    }
    @track isModalOpen = false;
    @track modalExpectedOutcome;

    closeModal() {
        this.isModalOpen = false;
    }

    @wire(getUpcomingSchedules, { teamId: '$teamId', fiscalYear: '$fiscalYear' })
    wiredSchedule({ data, error }) {
        if (data) {
            this.upcomingSchedule = data;
        } else if (error) {
            console.error('Error loading schedule:', error);
        }
    }

    get hasBusinessGoals() {
        return (this.teamData?.budgetObjective && this.teamData.budgetObjective.trim() !== '') ||
            (this.teamData?.expectedOutcome && this.teamData.expectedOutcome.trim() !== '');
    }

    get hasYearlyActivities() {
        return Array.isArray(this.teamData?.activities) && this.teamData.activities.length > 0;
    }

    handleBackClick() {
        this.dispatchEvent(new CustomEvent('back'));
    }


    async handleSave(event) {
        if (this.teamData?.departmentalBudgetStatus === 'Rejected') {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Editing Not Allowed',
                    message: 'This budget has been rejected. You cannot edit activities.',
                    variant: 'error'
                })
            );
            return;
        }

        const updatedFields = event.detail.draftValues;

        try {
            await updateProposals({ updatedProposals: updatedFields });

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Records updated successfully.',
                    variant: 'success'
                })
            );

            this.template.querySelector('lightning-datatable').draftValues = [];
            await refreshApex(this.wiredTeamResult);
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error updating records',
                    message: error.body?.message || 'Unknown error',
                    variant: 'error'
                })
            );
        }
    }

    formatIndianCurrency(value) {
        if (value === null || value === undefined || isNaN(value)) return '₹0';

        const absValue = Math.abs(value);
        let formatted = '';

        if (absValue >= 10000000) {
            formatted = (value / 10000000).toFixed(2) + ' Cr';
        } else if (absValue >= 100000) {
            formatted = (value / 100000).toFixed(2) + ' L';
        } else if (absValue >= 1000) {
            formatted = (value / 1000).toFixed(2) + ' K';
        } else {
            formatted = value.toFixed(2);
        }

        return `₹${formatted}`;
    }
    get formattedBudgetAllocated() {
        return this.formatIndianCurrency(this.teamData?.budgetAllocated);
    }

    get formattedBudgetUtilized() {
        return this.formatIndianCurrency(this.teamData?.budgetUtilized);
    }



}