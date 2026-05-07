import { LightningElement, track } from 'lwc';
import fetchOrdersFromOrgA from '@salesforce/apex/OrgAOrderFetcher.fetchOrdersFromOrgA';
import fetchAccountsFromOrgA from '@salesforce/apex/OrgAOrderFetcher.fetchAccountsFromOrgA';
export default class OrgAAccountOrderFetcher extends LightningElement {
     @track accountOptions = [];
    @track selectedAccountId = '';
    @track error;
    @track orders;
    columns = [
        { label: 'Order Name', fieldName: 'Name' },
        { label: 'Order Number', fieldName: 'OrderNumber'},
        { label: 'Status', fieldName: 'Status' },
        { label: 'Effective Date', fieldName: 'EffectiveDate', type: 'date' },
        { label: 'Total Amount', fieldName: 'TotalAmount', type: 'currency' }
    ];
 // Fetch all Accounts when component loads
    connectedCallback() {
        this.loadAccounts();
    }

    async loadAccounts() {
        try {
            const accounts = await fetchAccountsFromOrgA();
            this.accountOptions = accounts.map(acc => ({
                label: acc.Name,
                value: acc.Id
            }));
        } catch (error) {
            this.error = 'Error fetching accounts: ' + (error.body ? error.body.message : error);
            console.error(error);
        }
    }

    async handleAccountChange(event) {
        this.selectedAccountId = event.detail.value;
        this.orders = [];
        this.error = null;
        try {
            this.orders = await fetchOrdersFromOrgA({ accountId: this.selectedAccountId });
            if (!this.orders.length) {
                this.error = 'No Orders found for this Account in Org A.';
            }
        } catch (error) {
            this.error = 'Error fetching orders: ' + (error.body ? error.body.message : error);
            console.error(error);
        }
    }
}