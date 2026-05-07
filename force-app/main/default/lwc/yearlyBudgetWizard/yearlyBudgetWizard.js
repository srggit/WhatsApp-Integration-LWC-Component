import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import createYearlyBudget from '@salesforce/apex/YearlyBudgetController.createYearlyBudget';
import getYearlyBudgetDetails from '@salesforce/apex/YearlyBudgetController.getYearlyBudgetDetails';
import isDuplicateFiscalYear from '@salesforce/apex/YearlyBudgetController.isDuplicateFiscalYear';

// For picklist
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import YEARLY_BUDGET_OBJECT from '@salesforce/schema/Yearly_Budget__c';
import FISCAL_YEAR_FIELD from '@salesforce/schema/Yearly_Budget__c.Fiscal_Year__c';

export default class YearlyBudgetWizard extends LightningElement {
    @track isModalOpen = false;
    @track isStepOne = true;
    @track isLoading = false; // Add loading state
    @track isSaving = false; // Add saving state for modal

    @track budgetName = '';
    @track fiscalYear = '';
    @track budgetAmount = '';
    @track businessObjective = '';
    @track expectedOutcome = '';

    @track fiscalYearOptions = [];
    @track budgetList = [];
    @track wiredYearlyBudgetResult;
    
    // Pagination properties
    @track currentPage = 1;
    @track pageSize = 3;
    @track totalPages = 1;
    @track displayedRecords = [];

    @track startDate = '';
    @track endDate = '';
    @track chartKey = 0;

    @track showYearlyBudgetView = true;
    @track showDepartmentalBudgetView = false;
    @track selectedYearlyBudgetId = '';
    @track selectedYearlyBudgetData = null;

    @wire(getObjectInfo, { objectApiName: YEARLY_BUDGET_OBJECT })
    objectInfo;

    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: FISCAL_YEAR_FIELD
    })
    wiredPicklist({ data, error }) {
        debugger;
        if (data) {
            this.fiscalYearOptions = data.values.map(val => ({
                label: val.label,
                value: val.value
            }));
        } else if (error) {
            console.error('Error loading picklist:', error);
            this.showToast('Error loading Fiscal Year options', error.body?.message || 'Unknown error', 'error');
        }
    }

    async handleRefreshYearlyBudget(event) {
    try {
        // Refresh the wired yearly budget data
        await refreshApex(this.wiredYearlyBudgetResult);
        
        // Update the child component with refreshed data if it's currently showing
        if (this.showDepartmentalBudgetView && this.selectedYearlyBudgetId) {
            const updatedBudgetData = this.getYearlyBudgetDataById(this.selectedYearlyBudgetId);
            this.selectedYearlyBudgetData = updatedBudgetData;
            
            // Update the child component directly
            const departmentalBudgetComponent = this.template.querySelector('c-departmental-budget-allocation');
            if (departmentalBudgetComponent && updatedBudgetData) {
                departmentalBudgetComponent.refreshYearlyBudgetData(updatedBudgetData);
            }
        }
    } catch (error) {
        console.error('Error refreshing yearly budget data:', error);
        this.showToast('Error', 'Failed to refresh budget data', 'error');
    }
}

    @wire(getYearlyBudgetDetails)
    wiredData(result) {
        debugger;
        this.wiredYearlyBudgetResult = result;
        const { error, data } = result;
        
        // Set loading to false when data is received
        this.isLoading = false;
        
        if (data) {
            debugger;
            console.log('Yearly Budget Data:', data);
            this.budgetList = data.map(item => ({
                id: item.Id,
                name: item.Name,
                fiscalYear: item.Fiscal_Year__c,
                startDate: item.Start_Date__c ? this.formatDate(item.Start_Date__c) : '',
                endDate: item.End_Date__c ? this.formatDate(item.End_Date__c) : '',
                totalBudget: item.Budget_Amount__c ? this.formatCurrency(item.Budget_Amount__c) : '0',
                utilizedBudget: item.Utilized_Budget__c ? this.formatCurrency(item.Utilized_Budget__c) : '0',
                utilizedpercentage: item.Utilized__c ? item.Utilized__c.toFixed(2) : '0.00',
                budgetObjective: item.Business_Objective__c,
                expectedOutcome: item.Expected_Outcome__c
            }));
            
            // Initialize pagination
            this.totalPages = Math.ceil(this.budgetList.length / this.pageSize);
            this.updateDisplayedRecords();
        } else if (error) {
            console.error('Error fetching budget data:', error);
            this.budgetList = [];
            this.showToast('Error', 'Failed to load budget data: ' + (error.body?.message || 'Unknown error'), 'error');
        }
    }

    // Initialize loading state
    connectedCallback() {
        this.isLoading = true;
    }

    // Getter for pagination button states
    get isFirstPage() {
        return this.currentPage === 1;
    }

    get isLastPage() {
        return this.currentPage >= this.totalPages;
    }

    // Pagination methods
    updateDisplayedRecords() {
        debugger;
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.displayedRecords = this.budgetList.slice(startIndex, endIndex);
    }

    handleNext() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updateDisplayedRecords();
        }
    }

    handlePrevious() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updateDisplayedRecords();
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    }

    formatCurrency(amount) {
        if (!amount) return '0';
        return new Intl.NumberFormat('en-IN').format(amount);
    }

    openModal() {
        this.isModalOpen = true;
        this.isStepOne = true;
    }

    closeModal() {
        this.isModalOpen = false;
        this.isSaving = false; // Reset saving state
        this.resetFields();
    }

    goToStepTwo() {
        const errors = [];

        if (!this.budgetName || this.budgetName.trim() === '') {
            errors.push('Budget Name');
        }

        if (!this.fiscalYear) {
            errors.push('Fiscal Year');
        }

        const amount = parseFloat(this.budgetAmount);
        if (!this.budgetAmount || isNaN(amount) || amount <= 0) {
            errors.push('Valid Budget Amount (must be > 0)');
        }

        if (errors.length > 0) {
            this.showToast('Validation Error', `Please fix the following: ${errors.join(', ')}`, 'error');
            return;
        }

        isDuplicateFiscalYear({ fiscalYear: this.fiscalYear })
            .then(isDuplicate => {
                if (isDuplicate) {
                    this.showToast('Duplicate Error', 'A budget already exists for this fiscal year.', 'error');
                } else {
                    this.isStepOne = false;
                }
            })
            .catch(error => {
                console.error('Error checking duplicate:', error);
                this.showToast('Error', error.body?.message || 'Error checking duplicate fiscal year', 'error');
            });
    }

    goToStepOne() {
        this.isStepOne = true;
    }

    resetFields() {
        this.budgetName = '';
        this.fiscalYear = '';
        this.budgetAmount = '';
        this.businessObjective = '';
        this.expectedOutcome = '';
    }

    handleBudgetNameChange(event) {
        this.budgetName = event.target.value;
    }

    handleFiscalYearChange(event) {
        this.fiscalYear = event.detail.value;
        
        // Extract years from fiscal year format (assuming format is "YYYY-YY")
        if (this.fiscalYear) {
            const years = this.fiscalYear.split('-');
            if (years.length === 2) {
                const startYear = years[0];
                const endYear = '20' + years[1]; // Convert YY to YYYY
                
                // Set dates in DD/MM/YYYY format
                this.startDate = `01/04/${startYear}`;
                this.endDate = `31/03/${endYear}`;
            }
        } else {
            this.startDate = '';
            this.endDate = '';
        }
    }
    
    handleBudgetAmountChange(event) {
        this.budgetAmount = event.target.value;
    }

    handleObjectiveChange(event) {
        this.businessObjective = event.target.value;
    }

    handleOutcomeChange(event) {
        this.expectedOutcome = event.target.value;
    }

    saveBudget() {
        debugger;
        const missingFields = [];
        
        if (!this.businessObjective || this.businessObjective.trim() === '') {
            missingFields.push('Business Objective');
        }
        if (!this.expectedOutcome || this.expectedOutcome.trim() === '') {
            missingFields.push('Expected Outcome');
        }

        if (missingFields.length > 0) {
            this.showToast(
                'Validation Error',
                `Please fill in the following field(s): ${missingFields.join(', ')}`,
                'error'
            );
            return;
        }

        this.isSaving = true;

        const fields = {
            Name: this.budgetName,
            Fiscal_Year__c: this.fiscalYear,
            Budget_Amount__c: parseFloat(this.budgetAmount),
            Business_Objective__c: this.businessObjective,
            Expected_Outcome__c: this.expectedOutcome
        };

        createYearlyBudget({ budgetData: fields })
            .then((newlyCreatedBudgetId) => {
                this.showToast('Success', 'Yearly Budget created successfully!', 'success');
                this.closeModal();
                
                // Refresh the data first
                return refreshApex(this.wiredYearlyBudgetResult)
                    .then(() => {
                        // Use setTimeout to ensure the data is fully refreshed
                        setTimeout(() => {
                            // Create a mock event object to simulate clicking on the newly created record
                            const mockEvent = {
                                target: {
                                    dataset: {
                                        id: newlyCreatedBudgetId
                                    }
                                }
                            };
                            
                            // Call the existing handleViewDetails method
                            this.handleViewDetails(mockEvent);
                        }, 100); // Small delay to ensure data is updated
                    });
            })
            .catch(error => {
                console.error('Error creating budget:', error);
                this.showToast('Error', error.body?.message || 'Error creating yearly budget', 'error');
            })
            .finally(() => {
                this.isSaving = false;
            });
    }


    getYearlyBudgetDataById(budgetId) {
        const budgetRecord = this.budgetList.find(budget => budget.id === budgetId);
        if (budgetRecord) {
            return {
                budgetName: budgetRecord.name, // This will be used for departmentHeadName
                fiscalYear: budgetRecord.fiscalYear,
                startDate: budgetRecord.startDate,
                endDate: budgetRecord.endDate,
                budgetObjective: budgetRecord.budgetObjective,
                expectedOutcome: budgetRecord.expectedOutcome,
                // Convert formatted currency back to numbers for calculations
                totalBudget: parseFloat(budgetRecord.totalBudget.replace(/,/g, '')),
                utilizedBudget: parseFloat(budgetRecord.utilizedBudget.replace(/,/g, ''))
            };
        }
        return null;
    }

    handleViewDetails(event) {
        debugger;
        const budgetId = event.target.dataset.id;
        console.log('View details for budget ID:', budgetId);
        
        // Get the yearly budget data for the selected record
        const selectedBudgetData = this.getYearlyBudgetDataById(budgetId);
        
        // Switch to departmental budget view
        this.selectedYearlyBudgetId = budgetId;
        this.selectedYearlyBudgetData = selectedBudgetData;  // Add this line
        this.showYearlyBudgetView = false;
        this.showDepartmentalBudgetView = true;
    }

    handleBackToYearlyBudget() {
        debugger;
        this.showDepartmentalBudgetView = false;
        this.showYearlyBudgetView = true;
        this.selectedYearlyBudgetId = '';
        this.chartKey++; 
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}