import { api,track,wire ,LightningElement } from 'lwc';
import Logo1 from '@salesforce/resourceUrl/NambiarLogo1';
import Logo2 from '@salesforce/resourceUrl/NambiarLogo2';
import getTermsAndConditions from '@salesforce/apex/BookingFormController.getTermsAndConditions';


export default class BookingForm extends LightningElement {
    logoUrl1=Logo1;
    logoUrl2=Logo2;
    @track termsText;

    @wire(getTermsAndConditions)
    wiredTerms({ error, data }) {
        if (data) {
            this.termsText = data;
        } else if (error) {
            console.error('Error fetching terms:', error);
        }
    }   

    coApplicants = [
        this.createNewApplicant()
    ];

    addCoApplicant() {
        this.coApplicants = [...this.coApplicants, this.createNewApplicant()];
    }

    createNewApplicant() {
        const uniqueId = Date.now() + Math.random();
        return {
            id: uniqueId,
            name: '',
            incomeGroupName: 'incomeGroup_' + uniqueId,
            industryGroupName: 'industryGroup_' + uniqueId
        };
    }

get hasMultipleCoApplicants() {
    return this.coApplicants.length > 1;
}

removeCoApplicant(event) {
    const idToRemove = event.target.dataset.id;
    this.coApplicants = this.coApplicants.filter(applicant => applicant.id != idToRemove);
}

 openAadharFilePicker() {
        this.template.querySelector('input[data-label="Aadhar Card"]').click();
    }

    openPanFilePicker() {
        this.template.querySelector('input[data-label="Pan Card"]').click();
    }

    openPassportFilePicker() {
        this.template.querySelector('input[data-label="Passport Copy (For NRI)"]').click();
    }

    handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            console.log(`Selected file for ${event.target.dataset.label}: ${file.name}`);
        }
    }
    

    
}