import { LightningElement, api, track } from 'lwc';
import getProposalBudgets from '@salesforce/apex/customDashBoardController.getProposalBudgets';
import ChartJS from '@salesforce/resourceUrl/chartjs';
import { loadScript } from 'lightning/platformResourceLoader';

export default class proposalBudgetPieChart extends LightningElement {
    @api recordId;

    // Use getter/setter to detect changes in subDepartmentList
    _subDepartmentList = [];

    @api
    get subDepartmentList() {
        return this._subDepartmentList;
    }

    set subDepartmentList(value) {
        this._subDepartmentList = value || [];
        // Regenerate options whenever subDepartmentList changes
        this.generateDropdownOptions();
    }

    @track subDepartmentOptions = [];
    selectedSubDepartmentId;
    chartData = [];
    chart;
    chartjsInitialized = false;

    connectedCallback() {
        // Initial generation (though subDepartmentList might be empty initially)
        this.generateDropdownOptions();
    }

    renderedCallback() {
        if (this.chartjsInitialized) return;
        loadScript(this, ChartJS)
            .then(() => {
                this.chartjsInitialized = true;
                // Only fetch data if we have a selected sub-department
                if (this.selectedSubDepartmentId) {
                    this.fetchChartData();
                }
            })
            .catch(error => console.error('ChartJS load error', error));
    }

    @api
    refreshChart() {
        this.generateDropdownOptions();
        if (this.selectedSubDepartmentId) {
            this.fetchChartData();
        }
    }

    generateDropdownOptions() {
        console.log('Generating proposal dropdown options, subDepartmentList:', this._subDepartmentList);

        if (this._subDepartmentList && this._subDepartmentList.length > 0) {
            this.subDepartmentOptions = this._subDepartmentList.map(item => ({
                label: item.subDepartmentName,
                value: item.id
            }));

            // Only auto-select if we don't have a selection or if current selection is invalid
            if (!this.selectedSubDepartmentId ||
                !this.subDepartmentOptions.some(opt => opt.value === this.selectedSubDepartmentId)) {
                this.selectedSubDepartmentId = this.subDepartmentOptions[0].value;
            }

            // Fetch chart data if ChartJS is loaded
            if (this.chartjsInitialized && this.selectedSubDepartmentId) {
                this.fetchChartData();
            }
        } else {
            // Clear options if no sub-department data
            this.subDepartmentOptions = [];
            this.selectedSubDepartmentId = null;
            this.chartData = [];
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
        }
    }

    handleSubDepartmentChange(event) {
        this.selectedSubDepartmentId = event.detail.value;
        if (this.selectedSubDepartmentId) {
            this.fetchChartData();
        }
    }

    fetchChartData() {
        if (!this.selectedSubDepartmentId) return;

        getProposalBudgets({ departmentalBudgetId: this.selectedSubDepartmentId })
            .then(data => {
                this.chartData = data;
                this.renderChart();
            })
            .catch(error => {
                console.error('Error fetching proposal chart data:', error);
                this.chartData = [];
            });
    }

    renderChart() {
        const canvas = this.template.querySelector('canvas');
        if (!canvas || !window.Chart) return;
        const ctx = canvas.getContext('2d');
        if (this.chart) this.chart.destroy();

        if (!this.chartData || this.chartData.length === 0) {
            this.chart = new window.Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['No Data Available'],
                    datasets: [{
                        label: 'No Data',
                        data: [1],
                        backgroundColor: ['#e5e7eb'],
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y', 
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: () => 'No proposals available'
                            }
                        },
                        legend: {
                            display: false 
                        }
                    }
                }
            });
            return;
        }

        const labels = this.chartData.map(i => i.name);
        const approvedBudgets = this.chartData.map(i => i.approvedBudget || 0);
        const actualRevenues = this.chartData.map(i => i.actualRevenue || 0);
        const askedBudgets = this.chartData.map(i => i.askedBudget || 0);

        this.chart = new window.Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Asked Budget',
                        data: askedBudgets,
                        backgroundColor: '#f59e0b',
                        borderColor: '#d97706',
                        borderWidth: 1
                    },
                    {
                        label: 'Approved Budget',
                        data: approvedBudgets,
                        backgroundColor: '#10b981',
                        borderColor: '#059669',
                        borderWidth: 1
                    },
                    {
                        label: 'Actual Revenue',
                        data: actualRevenues,
                        backgroundColor: '#3b82f6',
                        borderColor: '#2563eb',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                indexAxis: 'y', 
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '₹' + value.toLocaleString();
                            }
                        }
                    },
                    y: {
                        ticks: {
                            maxRotation: 0,
                            minRotation: 0
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ₹${context.parsed.x.toLocaleString()}`;
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }


    // renderChart() {
    //     const canvas = this.template.querySelector('canvas');
    //     if (!canvas || !window.Chart) return;
    //     const ctx = canvas.getContext('2d');
    //     if (this.chart) this.chart.destroy();

    //     if (!this.chartData || this.chartData.length === 0) {
    //         this.chart = new window.Chart(ctx, {
    //             type: 'bar',
    //             data: {
    //                 labels: ['No Data Available'],
    //                 datasets: [{
    //                     label: 'No Data',
    //                     data: [1],
    //                     backgroundColor: ['#e5e7eb'],
    //                     borderWidth: 1
    //                 }]
    //             },
    //             options: {
    //                 indexAxis: 'y',
    //                 responsive: true,
    //                 maintainAspectRatio: false,
    //                 plugins: {
    //                     legend: { display: false }
    //                 }
    //             }
    //         });
    //         return;
    //     }

    //     const labels = this.chartData.map(i => i.name);
    //     const approvedBudgets = this.chartData.map(i => i.approvedBudget || 0);
    //     const actualRevenues = this.chartData.map(i => i.actualRevenue || 0);
    //     const askedBudgets = this.chartData.map(i => i.askedBudget || 0);

    //     this.chart = new window.Chart(ctx, {
    //         type: 'bar',
    //         data: {
    //             labels,
    //             datasets: [
    //                 {
    //                     label: 'Asked Budget',
    //                     data: askedBudgets,
    //                     backgroundColor: '#f59e0b',
    //                     borderColor: '#d97706',
    //                     borderWidth: 1
    //                 },
    //                 {
    //                     label: 'Approved Budget',
    //                     data: approvedBudgets,
    //                     backgroundColor: '#10b981',
    //                     borderColor: '#059669',
    //                     borderWidth: 1
    //                 },
    //                 {
    //                     label: 'Actual Revenue',
    //                     data: actualRevenues,
    //                     backgroundColor: '#3b82f6',
    //                     borderColor: '#2563eb',
    //                     borderWidth: 1
    //                 }
    //             ]
    //         },
    //         options: {
    //             indexAxis: 'y', 
    //             responsive: true,
    //             maintainAspectRatio: false,
    //             scales: {
    //                 x: {
    //                     stacked: true, 
    //                     beginAtZero: true,
    //                     ticks: {
    //                         callback: function (value) {
    //                             return '₹' + value.toLocaleString();
    //                         }
    //                     }
    //                 },
    //                 y: {
    //                     stacked: true, // Stack the bars
    //                     ticks: {
    //                         maxRotation: 0,
    //                         minRotation: 0
    //                     }
    //                 }
    //             },
    //             plugins: {
    //                 tooltip: {
    //                     callbacks: {
    //                         label: function (context) {
    //                             return `${context.dataset.label}: ₹${context.parsed.x.toLocaleString()}`;
    //                         }
    //                     }
    //                 },
    //                 legend: {
    //                     position: 'top',
    //                     labels: {
    //                         padding: 20,
    //                         usePointStyle: true
    //                     }
    //                 }
    //             }
    //         }
    //     });
    // }
}