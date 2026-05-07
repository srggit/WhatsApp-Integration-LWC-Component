import { LightningElement, wire, track } from 'lwc';
import getDepartmentalPerformance from '@salesforce/apex/customDashBoardController.getDepartmentalPerformance';
import getAvailableFiscalYears from '@salesforce/apex/customDashBoardController.getAvailableFiscalYears';
import ChartJS from '@salesforce/resourceUrl/chartjs';
import { loadScript } from 'lightning/platformResourceLoader';

export default class DepartmentPerformanceChart extends LightningElement {
    @track fiscalYearOptions = [];
    @track selectedYear;
    chart;
    chartData = [];
    chartjsInitialized = false;
    hasRendered = false;

    connectedCallback() {
        getAvailableFiscalYears()
            .then(data => {
                this.fiscalYearOptions = data.map(item => ({
                    label: item.Fiscal_Year__c,
                    value: item.Id
                }));

                // Auto-select first fiscal year
                if (this.fiscalYearOptions.length > 0) {
                    this.selectedYear = this.fiscalYearOptions[0].value;
                    this.loadChartData(this.selectedYear);
                }
            })
            .catch(error => {
                console.error('Error loading fiscal years:', error);
            });
    }

    handleYearChange(event) {
        this.selectedYear = event.detail.value;
        this.loadChartData(this.selectedYear);
    }

    dispatchDepartmentData() {
    if (this.chartData.length > 0) {
        const departmentData = this.chartData.map(dept => ({
            departmentName: dept.label,
            id: dept.id || dept.label // You might need to include department ID in your Apex method
        }));
        
        const event = new CustomEvent('departmentdatachange', {
            detail: { departmentData }
        });
        this.dispatchEvent(event);
    }
}

    loadChartData(yearlyBudgetId) {
    getDepartmentalPerformance({ yearlyBudgetId })
        .then(data => {
            this.chartData = data;
            this.dispatchDepartmentData(); // Add this line
            if (this.chartjsInitialized && this.hasRendered) {
                this.renderChart();
            }
        })
        .catch(error => {
            console.error('Error loading chart data:', error);
        });
}

    renderedCallback() {
        if (this.hasRendered) return;
        this.hasRendered = true;

        if (!this.chartjsInitialized) {
            loadScript(this, ChartJS)
                .then(() => {
                    this.chartjsInitialized = true;
                    if (this.chartData.length) {
                        this.renderChart();
                    }
                })
                .catch(error => {
                    console.error('ChartJS load error:', error);
                });
        }
    }

    renderChart() {
        if (!this.chartData.length || !window.Chart) return;

        const canvas = this.template.querySelector('canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (this.chart) this.chart.destroy();

        const labels = this.chartData.map(d => d.label);
        const budgetData = this.chartData.map(d => d.budget);
        const utilizedData = this.chartData.map(d => d.utilized);

        this.chart = new window.Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Budget (₹)',
                        data: budgetData,
                        backgroundColor: '#3b82f6'
                    },
                    {
                        label: 'Utilized Budget (₹)',
                        data: utilizedData,
                        backgroundColor: '#e75719ff'
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ₹${context.raw}`;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Department-wise Budget vs Utilized'
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Amount (₹)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Department'
                        }
                    }
                }
            }
        });
    }
}