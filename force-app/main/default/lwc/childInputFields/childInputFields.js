import { LightningElement, api } from 'lwc';

export default class ChildInputFields extends LightningElement {
    @api selectedInput;

    get showInput1() {
        return this.selectedInput === 'input1';
    }

    get showInput2() {
        return this.selectedInput === 'input2';
    }

    get showInput3() {
        return this.selectedInput === 'input3';
    }

    get hasSelection() {
        return this.selectedInput && this.selectedInput !== '';
    }
}