import { LightningElement, track, wire, api } from 'lwc';
import saveDepartment from '@salesforce/apex/DepartmentController.saveDepartment';
import getUsersList from '@salesforce/apex/DepartmentController.getUsersList';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class AddDepartmentModal extends LightningElement {
    @api isOpen = false;
    @track isLoading = false;
    @track userOptions = [];
    
    @track departmentData = {
        name: '',
        departmentHeadId: '',
        teamName: '',
        noOfMembers: '',
        region: ''
    };

    // Wire to get users list
    @wire(getUsersList)
    wiredUsers({ error, data }) {
        if (data) {
            this.userOptions = data.map(user => ({
                label: user.Name,
                value: user.Id
            }));
        } else if (error) {
            console.error('Error loading users:', error);
            this.showToast('Error', 'Failed to load users list', 'error');
            this.userOptions = [];
        }
    }

    // Handle input changes
    handleInputChange(event) {
        const field = event.target.dataset.field;
        let value = event.target.value;

        // Handle number field validation
        if (field === 'noOfMembers') {
            // Allow only positive integers
            const numericValue = parseInt(value, 10);
            if (isNaN(numericValue) || numericValue < 1) {
                if (value !== '') {
                    this.showToast('Warning', 'Number of members must be at least 1', 'warning');
                }
                value = '';
            } else {
                value = numericValue.toString();
            }
        }

        // Handle text fields - trim whitespace
        if (field === 'name' || field === 'teamName' || field === 'region') {
            value = value.trim();
        }

        this.departmentData = { 
            ...this.departmentData, 
            [field]: value 
        };
    }

    // Handle modal close
    handleClose() {
        // Reset form data
        this.resetForm();
        
        // Dispatch close event to parent
        this.dispatchEvent(new CustomEvent('close'));
    }

    // Handle save operation
    async handleSave() {
        // Validate all required fields
        if (!this.validateForm()) {
            return;
        }

        this.isLoading = true;

        try {
            // Call Apex method to save department
            const departmentId = await saveDepartment({
                departmentName: this.departmentData.name,
                departmentHeadId: this.departmentData.departmentHeadId,
                teamName: this.departmentData.teamName,
                noOfMembers: parseInt(this.departmentData.noOfMembers, 10),
                region: this.departmentData.region
            });

            // Show success message
            this.showToast('Success', 'Department created successfully', 'success');
            
            // Dispatch success event with new department data
            const successEvent = new CustomEvent('departmentsaved', {
                detail: {
                    departmentId: departmentId,
                    departmentName: this.departmentData.name
                }
            });
            this.dispatchEvent(successEvent);

            // Reset form and close modal
            this.resetForm();

        } catch (error) {
            console.error('Error saving department:', error);
            let errorMessage = 'An unexpected error occurred';
            
            if (error.body && error.body.message) {
                errorMessage = error.body.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showToast('Error', errorMessage, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // Validate form data
    validateForm() {
        const requiredFields = [
            { field: 'name', label: 'Department Name' },
            { field: 'departmentHeadId', label: 'Department Head' },
            { field: 'teamName', label: 'Team Name' },
            { field: 'noOfMembers', label: 'Number of Members' },
            { field: 'region', label: 'Region' }
        ];
        
        // Check for empty required fields
        for (let fieldInfo of requiredFields) {
            const value = this.departmentData[fieldInfo.field];
            if (!value || value.toString().trim() === '') {
                this.showToast('Error', `${fieldInfo.label} is required`, 'error');
                return false;
            }
        }

        // Validate number of members
        const noOfMembers = parseInt(this.departmentData.noOfMembers, 10);
        if (isNaN(noOfMembers) || noOfMembers < 1) {
            this.showToast('Error', 'Number of members must be at least 1', 'error');
            return false;
        }

        // Validate department name length
        if (this.departmentData.name.length < 2) {
            this.showToast('Error', 'Department name must be at least 2 characters long', 'error');
            return false;
        }

        // Validate team name length
        if (this.departmentData.teamName.length < 2) {
            this.showToast('Error', 'Team name must be at least 2 characters long', 'error');
            return false;
        }

        return true;
    }

    // Reset form to initial state
    resetForm() {
        this.departmentData = {
            name: '',
            departmentHeadId: '',
            teamName: '',
            noOfMembers: '',
            region: ''
        };
        this.isLoading = false;
    }

    // Show toast messages
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant,
            mode: 'dismissable'
        }));
    }

    // Handle API property changes
    @api
    openModal() {
        this.isOpen = true;
        this.resetForm();
    }

    @api  
    closeModal() {
        this.isOpen = false;
        this.resetForm();
    }
}