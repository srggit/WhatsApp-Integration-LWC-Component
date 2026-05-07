// import { LightningElement, track } from 'lwc';
// import getAllFiscalYears from '@salesforce/apex/DepartmentDashboardController.getAllFiscalYears';
// import getDepartmentDataForHead from '@salesforce/apex/DepartmentDashboardController.getDepartmentDataForHead';
// import getSubDepartmentalBudgets from '@salesforce/apex/DepartmentDashboardController.getSubDepartmentalBudgets';

// export default class DepartmentDashboard extends LightningElement {
//     @track fiscalYears = [];
//     @track selectedFiscalYear = '';
//     @track departmentId;
//     @track departmentBudgetId = '';
//     @track teamCards = [];
//     @track showDashboard = true;
//     @track showTeamDetails = false;
//     @track isModalOpen = false;
//     @track selectedTeamId = null;
//     @track noBudgetAvailable = false;
//     @track isLoading = false;

//     //new
//     @track isObjectiveModalOpen = false;


//     @track departmentName;
//     @track departmentHeadName;
//     @track departmentBudgetAmount;
//     @track departmentutilizedBudget;
//     @track departmentutilizedPercent;
//     @track teamName;
//     @track numMembers;
//     @track region;
//     @track YearlyBudget;
//     @track departmentalBudgetName;

//     //new
//     @track budgetObjective;
//    @track expectedOutcome;

//     connectedCallback() {
//         this.loadFiscalYearsAndData();
//     }

//     loadFiscalYearsAndData() {
//         this.isLoading = true;
//         getAllFiscalYears()
//             .then(result => {
//                 this.fiscalYears = result;
//                 this.selectedFiscalYear = result[0]; // default to latest year
//                 this.loadDepartmentData();
//             })
//             .catch(error => {
//                 console.error('Error fetching fiscal years:', error);
//                 this.isLoading = false;
//             });
//     }

//     handleYearChange(event) {
//         const selectedYear = event.detail.value;
//         // Always reload data, even if same year is selected
//         this.selectedFiscalYear = ''; // Reset to allow rerender
//         this.isLoading = true;

//         // Small delay to ensure rerendering happens
//         setTimeout(() => {
//             this.selectedFiscalYear = selectedYear;
//             this.loadDepartmentData();
//         }, 200);
//     }

//     loadDepartmentData() {
//         this.isLoading = true;
//         this.noBudgetAvailable = false;

//         getDepartmentDataForHead({ fiscalYear: this.selectedFiscalYear })
//             .then(data => {
//                 this.departmentId = data.departmentId;
//                 this.departmentBudgetId = data.departmentBudgetId;
//                 this.departmentName = data.name;
//                 this.departmentHeadName = data.departmentHead;
//                 this.teamName = data.teamName;
//                 this.numMembers = data.noOfMembers;
//                 this.region = data.region;
//                 this.departmentalBudgetName = data.departmentalBudgetName;
//                 this.departmentBudgetAmount = this.formatBudgetAmount(data.departmentBudgetAmount);
//                 this.departmentutilizedBudget = data.departmentutilizedBudget;
//                 this.departmentutilizedPercent = data.departmentutilizedPercent;
//                 this.YearlyBudget = this.formatBudgetAmount(data.YearlyBudget);

//                 //new 
//                 this.budgetObjective = data.budgetObjective;
//                 this.expectedOutcome = data.expectedOutcome;


//                 if (!this.departmentBudgetId) {
//                     this.noBudgetAvailable = true;
//                     this.teamCards = [];
//                     this.isLoading = false;
//                     return;
//                 }

//                 return getSubDepartmentalBudgets({ departmentBudgetId: this.departmentBudgetId });
//             })
//             .then(teams => {
//                 if (teams) {
//                     this.teamCards = teams.map(team => ({
//                         id: team.departmentId,
//                         name: team.departmentName,
//                         head: team.teamHead,
//                         budgetallocated: this.formatBudgetAmount(team.budgetAllocated),
//                         utilizedBudget: this.formatBudgetAmount(team.utilizedBudget),
//                         utilizedPercent: team.utilizedPercent || 0,
//                         status: team.status ,
//                         statusClass: this.getStatusClass(team.status)
//                     }));
//                 }
//                 this.isLoading = false;
//             })
//             .catch(error => {
//                 console.error('Error loading department data:', error);
//                 this.isLoading = false;
//             });
//     }

// getStatusClass(status) {
//     switch ((status || '').toLowerCase()) {
//         case 'draft':
//             return 'slds-text-color_weak';
//         case 'submitted':
//             return 'slds-text-color_brand';
//         case 'approved':
//             return 'slds-text-color_success';
//         case 'rejected':
//             return 'slds-text-color_error';
//         default:
//             return '';
//     }
// }




//     get fiscalYearOptions() {
//         return this.fiscalYears.map(year => ({
//             label: year,
//             value: year
//         }));
//     }

//     formatBudgetAmount(amount) {
//         if (!amount) return '0';
//         if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`;
//         if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
//         if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
//         return amount.toString();
//     }

//     get formattedUtilizedBudget() {
//         return this.formatBudgetAmount(this.departmentutilizedBudget || 0);
//     }

//     get formattedUtilizedPercent() {
//         return this.departmentutilizedPercent != null ? this.departmentutilizedPercent.toFixed(1) : '0';
//     }

//     openCreateTeamModal() {
//         this.isModalOpen = true;
//     }
    
//     get isBudgetExhausted() {
//         return this.departmentutilizedPercent >= 100;
//     }


//     handleModalClose() {
//         this.isModalOpen = false;
//     }

//     handleTeamSaved() {
//         this.loadDepartmentData();
//         this.isModalOpen = false;
//     }

//     handleViewDetails(event) {
//         this.selectedTeamId = event.currentTarget.dataset.teamId;
//         this.showDashboard = false;
//         this.showTeamDetails = true;
//     }

//     handleBackFromTeam() {
//         this.selectedTeamId = null;
//         this.showDashboard = true;
//         this.showTeamDetails = false;
//     }

//     handleBackToDashboard() {
//         this.noBudgetAvailable = false;

//         // Optionally reset to default year (first fiscal year)
//         if (this.fiscalYears.length > 0) {
//             this.selectedFiscalYear = this.fiscalYears[0];
//         }

//         this.loadDepartmentData(); // Reload dashboard with the default or current fiscal year
//     }

//     //new
//     handleViewObjective() {
//     this.isObjectiveModalOpen = true;
// }

// closeObjectiveModal() {
//     this.isObjectiveModalOpen = false;
// }

// }




import { LightningElement, track } from 'lwc';
import getAllFiscalYears from '@salesforce/apex/DepartmentDashboardController.getAllFiscalYears';
import getDepartmentDataForHead from '@salesforce/apex/DepartmentDashboardController.getDepartmentDataForHead';
import getSubDepartmentalBudgets from '@salesforce/apex/DepartmentDashboardController.getSubDepartmentalBudgets';

export default class DepartmentDashboard extends LightningElement {
    @track fiscalYears = [];
    @track selectedFiscalYear = '';
    @track departmentId;
    @track departmentBudgetId = '';
    @track teamCards = [];
    @track showDashboard = true;
    @track showTeamDetails = false;
    @track isModalOpen = false;
    @track selectedTeamId = null;
    @track noBudgetAvailable = false;
    @track isLoading = false;

    //new
    @track isObjectiveModalOpen = false;

    @track departmentName;
    @track departmentHeadName;
    @track departmentBudgetAmount;
    @track departmentutilizedBudget;
    @track departmentutilizedPercent;
    @track teamName;
    @track numMembers;
    @track region;
    @track YearlyBudget;
    @track departmentalBudgetName;

    @track budgetObjective;
    @track expectedOutcome;

    connectedCallback() {
        this.loadFiscalYearsAndData();
    }

    loadFiscalYearsAndData() {
        this.isLoading = true;
        getAllFiscalYears()
            .then(result => {
                this.fiscalYears = result;
                this.tryFiscalYears(result, 0); // Start checking years
            })
            .catch(error => {
                console.error('Error fetching fiscal years:', error);
                this.isLoading = false;
            });
    }

    tryFiscalYears(years, index) {
        if (index >= years.length) {
            this.noBudgetAvailable = true;
            this.isLoading = false;
            return;
        }

        const year = years[index];
        getDepartmentDataForHead({ fiscalYear: year })
            .then(data => {
                if (!data || !data.departmentBudgetId) {
                    this.tryFiscalYears(years, index + 1);
                } else {
                    this.selectedFiscalYear = year;
                    this.departmentId = data.departmentId;
                    this.departmentBudgetId = data.departmentBudgetId;
                    this.departmentName = data.name;
                    this.departmentHeadName = data.departmentHead;
                    this.teamName = data.teamName;
                    this.numMembers = data.noOfMembers;
                    this.region = data.region;
                    this.departmentalBudgetName = data.departmentalBudgetName;
                    this.departmentBudgetAmount = this.formatBudgetAmount(data.departmentBudgetAmount);
                    this.departmentutilizedBudget = data.departmentutilizedBudget;
                    this.departmentutilizedPercent = data.departmentutilizedPercent;
                    this.YearlyBudget = this.formatBudgetAmount(data.YearlyBudget);
                    this.budgetObjective = data.budgetObjective;
                    this.expectedOutcome = data.expectedOutcome;

                    this.noBudgetAvailable = false;

                    return getSubDepartmentalBudgets({ departmentBudgetId: this.departmentBudgetId });
                }
            })
            .then(teams => {
                if (teams) {
                    this.teamCards = teams.map(team => ({
                        id: team.departmentId,
                        name: team.departmentName,
                        head: team.teamHead,
                        budgetallocated: this.formatBudgetAmount(team.budgetAllocated),
                        utilizedBudget: this.formatBudgetAmount(team.utilizedBudget),
                        utilizedPercent: team.utilizedPercent || 0,
                        status: team.status,
                        statusClass: this.getStatusClass(team.status)
                    }));
                }
                this.isLoading = false;
            })
            .catch(error => {
                console.error('Error loading department data:', error);
                this.isLoading = false;
            });
    }

    handleYearChange(event) {
        const selectedYear = event.detail.value;
        this.selectedFiscalYear = selectedYear;
        this.loadDepartmentData();
    }

    loadDepartmentData() {
        this.isLoading = true;
        this.noBudgetAvailable = false;

        getDepartmentDataForHead({ fiscalYear: this.selectedFiscalYear })
            .then(data => {
                this.departmentId = data.departmentId;
                this.departmentBudgetId = data.departmentBudgetId;
                this.departmentName = data.name;
                this.departmentHeadName = data.departmentHead;
                this.teamName = data.teamName;
                this.numMembers = data.noOfMembers;
                this.region = data.region;
                this.departmentalBudgetName = data.departmentalBudgetName;
                this.departmentBudgetAmount = this.formatBudgetAmount(data.departmentBudgetAmount);
                this.departmentutilizedBudget = data.departmentutilizedBudget;
                this.departmentutilizedPercent = data.departmentutilizedPercent;
                this.YearlyBudget = this.formatBudgetAmount(data.YearlyBudget);
                this.budgetObjective = data.budgetObjective;
                this.expectedOutcome = data.expectedOutcome;

                if (!this.departmentBudgetId) {
                    this.noBudgetAvailable = true;
                    this.teamCards = [];
                    this.isLoading = false;
                    return;
                }

                return getSubDepartmentalBudgets({ departmentBudgetId: this.departmentBudgetId });
            })
            .then(teams => {
                if (teams) {
                    this.teamCards = teams.map(team => ({
                        id: team.departmentId,
                        name: team.departmentName,
                        head: team.teamHead,
                        budgetallocated: this.formatBudgetAmount(team.budgetAllocated),
                        utilizedBudget: this.formatBudgetAmount(team.utilizedBudget),
                        utilizedPercent: team.utilizedPercent || 0,
                        status: team.status,
                        statusClass: this.getStatusClass(team.status)
                    }));
                }
                this.isLoading = false;
            })
            .catch(error => {
                console.error('Error loading department data:', error);
                this.isLoading = false;
            });
    }

    get fiscalYearOptions() {
        return this.fiscalYears.map(year => ({
            label: year,
            value: year
        }));
    }

    getStatusClass(status) {
        switch ((status || '').toLowerCase()) {
            case 'draft':
                return 'slds-text-color_weak';
            case 'submitted':
                return 'slds-text-color_brand';
            case 'approved':
                return 'slds-text-color_success';
            case 'rejected':
                return 'slds-text-color_error';
            default:
                return '';
        }
    }

    formatBudgetAmount(amount) {
        if (!amount) return '0';
        if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`;
        if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
        if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
        return amount.toString();
    }

    get formattedUtilizedBudget() {
        return this.formatBudgetAmount(this.departmentutilizedBudget || 0);
    }

    get formattedUtilizedPercent() {
        return this.departmentutilizedPercent != null ? this.departmentutilizedPercent.toFixed(1) : '0';
    }

    openCreateTeamModal() {
        this.isModalOpen = true;
    }

    get isBudgetExhausted() {
        return this.departmentutilizedPercent >= 100;
    }

    handleModalClose() {
        this.isModalOpen = false;
    }

    handleTeamSaved() {
        this.loadDepartmentData();
        this.isModalOpen = false;
    }

    handleViewDetails(event) {
        this.selectedTeamId = event.currentTarget.dataset.teamId;
        this.showDashboard = false;
        this.showTeamDetails = true;
    }

    handleBackFromTeam() {
        this.selectedTeamId = null;
        this.showDashboard = true;
        this.showTeamDetails = false;
    }

    handleBackToDashboard() {
        this.noBudgetAvailable = false;
        this.showDashboard = true;
        this.teamCards = [];
    }

    handleViewObjective() {
        this.isObjectiveModalOpen = true;
    }

    closeObjectiveModal() {
        this.isObjectiveModalOpen = false;
    }
}