import { LightningElement, wire } from 'lwc';
import getYearlyBudgetData from '@salesforce/apex/YearlyBudgetControllers.getYearlyBudgetData';
import ChartJS from '@salesforce/resourceUrl/chartjs';
import { loadScript } from 'lightning/platformResourceLoader';

export default class YearlyBudgetChart extends LightningElement {
    chart;
    chartjsInitialized = false;
    chartData = [];
    hasRendered = false;
    isLoading = true;
    error = null;

    @wire(getYearlyBudgetData)
    wiredData({ error, data }) {
        this.isLoading = true;
        this.error = null;
        
        if (data) {
            this.chartData = data.map(item => ({
                year: item.Fiscal_Year__c,
                budget: item.Budget_Amount__c,
                utilizedPercent: item.Budget_Amount__c > 0
                    ? Math.round((item.Utilized_Budget__c / item.Budget_Amount__c) * 100)
                    : 0
            }));
            
            // Only render if we've already loaded ChartJS and the component is rendered
            if (this.chartjsInitialized && this.hasRendered) {
                this.renderChart();
            }
            this.isLoading = false;
        } else if (error) {
            console.error('Error fetching data', error);
            this.error = error;
            this.isLoading = false;
        }
    }

    renderedCallback() {
        if (this.hasRendered) return;
        this.hasRendered = true;

        // Only load ChartJS if not already loaded
        if (this.chartjsInitialized) {
            this.renderChart();
            return;
        }

        this.isLoading = true;
        loadScript(this, ChartJS)
            .then(() => {
                this.chartjsInitialized = true;
                this.isLoading = false;
                this.renderChart();
            })
            .catch(error => {
                console.error('Error loading ChartJS', error);
                this.error = error;
                this.isLoading = false;
            });
    }

    renderChart() {
        if (!this.chartData.length || !window.Chart || !this.hasRendered) return;

        const canvas = this.template.querySelector('canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        const labels = this.chartData.map(d => d.year);
        const budgetValues = this.chartData.map(d => d.budget);
        const utilizedValues = this.chartData.map(d => d.budget * d.utilizedPercent / 100);

        try {
            this.chart = new window.Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Budget Amount (₹)',
                            data: budgetValues,
                            backgroundColor: '#3b82f6',
                            borderRadius: 8
                        },
                        {
                            label: 'Utilized Amount (₹)',
                            data: utilizedValues,
                            backgroundColor: '#f97316',
                            borderRadius: 8
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: 20
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                },
                                color: '#333'
                            }
                        },
                        tooltip: {
                            backgroundColor: '#1e293b',
                            titleColor: '#f8fafc',
                            bodyColor: '#f8fafc',
                            borderColor: '#3b82f6',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    let value = context.parsed.y;
                                    return `${label}: ₹${value.toLocaleString('en-IN')}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Amount (₹)',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                },
                                color: '#1e293b'
                            },
                            ticks: {
                                color: '#475569',
                                callback: value => '₹' + value.toLocaleString('en-IN')
                            }
                        },
                        x: {
                            ticks: {
                                color: '#475569',
                                font: {
                                    size: 13
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error rendering chart:', error);
            this.error = error;
        }
    }


    disconnectedCallback() {
        // Clean up chart when component is removed from DOM
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    get showChart() {
        return !this.isLoading && !this.error && this.chartData.length > 0;
    }

    get showError() {
        return this.error && !this.isLoading;
    }

    get showSpinner() {
        return this.isLoading;
    }
}