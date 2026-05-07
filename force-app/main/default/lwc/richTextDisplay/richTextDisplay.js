import { LightningElement, api } from 'lwc';

export default class RichTextDisplay extends LightningElement {
    @api content;
    
    renderedCallback() {
        const container = this.template.querySelector('.rich-text-container');
        if (container && this.content) {
            container.innerHTML = this.content;
        }
    }
}