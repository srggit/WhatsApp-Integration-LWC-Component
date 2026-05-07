import { LightningElement, track, wire, api } from 'lwc';
import getDepartmentalDetails from '@salesforce/apex/DepartmentalBudgetAllocation.getDepartmentalDetails';
import saveDepartmentalBudget from '@salesforce/apex/DepartmentalBudgetAllocation.saveDepartmentalBudget';
import getDepartmentsList from '@salesforce/apex/DepartmentalBudgetAllocation.getDepartmentsList';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';


export default class DepartmentalBudgetAllocation extends LightningElement {
    @track budgetList = [];
    @track isModalOpen = false;
    @track isFirstStep = true;
    @track departmentOptions = [];
    @track showListView = true;
    @track showDetailView = false;
    @track selectedBudgetId = '';
    @track currentFiscalYear = '';
    @track isLoading = true;
    @track yearlyBudgetTotal = 0;
    @track yearlyBudgetUtilized = 0;
    @track availableBudget = 0;
    @api yearlyBudgetId;
    @track isObjectiveModalOpen = false;
    @api yearlyBudgetData;
    @track showAddDepartmentModal = false;
    @track previousDepartmentValue = '';
    @track newBudget = {
        name: '',
        departmentId: '',
        yearlyBudgetId: '',
        amount: '',
        objective: '',
        outcome: ''
    };

    @track wiredBudgetResult;
    timeoutId;

    @wire(getDepartmentalDetails, { yearlyBudgetId: '$yearlyBudgetId' })
    wiredData(result) {
        debugger;
        this.wiredBudgetResult = result;
        const { error, data } = result;

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        this.isLoading = true;

        this.timeoutId = setTimeout(() => {
            this.processWiredData(data, error);
        }, 500);
    }


    processWiredData(data, error) {
        debugger;
        if (data) {
            this.budgetList = data.map(item => ({
                id: item.Id,
                name: item.Name,
                department: item.Department__r?.Name,
                fiscalYear: item.Yearly_Budget__r?.Fiscal_Year__c,
                startDate: this.formatDate(item.Yearly_Budget__r?.Start_Date__c),
                endDate: this.formatDate(item.Yearly_Budget__r?.End_Date__c),
                budgetAmount: item.Yearly_Budget__r?.Budget_Amount__c,
                yearlyUtilizedAmount: item.Yearly_Budget__r?.Utilized_Budget__c,
                totalBudget: this.formatCurrency(item.Department_Budget_Amount__c),
                utilizedBudget: this.formatCurrency(item.Utilized_Budget__c),
                utilizedpercentage: this.formatPercentage(item.Utilized__c),
                lastUpdated: new Date(item.LastModifiedDate).toLocaleDateString('en-GB'),
                budgetObjective: item.Budget_Objective__c,
                expectedOutcome: item.Expected_Outcome__c,
                departmentManager: item.Department__r?.User__r?.Name
            }));

            if (this.budgetList.length > 0) {
                this.currentFiscalYear = this.budgetList[0].fiscalYear;
                this.yearlyBudgetTotal = data[0].Yearly_Budget__r?.Budget_Amount__c || 0;
                this.yearlyBudgetUtilized = data[0].Yearly_Budget__r?.Utilized_Budget__c || 0;
            } else {
                this.currentFiscalYear = this.yearlyBudgetData?.fiscalYear || 'the selected fiscal year';
                this.yearlyBudgetTotal = this.yearlyBudgetData?.totalBudget || 0;
                this.yearlyBudgetUtilized = this.yearlyBudgetData?.utilizedBudget || 0;
            }

            if (this.yearlyBudgetData) {
                this.yearlyBudgetTotal = this.yearlyBudgetData.totalBudget || this.yearlyBudgetTotal;
                this.yearlyBudgetUtilized = this.yearlyBudgetData.utilizedBudget || this.yearlyBudgetUtilized;
                this.currentFiscalYear = this.yearlyBudgetData.fiscalYear || this.currentFiscalYear;
            }

            this.calculateAvailableBudget();
        } else if (error) {
            console.error('Error fetching budget data:', error);
            this.budgetList = [];
            this.currentFiscalYear = this.yearlyBudgetData?.fiscalYear || 'the selected fiscal year';
            this.yearlyBudgetTotal = this.yearlyBudgetData?.totalBudget || 0;
            this.yearlyBudgetUtilized = this.yearlyBudgetData?.utilizedBudget || 0;
            this.calculateAvailableBudget();
            this.showToast('Error', 'Failed to load departmental budget data', 'error');
        }

        this.isLoading = false;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-GB');
    }

    formatCurrency(amount) {
        if (!amount && amount !== 0) return '0';
        return amount.toLocaleString('en-IN');
    }

    formatPercentage(percentage) {
        if (!percentage && percentage !== 0) return '0';
        return percentage.toFixed(2);
    }

    calculateAvailableBudget() {
        const totalAllocated = this.budgetList.reduce((sum, item) => {
            return sum + (parseFloat(item.totalBudget.replace(/,/g, '')) || 0);
        }, 0);

        this.availableBudget = this.yearlyBudgetTotal - totalAllocated;

        if (this.availableBudget < 0) {
            this.availableBudget = 0;
        }
    }

    get yearlyBudgetDisplayValue() {
        return this.currentFiscalYear || '';
    }

    get availableBudgetDisplay() {
        return this.availableBudget ? this.availableBudget.toLocaleString('en-IN') : '0';
    }

    get hasRecords() {
        return this.budgetList && this.budgetList.length > 0;
    }

    get showSpinner() {
        return this.isLoading;
    }

    get yearlyBudgetName() {
        return this.yearlyBudgetData?.budgetName || 'N/A';
    }

    get fiscalYear() {
        return this.yearlyBudgetData?.fiscalYear || this.currentFiscalYear || 'N/A';
    }

    get startDate() {
        return this.yearlyBudgetData?.startDate || 'N/A';
    }

    get endDate() {
        return this.yearlyBudgetData?.endDate || 'N/A';
    }

    get budgetAmount() {
        const amount = this.yearlyBudgetData?.totalBudget || this.yearlyBudgetTotal || 0;
        return this.formatBudgetAmount(amount);
    }


    get utilizedBudget() {
        const utilized = this.yearlyBudgetData?.utilizedBudget || this.yearlyBudgetUtilized || 0;
        return this.formatBudgetAmount(utilized);
    }
    get utilizedPercentage() {
        const total = this.yearlyBudgetData?.totalBudget || this.yearlyBudgetTotal || 0;
        const utilized = this.yearlyBudgetData?.utilizedBudget || this.yearlyBudgetUtilized || 0;

        if (total === 0) return '0.00';

        const percentage = (utilized / total) * 100;
        return percentage.toFixed(2);
    }

    formatBudgetAmount(amount) {
        if (!amount) return '0';

        if (amount >= 10000000) {
            return `${(amount / 10000000).toFixed(1)}Cr`;
        } else if (amount >= 100000) {
            return `${(amount / 100000).toFixed(1)}L`;
        } else if (amount >= 1000) {
            return `${(amount / 1000).toFixed(1)}K`;
        }
        return amount.toString();
    }

    handleAddNewBudget() {
        debugger;
        this.isModalOpen = true;
        this.isFirstStep = true;
        this.newBudget.yearlyBudgetId = this.yearlyBudgetId;
        this.loadDepartments();
    }


    async loadDepartments() {
        debugger;
        try {
            const result = await getDepartmentsList();

            const departmentList = result.map(dep => ({
                label: dep.Name,
                value: dep.Id
            }));

            departmentList.push({
                label: '➕ Add Department',
                value: 'ADD_NEW_DEPARTMENT'
            });

            this.departmentOptions = departmentList;
        } catch (error) {
            console.error('Error loading departments:', error);
            this.showToast('Error', 'Failed to load departments', 'error');
        }
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        let value = event.target.value;


        if (field === 'departmentId' && value === 'ADD_NEW_DEPARTMENT') {
            this.previousDepartmentValue = this.newBudget.departmentId;
            this.showAddDepartmentModal = true;
            return;
        }

        if (field === 'amount') {
            const numericValue = value.replace(/[^0-9.]/g, '');
            const decimalParts = numericValue.split('.');
            if (decimalParts.length > 1) {
                decimalParts[1] = decimalParts[1].slice(0, 2);
                value = decimalParts.join('.');
            } else {
                value = numericValue;
            }

            const enteredAmount = parseFloat(value) || 0;
            if (enteredAmount > this.availableBudget) {
                this.showToast('Error', `Amount cannot exceed available budget of ₹${this.availableBudget.toLocaleString('en-IN')}`, 'error');
                value = this.availableBudget.toString();
                event.target.value = this.availableBudget.toString();
            }
        }

        this.newBudget = { ...this.newBudget, [field]: value };
    }

    handleModalCancel() {
        this.isModalOpen = false;
        this.resetForm();
    }

    resetForm() {
        this.newBudget = {
            name: '',
            departmentId: '',
            yearlyBudgetId: this.yearlyBudgetId,
            amount: '',
            objective: '',
            outcome: ''
        };
        this.isFirstStep = true;
    }

    get nextOrSaveLabel() {
        return this.isFirstStep ? 'Next' : 'Save';
    }

    handleBack() {
        this.isFirstStep = true;
    }

    async handleNextOrSave() {
        debugger;
        if (this.template.activeElement) {
            this.template.activeElement.blur();
        }

        await new Promise(resolve => setTimeout(resolve, 10));

        if (this.isFirstStep) {
            if (!this.validateFirstStep()) {
                return;
            }
            this.isFirstStep = false;
        } else {
            if (!this.validateSecondStep()) {
                return;
            }
            await this.saveBudget();
        }
    }

    validateFirstStep() {
        if (!this.newBudget.name || !this.newBudget.departmentId ||
            !this.newBudget.yearlyBudgetId || !this.newBudget.amount) {
            this.showToast('Error', 'Please fill all required fields', 'error');
            return false;
        }

        const enteredAmount = parseFloat(this.newBudget.amount);
        if (enteredAmount <= 0) {
            this.showToast('Error', 'Amount must be greater than 0', 'error');
            return false;
        }

        if (enteredAmount > this.availableBudget) {
            this.showToast('Error', `Amount cannot exceed available budget of ₹${this.availableBudget.toLocaleString('en-IN')}`, 'error');
            return false;
        }

        return true;
    }

    validateSecondStep() {
        if (!this.newBudget.objective || !this.newBudget.outcome) {
            this.showToast('Error', 'Please fill all required fields', 'error');
            return false;
        }
        return true;
    }

    @api
    refreshYearlyBudgetData(updatedYearlyBudgetData) {
        if (updatedYearlyBudgetData) {
            this.yearlyBudgetData = updatedYearlyBudgetData;
            this.yearlyBudgetTotal = updatedYearlyBudgetData.totalBudget || 0;
            this.yearlyBudgetUtilized = updatedYearlyBudgetData.utilizedBudget || 0;
            this.currentFiscalYear = updatedYearlyBudgetData.fiscalYear || this.currentFiscalYear;
            this.calculateAvailableBudget();
        }
    }

    async saveBudget() {
        debugger;
        try {
            await saveDepartmentalBudget({
                name: this.newBudget.name,
                departmentId: this.newBudget.departmentId,
                yearlyBudgetId: this.newBudget.yearlyBudgetId,
                amount: parseFloat(this.newBudget.amount),
                objective: this.newBudget.objective,
                outcome: this.newBudget.outcome
            });

            this.showToast('Success', 'Departmental budget created successfully', 'success');
            this.isModalOpen = false;
            this.resetForm();

            await refreshApex(this.wiredBudgetResult);

            const refreshYearlyBudgetEvent = new CustomEvent('refreshyearlybudget');
            this.dispatchEvent(refreshYearlyBudgetEvent);

            this.refreshChartComponents();

        } catch (error) {
            console.error('Error saving record:', error);
            this.showToast('Error', error.body?.message || 'Failed to save departmental budget', 'error');
        }
    }


    refreshChartComponents() {
        const performanceChart = this.template.querySelector('c-department-performance-chart');
        if (performanceChart) {
            performanceChart.refreshChart();
        }

        const pieChart = this.template.querySelector('c-sub-department-pie-chart');
        if (pieChart) {
            pieChart.refreshChart();
        }
    }


    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant
        }));
    }

    handleViewDetails(event) {
        const budgetId = event.target.dataset.id;
        console.log('Budget ID:', budgetId);

        this.selectedBudgetId = budgetId;
        this.showListView = false;
        this.showDetailView = true;
    }

    handleBackToList() {
        this.showDetailView = false;
        this.showListView = true;
        this.selectedBudgetId = '';
    }

    handleBackToYearlyBudget() {
        const backEvent = new CustomEvent('backtoyearlybudget');
        this.dispatchEvent(backEvent);
    }

    disconnectedCallback() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }

    handleOpenObjectiveModal() {
        this.isObjectiveModalOpen = true;

        setTimeout(() => {
            this.setRichTextContent();
        }, 100);
    }

    handleCloseObjectiveModal() {
        this.isObjectiveModalOpen = false;
    }

    setRichTextContent() {
        try {
            const objectiveContainer = this.template.querySelector('[data-field="objective"]');
            if (objectiveContainer && this.yearlyBudgetData?.budgetObjective) {
                objectiveContainer.innerHTML = this.yearlyBudgetData.budgetObjective;
            } else if (objectiveContainer) {
                objectiveContainer.innerHTML = '<p>No budget objective available</p>';
            }
            const outcomeContainer = this.template.querySelector('[data-field="outcome"]');
            if (outcomeContainer && this.yearlyBudgetData?.expectedOutcome) {
                outcomeContainer.innerHTML = this.yearlyBudgetData.expectedOutcome;
            } else if (outcomeContainer) {
                outcomeContainer.innerHTML = '<p>No expected outcome available</p>';
            }
        } catch (error) {
            console.error('Error setting rich text content:', error);
        }
    }

    handleCloseDepartmentModal() {
        this.showAddDepartmentModal = false;

        this.newBudget = {
            ...this.newBudget,
            departmentId: this.previousDepartmentValue || ''
        };
        setTimeout(() => {
            const departmentCombobox = this.template.querySelector('[data-field="departmentId"]');
            if (departmentCombobox) {
                departmentCombobox.value = this.previousDepartmentValue || '';
            }
        }, 0);
    }

    async handleDepartmentSaved(event) {
        const { departmentId, departmentName } = event.detail;

        this.showAddDepartmentModal = false;

        await this.refreshDepartmentList();

        this.newBudget = {
            ...this.newBudget,
            departmentId: departmentId
        };

        this.previousDepartmentValue = '';
    }


    async refreshDepartmentList() {
        await this.loadDepartments();
    }

}