import { LightningElement, track } from 'lwc';

export default class CustomDashboard extends LightningElement {
    @track departmentList = [];
    @track subDepartmentList = [];

    handleDepartmentDataChange(event) {
        console.log('Department data received:', event.detail.departmentData);
        this.departmentList = event.detail.departmentData;
        
        // Optionally call refreshChart on the pie chart component
        const pieChart = this.template.querySelector('c-department-budget-pie-chart');
        if (pieChart) {
            pieChart.refreshChart();
        }
    }

    handleSubDepartmentDataChange(event) {
        console.log('Sub-Department data received:', event.detail.subDepartmentData);
        this.subDepartmentList = event.detail.subDepartmentData;
        
        // Optionally call refreshChart on the proposal pie chart component
        const proposalChart = this.template.querySelector('c-proposal-budget-pie-chart');
        if (proposalChart) {
            proposalChart.refreshChart();
        }
    }
}