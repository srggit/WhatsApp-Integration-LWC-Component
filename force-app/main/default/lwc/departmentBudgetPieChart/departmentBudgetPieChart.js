import { LightningElement, api, track } from 'lwc';
import getSubDepartmentBudgets from '@salesforce/apex/customDashBoardController.getSubDepartmentBudgets';
import ChartJS from '@salesforce/resourceUrl/chartjs';
import { loadScript } from 'lightning/platformResourceLoader';

export default class departmentBudgetPieChart extends LightningElement {
    @api recordId;

    // Use getter/setter to detect changes in departmentList
    _departmentList = [];
    
    @api 
    get departmentList() {
        return this._departmentList;
    }
    
    set departmentList(value) {
        this._departmentList = value || [];
        // Regenerate options whenever departmentList changes
        this.generateDropdownOptions();
    }

    @track departmentOptions = [];
    selectedDepartmentId;
    chartData = [];
    chart;
    chartjsInitialized = false;

    connectedCallback() {
        // Initial generation (though departmentList might be empty initially)
        this.generateDropdownOptions();
    }

    renderedCallback() {
        if (this.chartjsInitialized) return;
        loadScript(this, ChartJS)
            .then(() => {
                this.chartjsInitialized = true;
                // Only fetch data if we have a selected department
                if (this.selectedDepartmentId) {
                    this.fetchChartData();
                }
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
        console.log('Generating dropdown options, departmentList:', this._departmentList);
        
        if (this._departmentList && this._departmentList.length > 0) {
            this.departmentOptions = this._departmentList.map(item => ({
                label: item.departmentName,
                value: item.id
            }));
            
            // Only auto-select if we don't have a selection or if current selection is invalid
            if (!this.selectedDepartmentId || 
                !this.departmentOptions.some(opt => opt.value === this.selectedDepartmentId)) {
                this.selectedDepartmentId = this.departmentOptions[0].value;
            }
            
            // Fetch chart data if ChartJS is loaded
            if (this.chartjsInitialized && this.selectedDepartmentId) {
                this.fetchChartData();
            }
        } else {
            // Clear options if no department data
            this.departmentOptions = [];
            this.selectedDepartmentId = null;
            this.chartData = [];
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
        }
    }

    handleDepartmentChange(event) {
        this.selectedDepartmentId = event.detail.value;
        if (this.selectedDepartmentId) {
            this.fetchChartData();
        }
    }

    dispatchSubDepartmentData() {
    if (this.chartData.length > 0) {
        const subDepartmentData = this.chartData.map(subDept => ({
            subDepartmentName: subDept.label,
            id: subDept.id || subDept.label // You might need to add ID to the SubDepartmentBudgetWrapper
        }));
        
        const event = new CustomEvent('subdepartmentdatachange', {
            detail: { subDepartmentData }
        });
        this.dispatchEvent(event);
    }
}

    fetchChartData() {
    if (!this.selectedDepartmentId) return;
    
    getSubDepartmentBudgets({ parentBudgetId: this.selectedDepartmentId })
        .then(data => {
            this.chartData = data;
            this.dispatchSubDepartmentData(); // Add this line
            this.renderChart();
        })
        .catch(error => {
            console.error('Error fetching chart data:', error);
            this.chartData = [];
        });
}

    renderChart() {
        const canvas = this.template.querySelector('canvas');
        if (!canvas || !window.Chart) return;
        const ctx = canvas.getContext('2d');
        if (this.chart) this.chart.destroy();

        const filteredData = this.chartData.filter(item => (item.totalBudget || 0) > 0);
        const dataToShow = filteredData.length > 0 ? filteredData : this.chartData;

        // Handle case where there's no data
        if (!dataToShow || dataToShow.length === 0) {
            // Create a placeholder chart or hide the canvas
            return;
        }

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
                                    `Utilized: ₹${item.utilized?.toLocaleString() || 0}`
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