import { LightningElement, api, track, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import processApproval from '@salesforce/apex/SubDepartmentalBudgetApprovalController.processApproval';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getPendingApprovalRequestsWithProposals from '@salesforce/apex/SubDepartmentalBudgetApprovalController.getPendingApprovalRequestsWithProposals';

export default class SubDepartmentalBudgetApproval extends LightningElement {
    @api recordId;

    @track approvalRequests = [];
    @track isLoading = true;
    @track errorMessage = '';
    @track showCommentsModal = false;
    @track approvalComments = '';
    @track currentWorkitemId = '';
    @track currentAction = '';
    @track isProcessingApproval = false;
    RECORDS_PER_PAGE = 3;

    wiredApprovalRequestsResult;

    // @wire(getPendingApprovalRequestsWithProposals, { parentBudgetId: '$recordId' })
    // wiredApprovalRequests(result) {
    //     debugger;
    //     this.wiredApprovalRequestsResult = result;
    //     this.isLoading = false;

    //     const { data, error } = result;

    //     if (data) {
    //         console.log('Approval requests data with proposals:', data);
    //         this.approvalRequests = data.map(request => {
    //             return {
    //                 ...request,
    //                 isExpanded: false,
    //                 expandIconName: 'utility:chevronright',
    //                 hasProposals: request.proposals && request.proposals.length > 0,
    //                 proposals: request.proposals ? request.proposals.map(proposal => ({
    //                     ...proposal,
    //                     formattedAskedBudget: this.formatBudgetAmount(proposal.Budget__c),
    //                     formattedExpectedRevenue: this.formatBudgetAmount(proposal.Expected_Revenue__c),
    //                     formattedDate: this.formatDate(proposal.Tentative_Date__c),
    //                     teamMemberName: proposal.Team_Member__r ? proposal.Team_Member__r.Name : 'Not Assigned'
    //                 })) : []
    //             };
    //         });
    //         this.errorMessage = '';

    //         // Process rich text content for Expected Outcome
    //         this.processRichTextContent();
    //     } else if (error) {
    //         console.error('Error fetching approval requests:', error);
    //         this.errorMessage = this.extractErrorMessage(error);
    //         this.approvalRequests = [];
    //     }
    // }

    @wire(getPendingApprovalRequestsWithProposals, { parentBudgetId: '$recordId' })
wiredApprovalRequests(result) {
    debugger;
    this.wiredApprovalRequestsResult = result;
    this.isLoading = false;

    const { data, error } = result;

    if (data) {
        console.log('Approval requests data with proposals:', data);
        this.approvalRequests = data.map(request => {
            const allProposals = request.proposals ? request.proposals.map(proposal => ({
                ...proposal,
                formattedAskedBudget: this.formatBudgetAmount(proposal.Budget__c),
                formattedExpectedRevenue: this.formatBudgetAmount(proposal.Expected_Revenue__c),
                formattedDate: this.formatDate(proposal.Tentative_Date__c),
                teamMemberName: proposal.Team_Member__r ? proposal.Team_Member__r.Name : 'Not Assigned'
            })) : [];

            const displayedProposals = allProposals.slice(0, this.RECORDS_PER_PAGE);

            return {
                ...request,
                isExpanded: false,
                expandIconName: 'utility:chevronright',
                hasProposals: allProposals.length > 0,
                allProposals: allProposals,
                proposals: displayedProposals,
                currentPage: 1,
                showViewAllButton: allProposals.length > this.RECORDS_PER_PAGE
            };
        });
        this.errorMessage = '';

        // Process rich text content for Expected Outcome
        this.processRichTextContent();
    } else if (error) {
        console.error('Error fetching approval requests:', error);
        this.errorMessage = this.extractErrorMessage(error);
        this.approvalRequests = [];
    }
}

    handleViewAllProposals(event) {
    debugger;
    const workitemId = event.currentTarget.dataset.workitemId;
    
    event.preventDefault();
    
    if (workitemId) {
        this.approvalRequests = this.approvalRequests.map(request => {
            if (request.workitemId === workitemId && request.allProposals) {
                const nextPage = request.currentPage + 1;
                const startIndex = 0;
                const endIndex = nextPage * this.RECORDS_PER_PAGE;
                const newDisplayedProposals = request.allProposals.slice(startIndex, endIndex);
               
                const totalRecords = request.allProposals.length;
                const showViewAllButton = endIndex < totalRecords;
                
                return {
                    ...request,
                    proposals: newDisplayedProposals,
                    currentPage: nextPage,
                    showViewAllButton: showViewAllButton
                };
            }
            return request;
        });

        // Re-process rich text content after updating proposals
        setTimeout(() => {
            this.processRichTextContent();
        }, 100);
    }
}

    formatBudgetAmount(amount) {
        debugger;
        if (!amount || amount === 0) {
            return '0';
        }

        if (amount >= 10000000) {
            return (amount / 10000000).toFixed(1) + 'Cr';
        } else if (amount >= 100000) {
            return (amount / 100000).toFixed(1) + 'L';
        } else if (amount >= 1000) {
            return (amount / 1000).toFixed(1) + 'K';
        }
        return amount.toLocaleString();
    }

    formatDate(dateString) {
        debugger;
        if (!dateString) return 'Not Set';

        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    processRichTextContent() {
        setTimeout(() => {
            this.approvalRequests.forEach(request => {
                if (request.proposals) {
                    request.proposals.forEach(proposal => {
                        const outcomeCell = this.template.querySelector(`[data-proposal-id="${proposal.Id}"]`);
                        if (outcomeCell && proposal.Expected_Outcome__c) {
                            outcomeCell.innerHTML = proposal.Expected_Outcome__c;
                        }
                    });
                }
            });
        }, 100);
    }

    get hasApprovalRequests() {
        return this.approvalRequests && this.approvalRequests.length > 0;
    }

    get showNoDataMessage() {
        return !this.isLoading && !this.hasApprovalRequests && !this.errorMessage;
    }

    get modalTitle() {
        return this.currentAction === 'approve' ? 'Accept Budget Request' : 'Reject Budget Request';
    }

    get confirmButtonLabel() {
        return this.currentAction === 'approve' ? 'Accept' : 'Reject';
    }

    get confirmButtonVariant() {
        return this.currentAction === 'approve' ? 'brand' : 'destructive';
    }

    connectedCallback() {
        console.log('Component connected, recordId:', this.recordId);
        this.clearMessages();
    }

    toggleRequestDetails(event) {
        const workitemId = event.currentTarget.dataset.workitemId;

        this.approvalRequests = this.approvalRequests.map(request => {
            if (request.workitemId === workitemId) {
                return {
                    ...request,
                    isExpanded: !request.isExpanded,
                    expandIconName: !request.isExpanded ? 'utility:chevrondown' : 'utility:chevronright'
                };
            }
            return request;
        });
    }

    handleApprovalAction(event) {
        event.preventDefault();
        event.stopPropagation();

        const action = event.currentTarget.dataset.action;
        const workitemId = event.currentTarget.dataset.workitemId;

        console.log('Approval action triggered:', action, 'WorkitemId:', workitemId);

        if (!workitemId) {
            this.showErrorToast('Error', 'Invalid workitem ID');
            return;
        }

        this.currentAction = action;
        this.currentWorkitemId = workitemId;
        this.approvalComments = '';
        this.showCommentsModal = true;
    }

    handleCommentsChange(event) {
        this.approvalComments = event.target.value;
    }

    closeCommentsModal() {
        this.showCommentsModal = false;
        this.approvalComments = '';
        this.currentWorkitemId = '';
        this.currentAction = '';
        this.isProcessingApproval = false;
    }

    async confirmApprovalAction() {
        if (!this.currentWorkitemId || !this.currentAction) {
            this.showErrorToast('Error', 'Missing required information');
            return;
        }

        this.isProcessingApproval = true;

        try {
            const action = this.currentAction === 'approve' ? 'Approve' : 'Reject';
            console.log('Processing approval:', action, 'for workitem:', this.currentWorkitemId);

            const result = await processApproval({
                workitemId: this.currentWorkitemId,
                action: action,
                comments: this.approvalComments
            });

            // Show success toast
            this.showSuccessToast(
                action === 'Approve' ? 'Success' : 'Rejected',
                result
            );

            // Clear error message
            this.errorMessage = '';

            // Close modal
            this.closeCommentsModal();

            // Refresh the data
            await this.refreshApprovalRequests();

            // Dispatch event to notify parent component
            this.dispatchEvent(new CustomEvent('refreshparent'));

        } catch (error) {
            console.error('Error processing approval:', error);
            const errorMsg = this.extractErrorMessage(error);
            this.showErrorToast('Error Processing Approval', errorMsg);
            this.errorMessage = errorMsg;
        } finally {
            this.isProcessingApproval = false;
        }
    }

    async refreshApprovalRequests() {
        this.isLoading = true;
        try {
            await refreshApex(this.wiredApprovalRequestsResult);
        } catch (error) {
            console.error('Error refreshing approval requests:', error);
            this.errorMessage = this.extractErrorMessage(error);
        } finally {
            this.isLoading = false;
        }
    }

    extractErrorMessage(error) {
        console.log('Extracting error message from:', error);

        if (error && error.body) {
            if (error.body.message) {
                return error.body.message;
            } else if (error.body.pageErrors && error.body.pageErrors.length > 0) {
                return error.body.pageErrors[0].message;
            } else if (error.body.fieldErrors) {
                const fieldErrorMessages = [];
                Object.keys(error.body.fieldErrors).forEach(field => {
                    error.body.fieldErrors[field].forEach(fieldError => {
                        fieldErrorMessages.push(`${field}: ${fieldError.message}`);
                    });
                });
                return fieldErrorMessages.join(', ');
            }
        }
        return error?.message || 'An unknown error occurred';
    }

    showSuccessToast(title, message) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: 'success',
                mode: 'dismissable'
            })
        );
    }

    showErrorToast(title, message) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: 'error',
                mode: 'sticky'
            })
        );
    }

    clearMessages() {
        this.errorMessage = '';
    }

    clearErrorMessage() {
        this.errorMessage = '';
    }

    @api
    async refresh() {
        await this.refreshApprovalRequests();
    }
}