import { LightningElement, api } from 'lwc';

export default class CalculatorInputs extends LightningElement {
    firstNumber = 0;
    secondNumber = 0;

    handleFirstNumberChange(event) {
        this.firstNumber = parseFloat(event.target.value) || 0;
        this.dispatchValuesEvent();
    }

    handleSecondNumberChange(event) {
        this.secondNumber = parseFloat(event.target.value) || 0;
        this.dispatchValuesEvent();
    }

    dispatchValuesEvent() {
        const valueChangeEvent = new CustomEvent('valueschange', {
            detail: {
                firstNumber: this.firstNumber,
                secondNumber: this.secondNumber
            }
        });
        this.dispatchEvent(valueChangeEvent);
    }

    @api
    getFirstNumber() {
        return this.firstNumber;
    }

    @api
    getSecondNumber() {
        return this.secondNumber;
    }
}