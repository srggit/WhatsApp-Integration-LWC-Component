import { LightningElement, api, track } from 'lwc';
import getDepartmentalBudgetById from '@salesforce/apex/DepartmentalBudgetAllocation.getDepartmentalBudgetById';
import getChildDepartmentalBudgets from '@salesforce/apex/DepartmentalBudgetAllocation.getChildDepartmentalBudgets';
import getProposalsByDepartmentalBudget from '@salesforce/apex/DepartmentalBudgetAllocation.getProposalsByDepartmentalBudget';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getUpcomingScheduleForParentDepartment from '@salesforce/apex/DepartmentalBudgetAllocation.getUpcomingScheduleForParentDepartment';


export default class BudgetDetailView extends LightningElement {
    @api budgetId;
    @track budgetDetails = {};
    @track childDepartments = [];
    @track isLoading = true;
    @track upcomingSchedule = [];
    @track displayedSchedule = []; 
    @track scheduleCurrentPage = 1; 
    @track showScheduleViewAll = false; 

    RECORDS_PER_PAGE = 3;

    connectedCallback() {
        debugger;
        if (this.budgetId) {
            this.loadBudgetDetails();
            this.loadChildDepartments();
            this.loadUpcomingSchedule(); 
        }
    }

    renderedCallback() {
        const objectiveDiv = this.template.querySelector('[data-id="objective"]');
        if (objectiveDiv && this.budgetDetails.objective) {
            objectiveDiv.innerHTML = this.budgetDetails.objective;
        }

        const outcomeDiv = this.template.querySelector('[data-id="outcome"]');
        if (outcomeDiv && this.budgetDetails.outcome) {
            outcomeDiv.innerHTML = this.budgetDetails.outcome;
        }

        this.renderProposalOutcomes();
    }

    renderProposalOutcomes() {
        debugger;
        this.childDepartments.forEach(dept => {
            if (dept.proposals && dept.isExpanded) {
                dept.displayedProposals.forEach(proposal => {
                    const outcomeDiv = this.template.querySelector(`[data-proposal-id="${proposal.Id}"]`);
                    if (outcomeDiv && proposal.Expected_Outcome__c) {
                        outcomeDiv.innerHTML = proposal.Expected_Outcome__c;
                    }
                });
            }
        });
    }

    loadBudgetDetails() {
        debugger;
        this.isLoading = true;
        getDepartmentalBudgetById({ budgetId: this.budgetId })
            .then(result => {
                debugger;
                this.budgetDetails = {
                    departmentName: result.Department__r?.Name,
                    totalBudget: this.formatBudgetAmount(result.Department_Budget_Amount__c),
                    utilizedBudget: this.formatBudgetAmount(result.Utilized_Budget__c),
                    utilizedPercentage:result.Utilized__c,
                    departmentHead: result.Department__r?.User__r?.Name,
                    financialYear: result.Yearly_Budget__r?.Fiscal_Year__c,
                    objective: result.Budget_Objective__c,
                    outcome: result.Expected_Outcome__c
                };

                this.isLoading = false;
            })
            .catch(error => {
                debugger;
                console.error('Error fetching budget details:', error);
                this.showToast('Error', 'Failed to load budget details', 'error');
                this.isLoading = false;
            });
    }

    loadChildDepartments() {
        debugger;
        getChildDepartmentalBudgets({ parentBudgetId: this.budgetId })
            .then(result => {
                debugger;
                this.childDepartments = result.map(dept => ({
                    Id: dept.Id,
                    Name: dept.Department__r?.Name,
                    budgetAmount: dept.Department_Budget_Amount__c || 0,
                    formattedAmount: this.formatBudgetAmount(dept.Department_Budget_Amount__c || 0),
                    formattedUtilizedAmount: this.formatBudgetAmount(dept.Utilized_Budget__c || 0),
                    displayUtilizedAmount: dept.Utilized_Budget__c ? '₹' + this.formatBudgetAmount(dept.Utilized_Budget__c) : '₹0',
                    displayUtilizedPercentage: dept.Utilized__c != null ? Math.round(dept.Utilized__c) + '%' : '0%',
                    utilizedPercentage: dept.Utilized__c != null ? Math.round(dept.Utilized__c) : 0,
                    isExpanded: false,
                    iconName: 'utility:chevronright',
                    triggerClass: 'slds-dropdown-trigger slds-dropdown-trigger_click',
                    proposals: null,
                    displayedProposals: [], 
                    currentPage: 1, 
                    showViewAllButton: false 
                }));
                
                console.log('Child departments with utilization data:', JSON.parse(JSON.stringify(this.childDepartments)));
            })
            .catch(error => {
                debugger;
                console.error('Error fetching child departments:', error);
                this.showToast('Error', 'Failed to load child departments', 'error');
            });
    }

    loadProposalsForDepartment(departmentId) {
        debugger;
        getProposalsByDepartmentalBudget({ departmentalBudgetId: departmentId })
            .then(result => {
                debugger;
                const formattedProposals = result.map(proposal => ({
                    Id: proposal.Id,
                    Name: proposal.Name,
                    Budget__c: proposal.Budget__c,
                    formattedBudget: this.formatBudgetAmount(proposal.Budget__c),
                    approvedBudget: proposal.Approved_Budget__c,
                    formattedApprovedBudget: this.formatBudgetAmount(proposal.Approved_Budget__c),
                    expectedRevenue: proposal.Expected_Revenue__c,
                    formattedExpectedRevenue: this.formatBudgetAmount(proposal.Expected_Revenue__c),
                    actualRevenue: proposal.Actual_Revenue__c,
                    formattedActualRevenue:this.formatBudgetAmount(proposal.Actual_Revenue__c),
                    Tentative_Date__c: proposal.Tentative_Date__c,
                    formattedDate: proposal.Tentative_Date__c ? 
                        new Date(proposal.Tentative_Date__c).toLocaleDateString('en-GB') : 'N/A',
                    Team_Member__c: proposal.Team_Member__c,
                    teamMemberName: proposal.Team_Member__r?.Name || 'N/A',
                    Expected_Outcome__c: proposal.Expected_Outcome__c
                }));

                this.childDepartments = this.childDepartments.map(dept => {
                    if (dept.Id === departmentId) {
                        const totalRecords = formattedProposals.length;
                        const displayedProposals = formattedProposals.slice(0, this.RECORDS_PER_PAGE);
                        
                        return {
                            ...dept,
                            proposals: formattedProposals,
                            displayedProposals: displayedProposals,
                            currentPage: 1,
                            showViewAllButton: totalRecords > this.RECORDS_PER_PAGE
                        };
                    }
                    return dept;
                });

                console.log('Proposals loaded for department:', departmentId, formattedProposals);
            })
            .catch(error => {
                debugger;
                console.error('Error fetching proposals:', error);
                this.showToast('Error', 'Failed to load yearly activities', 'error');
            });
    }

    handleViewAll(event) {
        debugger;
        const deptId = event.currentTarget.dataset.deptId;
        
        event.preventDefault();
        
        if (deptId) {
            this.childDepartments = this.childDepartments.map(dept => {
                if (dept.Id === deptId && dept.proposals) {
                    const nextPage = dept.currentPage + 1;
                    const startIndex = 0;
                    const endIndex = nextPage * this.RECORDS_PER_PAGE;
                    const newDisplayedProposals = dept.proposals.slice(startIndex, endIndex);
                   
                    const totalRecords = dept.proposals.length;
                    const showViewAllButton = endIndex < totalRecords;
                    
                    return {
                        ...dept,
                        displayedProposals: newDisplayedProposals,
                        currentPage: nextPage,
                        showViewAllButton: showViewAllButton
                    };
                }
                return dept;
            });
        }
    }

    formatBudgetAmount(amount) {
        debugger;
        if (!amount) return '0';
        
        if (amount >= 10000000) {
            return `${(amount / 10000000).toFixed(1)}Cr`;
        }
        else if (amount >= 100000) {
            return `${(amount / 100000).toFixed(1)}L`;
        }
        else if (amount >= 1000) {
            return `${(amount / 1000).toFixed(1)}K`;
        }
        return amount.toString();
    }

    handleDropdownToggle(event) {
        debugger;
        const deptId = event.currentTarget.dataset.deptId || event.target.dataset.deptId;
        
        if (deptId) {
            this.childDepartments = this.childDepartments.map(dept => {
                if (dept.Id === deptId) {
                    const isExpanded = !dept.isExpanded;
                    
                    if (isExpanded && !dept.proposals) {
                        this.loadProposalsForDepartment(deptId);
                    }
                    
                    if (isExpanded && dept.proposals) {
                        const displayedProposals = dept.proposals.slice(0, this.RECORDS_PER_PAGE);
                        const totalRecords = dept.proposals.length;
                        
                        return {
                            ...dept,
                            isExpanded: isExpanded,
                            iconName: isExpanded ? 'utility:chevrondown' : 'utility:chevronright',
                            triggerClass: isExpanded ? 
                                'slds-dropdown-trigger slds-dropdown-trigger_click expanded' : 
                                'slds-dropdown-trigger slds-dropdown-trigger_click',
                            displayedProposals: displayedProposals,
                            currentPage: 1,
                            showViewAllButton: totalRecords > this.RECORDS_PER_PAGE
                        };
                    }
                    
                    return {
                        ...dept,
                        isExpanded: isExpanded,
                        iconName: isExpanded ? 'utility:chevrondown' : 'utility:chevronright',
                        triggerClass: isExpanded ? 
                            'slds-dropdown-trigger slds-dropdown-trigger_click expanded' : 
                            'slds-dropdown-trigger slds-dropdown-trigger_click'
                    };
                }
                return dept;
            });
        }
    }

    handleBackToList() {
        debugger;
        const backEvent = new CustomEvent('backtolist');
        this.dispatchEvent(backEvent);
    }

    showToast(title, message, variant) {
        debugger;
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant
        }));
    }

    loadUpcomingSchedule() {
        debugger;
        getUpcomingScheduleForParentDepartment({ parentDepartmentalBudgetId: this.budgetId })
            .then(result => {
                debugger;
                this.upcomingSchedule = result.map(proposal => ({
                    Id: proposal.Id,
                    Name: proposal.Name,
                    Budget__c: proposal.Budget__c,
                    formattedBudget: this.formatBudgetAmount(proposal.Budget__c),
                    Tentative_Date__c: proposal.Tentative_Date__c,
                    formattedDate: proposal.Tentative_Date__c ? 
                        new Date(proposal.Tentative_Date__c).toLocaleDateString('en-GB') : 'N/A',
                    Team_Member__c: proposal.Team_Member__c,
                    teamMemberName: proposal.Team_Member__r?.Name || 'N/A',
                    Expected_Outcome__c: proposal.Expected_Outcome__c,
                    departmentName: proposal.Departmental_Budget__r?.Department__r?.Name || 'N/A'
                }));
                
                this.displayedSchedule = this.upcomingSchedule.slice(0, this.RECORDS_PER_PAGE);
                this.scheduleCurrentPage = 1;
                this.showScheduleViewAll = this.upcomingSchedule.length > this.RECORDS_PER_PAGE;
                
                console.log('Upcoming schedule loaded:', this.upcomingSchedule);
            })
            .catch(error => {
                debugger;
                console.error('Error fetching upcoming schedule:', error);
                this.showToast('Error', 'Failed to load upcoming schedule', 'error');
            });
    }

    handleScheduleViewAll(event) {
        debugger;
        event.preventDefault();
        
        const nextPage = this.scheduleCurrentPage + 1;
        const startIndex = 0;
        const endIndex = nextPage * this.RECORDS_PER_PAGE;
        
        this.displayedSchedule = this.upcomingSchedule.slice(startIndex, endIndex);
        this.scheduleCurrentPage = nextPage;
        this.showScheduleViewAll = endIndex < this.upcomingSchedule.length;
    }

    handleRefreshParent() {
    this.loadBudgetDetails();
    this.loadChildDepartments();
    this.loadUpcomingSchedule();

    setTimeout(() => {
        this.renderProposalOutcomes();
    }, 500);
}
}