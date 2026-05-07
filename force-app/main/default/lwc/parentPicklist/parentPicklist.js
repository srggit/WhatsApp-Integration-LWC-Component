import { LightningElement, track } from 'lwc';

export default class ParentPicklist extends LightningElement {
     selectedValue = '';
    
    picklistOptions = [
        { label: 'Show Input 1', value: 'input1' },
        { label: 'Show Input 2', value: 'input2' },
        { label: 'Show Input 3', value: 'input3' }
    ];

    handlePicklistChange(event) {
        this.selectedValue = event.detail.value;
    }
}