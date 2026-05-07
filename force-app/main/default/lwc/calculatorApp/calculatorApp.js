import { LightningElement } from 'lwc';

export default class CalculatorApp extends LightningElement {
    firstNumber = 0;
    secondNumber = 0;
    result = '';

    handleValuesChange(event) {
        this.firstNumber = event.detail.firstNumber;
        this.secondNumber = event.detail.secondNumber;
    }

    handleAdd() {
        const sum = this.firstNumber + this.secondNumber;
        this.result = sum.toString();
        this.showToast('Addition', `${this.firstNumber} + ${this.secondNumber} = ${sum}`, 'success');
    }

    handleSubtract() {
        const difference = this.firstNumber - this.secondNumber;
        this.result = difference.toString();
        this.showToast('Subtraction', `${this.firstNumber} - ${this.secondNumber} = ${difference}`, 'success');
    }

    handleMultiply() {
        const product = this.firstNumber * this.secondNumber;
        this.result = product.toString();
        this.showToast('Multiplication', `${this.firstNumber} × ${this.secondNumber} = ${product}`, 'success');
    }

    handleDivide() {
        if (this.secondNumber === 0) {
            this.result = 'Error: Division by zero';
            this.showToast('Error', 'Cannot divide by zero', 'error');
            return;
        }
        const quotient = this.firstNumber / this.secondNumber;
        this.result = quotient.toFixed(2);
        this.showToast('Division', `${this.firstNumber} ÷ ${this.secondNumber} = ${quotient.toFixed(2)}`, 'success');
    }

    showToast(title, message, variant) {
        // Toast notification would work in Salesforce environment
        // For demo purposes, we're just updating the result
        console.log(`${title}: ${message}`);
    }
}