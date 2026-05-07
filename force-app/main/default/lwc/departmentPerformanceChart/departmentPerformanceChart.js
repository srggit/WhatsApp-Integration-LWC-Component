import { LightningElement, api, wire } from 'lwc';
import getDepartmentalPerformance from '@salesforce/apex/DepartmentPerformanceChartController.getDepartmentalPerformance';
import ChartJS from '@salesforce/resourceUrl/chartjs';
import { loadScript } from 'lightning/platformResourceLoader';
import { refreshApex } from '@salesforce/apex'; // Add this import

export default class DepartmentPerformanceChart extends LightningElement {
    @api recordId;
    chart;
    chartData = [];
    chartjsInitialized = false;
    hasRendered = false;
    error;
    wiredResult; // Add this to store wired result

    @wire(getDepartmentalPerformance, { yearlyBudgetId: '$recordId' })
    wiredData(result) {
        this.wiredResult = result; // Store the wired result
        const { error, data } = result;
        
        if (data) {
            this.chartData = data;
            if (this.chartjsInitialized && this.hasRendered) {
                this.renderChart();
            }
        } else if (error) {
            console.error('Apex error:', error);
            this.error = error;
        }
    }

    // Add this public method for parent component to call
    @api
    async refreshChart() {
        try {
            await refreshApex(this.wiredResult);
        } catch (error) {
            console.error('Error refreshing performance chart:', error);
        }
    }

    renderedCallback() {
        if (this.hasRendered) return;
        this.hasRendered = true;

        if (!this.chartjsInitialized) {
            loadScript(this, ChartJS)
                .then(() => {
                    this.chartjsInitialized = true;
                    this.renderChart();
                    console.log('Current recordId:', this.recordId);
                })
                .catch(error => {
                    console.error('ChartJS load error:', error);
                    this.error = error;
                });
        } else {
            this.renderChart();
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
                        backgroundColor:  '#3b82f6'
                    },
                    {
                        label: 'Utilized Budget (₹)',
                        data: utilizedData,
                        backgroundColor:'#e75719ff'
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