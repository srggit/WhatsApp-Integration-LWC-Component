import { LightningElement, wire, api } from 'lwc';
import getVarianceData from '@salesforce/apex/YearlyBudgetControllers.getVarianceData';
import ChartJS from '@salesforce/resourceUrl/chartjs';
import { loadScript } from 'lightning/platformResourceLoader';
import { refreshApex } from '@salesforce/apex';

export default class VarianceHeatmap extends LightningElement {
    chart;
    chartjsInitialized = false;
    varianceData = [];
    hasRendered = false;
    isLoading = true;
    error = null;
    wiredVarianceResult;
    renderRequested = false;

    // Public method to refresh chart data
    @api
    refreshChart() {
        return this.refreshData();
    }

    refreshData() {
        this.isLoading = true;
        return refreshApex(this.wiredVarianceResult)
            .then(() => {
                this.isLoading = false;
                this.requestRender();
            });
    }



    @wire(getVarianceData)
    wiredData(result) {
        this.wiredVarianceResult = result;
        const { data, error } = result;

        if (error) {
            console.error('Error fetching variance data', error);
            this.error = error;
            this.varianceData = [];
            this.isLoading = false;
            return;
        }
        if (data) {
            this.varianceData = data;
            this.error = null;
            this.isLoading = false;
            this.requestRender();
        }
    }


    // Centralized render request handler
    requestRender() {
        if (this.chartjsInitialized && this.hasRendered) {
            this.renderChart();
        } else {
            this.renderRequested = true;
        }
    }

    renderedCallback() {
        if (this.hasRendered) return;
        this.hasRendered = true;

        if (this.chartjsInitialized) {
            if (this.renderRequested) {
                this.renderChart();
                this.renderRequested = false;
            }
            return;
        }

        this.isLoading = true;
        loadScript(this, ChartJS)
            .then(() => {
                console.log('ChartJS loaded successfully');
                this.chartjsInitialized = true;
                this.isLoading = false;
                if (this.renderRequested) {
                    this.renderChart();
                    this.renderRequested = false;
                }
            })
            .catch(error => {
                console.error('ChartJS failed to load', error);
                this.error = error;
                this.isLoading = false;
            });
    }

    renderChart() {
        if (!this.varianceData.length || !window.Chart || !this.hasRendered) {
            console.log('Skipping render - missing requirements');
            return;
        }

        const canvas = this.template.querySelector('.chart-canvas');
        if (!canvas) {
            console.log('Canvas element not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.log('Could not get canvas context');
            return;
        }

        if (this.chart) {
            console.log('Destroying previous chart instance');
            this.chart.destroy();
            this.chart = null;
        }

        const labels = this.varianceData.map(d => d.year);
        const budget = this.varianceData.map(d => d.budget);
        const utilized = this.varianceData.map(d => d.utilized);

        const utilizationPercentages = this.varianceData.map(d => {
            return d.budget > 0 ? Math.round((d.utilized / d.budget) * 10000) / 100 : 0;
        });

        const bgColors = utilizationPercentages.map(utilization => {
            if (utilization === 0) return '#94a3b8';
            else if (utilization < 70) return '#f87171';
            else if (utilization >= 70 && utilization < 85) return '#fbbf24';
            else if (utilization >= 85 && utilization < 95) return '#34d399';
            else if (utilization >= 95 && utilization <= 100) return '#10b981';
            else return '#dc2626';
        });

        try {
            this.chart = new window.Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Budget Utilization (%)',
                        data: utilizationPercentages,
                        backgroundColor: bgColors,
                        borderColor: '#ffffff',
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const i = context.dataIndex;
                                    const utilization = utilizationPercentages[i];
                                    return [
                                        `Year: ${labels[i]}`,
                                        `Budget: ₹${budget[i]?.toLocaleString() || '0'}`,
                                        `Utilized: ₹${utilized[i]?.toLocaleString() || '0'}`,
                                        `Utilization: ${utilization}%`
                                    ];
                                }
                            }
                        },
                        legend: {
                            display: true,
                            position: 'right',
                            labels: {
                                boxWidth: 20,
                                padding: 15
                            }
                        }
                    }
                }
            });
            console.log('Doughnut chart successfully rendered');
        } catch (error) {
            console.error('Error rendering chart:', error);
            this.error = error;
        }
    }


    disconnectedCallback() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    get showChart() {
        return !this.isLoading && !this.error && this.varianceData.length > 0;
    }

    get showError() {
        return this.error && !this.isLoading;
    }

    get showSpinner() {
        return this.isLoading;
    }
}