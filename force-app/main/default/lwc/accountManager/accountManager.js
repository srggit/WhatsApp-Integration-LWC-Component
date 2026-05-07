import { LightningElement, track } from 'lwc';

export default class AccountManager extends LightningElement {

    @track showEditor = false;

    fields = ['Name','Phone','Industry'];

    openCreate(){
        this.showEditor = true;
    }

    handleSuccess(){
        this.showEditor = false;
    }

    handleCancel(){
        this.showEditor = false;
    }

}