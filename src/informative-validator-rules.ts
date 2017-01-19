import { AbstractControl } from '@angular/forms';

// Rule Interfaces

export interface AsynchronousValidationRule {
    getDescription(): string;

    getFeedback(): string;

    isValid(control: AbstractControl): Promise<boolean>;
}

export interface SynchronousValidationRule {
    getDescription(): string;

    getFeedback(): string;

    isValid(control: AbstractControl): boolean;
}

export interface AsynchronousValidationRuleSet {
    getRuleSet(): Array<AsynchronousValidationRule>;
}

export interface SynchronousValidationRuleSet {
    getRuleSet(): Array<SynchronousValidationRule>;
}

// Rules provided by this library

export class RequiredValidationRule implements SynchronousValidationRule {
    getDescription(): string {
        return "This field is required";
    }

    getFeedback(): string {
        return "You have not provided this item";
    }

    isValid(control: AbstractControl): boolean {
        if(control.value == null) return false;
        return control.value.toString().length > 0;
    }
}

export class EmailStructureValidationRule implements SynchronousValidationRule {
    getDescription(): string {
        return "Must be a valid Email address";
    }

    getFeedback(): string {
        return "This email address is invalid";
    }

    isValid(control: AbstractControl): boolean {
        if(control.value == null) return true;
        return control.value.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i) != null;
    }
}
