import { LightningElement, api, track, wire } from 'lwc';
import getDepartments from '@salesforce/apex/DepartmentalBudgetChartController.getDepartments';
import getSubDepartmentBudgetsWithProposalCount from '@salesforce/apex/DepartmentalBudgetChartController.getSubDepartmentBudgetsWithProposalCount';
import ChartJS from '@salesforce/resourceUrl/chartjs';
import { loadScript } from 'lightning/platformResourceLoader';
import { refreshApex } from '@salesforce/apex'; // Add this import

export default class SubDepartmentPieChart extends LightningElement {
    @api recordId;
    @track departmentOptions = [];
    selectedDepartmentId;
    chartData = [];
    chart;
    chartjsInitialized = false;
    selectedDepartmentBudget = null;
    wiredDepartmentsResult; // Add this to store wired result

    @wire(getDepartments, { yearlyBudgetId: '$recordId' })
    wiredDepartments(result) {
        this.wiredDepartmentsResult = result; // Store the wired result
        const { error, data } = result;
        
        if (data && data.length > 0) {
            this.departmentOptions = data.map(item => ({
                label: item.name,
                value: item.id
            }));
            this.selectedDepartmentId = this.departmentOptions[0].value;
            this.fetchChartData();
        } else if (error) {
            console.error('Error loading departments:', error);
        }
    }

    // Add this public method for parent component to call
    @api
    async refreshChart() {
        try {
            // Refresh departments list first
            await refreshApex(this.wiredDepartmentsResult);
            
            // Then refresh chart data if we have a selected department
            if (this.selectedDepartmentId) {
                await this.fetchChartData();
            }
        } catch (error) {
            console.error('Error refreshing pie chart:', error);
        }
    }

    renderedCallback() {
        if (this.chartjsInitialized) return;
        loadScript(this, ChartJS)
            .then(() => {
                this.chartjsInitialized = true;
                if (this.selectedDepartmentId) this.fetchChartData();
            })
            .catch(error => console.error('ChartJS load error', error));
    }

    handleDepartmentChange(event) {
        this.selectedDepartmentId = event.detail.value;
        this.fetchChartData();
    }

    fetchChartData() {
        getSubDepartmentBudgetsWithProposalCount({ parentBudgetId: this.selectedDepartmentId })
            .then(data => {
                this.chartData = data;
                this.selectedDepartmentBudget = data.reduce((sum, item) => sum + (item.totalBudget || 0), 0);
                this.renderChart();
            })
            .catch(error => console.error('Error fetching chart data:', error));
    }

    renderChart() {
        const canvas = this.template.querySelector('canvas');
        if (!canvas || !window.Chart) return;
        const ctx = canvas.getContext('2d');
        if (this.chart) this.chart.destroy();

        // Filter out items with 0 total budget to avoid empty slices
        const filteredData = this.chartData.filter(item => (item.totalBudget || 0) > 0);
        
        // If no data has budget, show all items with a small default value
        const dataToShow = filteredData.length > 0 ? filteredData : this.chartData;

        const labels = dataToShow.map(i => i.label);
        const data = dataToShow.map(i => {
            const budget = i.totalBudget || 0;
            return budget > 0 ? budget : (filteredData.length === 0 ? 1 : 0);
        });
        const bgColors = this.generateColors(labels.length);

        this.chart = new window.Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    label: 'Total Budget',
                    data,
                    backgroundColor: bgColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: context => {
                                const index = context.dataIndex;
                                const item = dataToShow[index];
                                return [
                                    `${item.label}`,
                                    `Budget: ₹${item.totalBudget?.toLocaleString() || 0}`,
                                    `Utilized: ₹${item.utilized?.toLocaleString() || 0}`,
                                    `Proposals: ${item.proposals || 0}`
                                ];
                            }
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    generateColors(count) {
        const baseColors = [
            '#6366f1', '#f59e0b', '#10b981', '#ef4444', 
            '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
            '#f97316', '#64748b', '#a855f7', '#d946ef',            
            '#71729eff', '#b49f7dff', '#30715bff', '#936e6eff', 
            '#021330ff', '#17171aff', '#d61676ff', '#73d3c8ff',
            '#b27142ff', '#51698bff', '#765497ff', '#5c3263ff'
        ];
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        return colors;
    }
}