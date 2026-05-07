// import { LightningElement } from 'lwc';
// import importExcelData from '@salesforce/apex/ExcelImportController.importExcelData';
// import SHEETJS from '@salesforce/resourceUrl/sheetjs';
// import { loadScript } from 'lightning/platformResourceLoader';
// import { ShowToastEvent } from 'lightning/platformShowToastEvent';

// export default class ExcelUploader extends LightningElement {
//     sheetJsInitialized = false;
//     file;

//     connectedCallback() {
//         if (!this.sheetJsInitialized) {
//             loadScript(this, SHEETJS).then(() => {
//                 this.sheetJsInitialized = true;
//             });
//         }
//     }

//     handleFileChange(event) {
//         this.file = event.target.files[0];
//     }

//     importToSalesforce() {
//         if (!this.file) return;

//         const reader = new FileReader();
//         reader.onload = (e) => {
//             const data = new Uint8Array(e.target.result);
//             const workbook = XLSX.read(data, { type: 'array' });

//             const accountSheet = workbook.Sheets['Accounts'];
//             const contactSheet = workbook.Sheets['Contacts'];
//             const opportunitySheet = workbook.Sheets['Opportunities'];

//             const accounts = XLSX.utils.sheet_to_json(accountSheet);
//             const contacts = XLSX.utils.sheet_to_json(contactSheet);
//             const opportunities = XLSX.utils.sheet_to_json(opportunitySheet);

//             importExcelData({ accounts, contacts, opportunities })
//                 .then(() => {
//                     this.showToast('Success', 'Data imported successfully', 'success');
//                 })
//                 .catch(error => {
//                     this.showToast('Error', error.body.message, 'error');
//                 });
//         };
//         reader.readAsArrayBuffer(this.file);
//     }

//     showToast(title, message, variant) {
//         this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
//     }
// }






import { LightningElement } from 'lwc';
import importExcelData from '@salesforce/apex/ExcelImportController.importExcelData';
import SHEETJS from '@salesforce/resourceUrl/Sheetjs';
import { loadScript } from 'lightning/platformResourceLoader';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ExcelUploader extends LightningElement {
    sheetJsInitialized = false;
    file;

    connectedCallback() {
        if (!this.sheetJsInitialized) {
            loadScript(this, SHEETJS).then(() => {
                this.sheetJsInitialized = true;
            }).catch(error => {
                this.showToast('Error', 'SheetJS failed to load', 'error');
                console.error(error);
            });
        }
    }

    handleFileChange(event) {
        this.file = event.target.files[0];
    }

    importToSalesforce() {
        if (!this.file) {
            this.showToast('Error', 'Please select an Excel file to upload', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                const accountSheet = workbook.Sheets['Accounts'];
                const contactSheet = workbook.Sheets['Contacts'];
                const opportunitySheet = workbook.Sheets['Opportunities'];

                if (!accountSheet || !contactSheet || !opportunitySheet) {
                    this.showToast('Error', 'Missing required sheets: Accounts, Contacts, or Opportunities', 'error');
                    return;
                }

                const accounts = XLSX.utils.sheet_to_json(accountSheet) || [];
                const contacts = XLSX.utils.sheet_to_json(contactSheet) || [];
                const opportunities = XLSX.utils.sheet_to_json(opportunitySheet) || [];

                importExcelData({ accounts, contacts, opportunities })
                    .then(() => {
                        this.showToast('Success', 'Data imported successfully', 'success');
                    })
                    .catch(error => {
                        const message = error?.body?.message || JSON.stringify(error);
                        this.showToast('Error', message, 'error');
                        console.error('Apex error:', error);
                    });

            } catch (err) {
                this.showToast('Error', 'Error reading Excel file', 'error');
                console.error(err);
            }
        };

        reader.readAsArrayBuffer(this.file);
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}