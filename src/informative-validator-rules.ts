import { AbstractControl } from '@angular/forms';

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
