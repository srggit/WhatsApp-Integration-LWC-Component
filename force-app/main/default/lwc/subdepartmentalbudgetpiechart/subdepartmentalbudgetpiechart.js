// subDepartmentPieChart.js
import { LightningElement, api, track } from 'lwc';
import getSubDepartmentBudgetsWithProposalCount from '@salesforce/apex/DepartmentalBudgetChartController.getSubDepartmentBudgetsWithProposalCount';
import ChartJS from '@salesforce/resourceUrl/chartjs';
import { loadScript } from 'lightning/platformResourceLoader';

export default class SubDepartmentPieChart extends LightningElement {
    @api recordId;

    @api departmentList = []; // Receive from parent

    @track departmentOptions = [];
    selectedDepartmentId;
    chartData = [];
    chart;
    chartjsInitialized = false;

    connectedCallback() {
        this.generateDropdownOptions();
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

    @api
    refreshChart() {
        this.generateDropdownOptions();
        if (this.selectedDepartmentId) {
            this.fetchChartData();
        }
    }

    generateDropdownOptions() {
        if (this.departmentList && this.departmentList.length > 0) {
            this.departmentOptions = this.departmentList.map(item => ({
                label: item.departmentName,
                value: item.id
            }));
            this.selectedDepartmentId = this.departmentOptions[0].value;
            this.fetchChartData();
        }
    }

    handleDepartmentChange(event) {
        this.selectedDepartmentId = event.detail.value;
        this.fetchChartData();
    }

    fetchChartData() {
        getSubDepartmentBudgetsWithProposalCount({ parentBudgetId: this.selectedDepartmentId })
            .then(data => {
                this.chartData = data;
                this.renderChart();
            })
            .catch(error => console.error('Error fetching chart data:', error));
    }

    renderChart() {
        const canvas = this.template.querySelector('canvas');
        if (!canvas || !window.Chart) return;
        const ctx = canvas.getContext('2d');
        if (this.chart) this.chart.destroy();

        const filteredData = this.chartData.filter(item => (item.totalBudget || 0) > 0);
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
            '#f97316', '#64748b', '#a855f7', '#d946ef'
        ];
        return Array.from({ length: count }, (_, i) => baseColors[i % baseColors.length]);
    }
}