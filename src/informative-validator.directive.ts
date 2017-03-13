import { Directive, ElementRef, OnInit, OnChanges, OnDestroy, Input, HostListener } from '@angular/core';
import { AbstractControl, NgControl } from '@angular/forms';
import { Observable, Subscription } from 'rxjs/Rx';

import { SynchronousValidationRule, AsynchronousValidationRule,
         SynchronousValidationRuleSet, AsynchronousValidationRuleSet } from './informative-validator-rules';

@Directive({
    selector: '[informative-validator]'
})
export class InformativeValidatorDirective implements OnInit, OnChanges, OnDestroy {
    private _inputElement: any;
    private _descriptionElement: any;
    private _feedbackElement: any;
    private _valid: boolean = false;
    private _initialised: boolean = false;
    private _typingTimer: Subscription;
    private _validationDelay: number = 1500;

    // The client component can either build a list of rules itself,
    // or pass in a defined ruleset. One approach is more flexible,
    // the other is more explicit and rigorous.
    syncRules: Array<SynchronousValidationRule>;
    asyncRules: Array<AsynchronousValidationRule>;

    syncRuleSet: SynchronousValidationRuleSet;
    asyncRuleSet: AsynchronousValidationRuleSet;

    @Input() hideFeedback: boolean = false;
    @Input() hideDescriptions: boolean = false;

    @Input() formControl: AbstractControl;

    descriptions: Array<string>;
    feedback: Array<string>;

    constructor(element: ElementRef) {
        this._inputElement = element.nativeElement;
    }

    public getValidationDelay(): number {
        return this._validationDelay;
    }

    public waitForInputFinish(callback: (result: number) => void): void{
        let validationDelay = this.getValidationDelay();
        if(this._typingTimer != null) {
            this._typingTimer.unsubscribe();
        }
        this._typingTimer = Observable.timer(validationDelay).subscribe(callback);
    }

    // Should be overriden for synchronous extensions
    public getSyncRules(): Array<SynchronousValidationRule> {
        let fromSet = this.syncRuleSet == null ? new Array<SynchronousValidationRule>() : this.syncRuleSet.getRuleSet();
        let fromList = this.syncRules == null ? new Array<SynchronousValidationRule>() : this.syncRules;
        return fromSet.concat(fromList);
    }

    // Should be overriden for asynchronous extensions
    public getAsyncRules(): Array<AsynchronousValidationRule> {
        let fromSet = this.asyncRuleSet == null ? new Array<AsynchronousValidationRule>() : this.asyncRuleSet.getRuleSet();
        let fromList = this.asyncRules == null ? new Array<AsynchronousValidationRule>() : this.asyncRules;
        return fromSet.concat(fromList);
    }

    ngOnInit(): void {
    }

    initialise(): void {
        this.buildDescriptions();
        this.displayDescriptions();
        this._initialised = true;
        this.valueUpdate();
    }

    ngOnChanges(): void {
        if(this.formControl == null) return;
        if(!this._initialised) this.initialise();
        this.formControl.valueChanges.subscribe(() => {
            this.setErrors();
            this.waitForInputFinish((result: number) => {
               this.valueUpdate();
            });
        });
    }

    @HostListener('blur') onBlur() {
        if(!this._initialised) return;
        if(this._typingTimer != null) {
            this._typingTimer.unsubscribe();
        }
        this.valueUpdate();
    }

    @HostListener('keyup.enter') onKeyUp() {
        if(!this._initialised) return;
        if(this._typingTimer != null) {
            this._typingTimer.unsubscribe();
        }
        this.valueUpdate();
    }

    valueUpdate(): void {
        this.validate().then((): void => {
            this.setErrors();
            if(this.shouldDisplayFeedback()) {
                this.displayFeedback();
            } else {
                this.clearFeedback();
            }
        });
    }

    ngOnDestroy(): void {
        if(this._typingTimer != null) {
            this._typingTimer.unsubscribe();
        }
        this.clearFeedback();
        this.clearDescriptions();
    }

    buildDescriptions(): void {
        let syncRules = this.getSyncRules();
        let asyncRules = this.getAsyncRules();
        this.descriptions = new Array<string>();
        for(let rule of syncRules) {
            if(rule.getDescription() != null) {
                this.descriptions.push(rule.getDescription());
            }
        }
        for(let rule of asyncRules) {
            if(rule.getDescription() != null) {
                this.descriptions.push(rule.getDescription());
            }
        }
    }

    setErrors(): void {
        let errors = this._valid ? null : { "customErrors": true };
        this.formControl.setErrors(errors);
    }

    clearErrors(): void {
        this.formControl.setErrors(null);
    }

    clearDescriptions(): void {
        if(this._descriptionElement == null) return;
        this._descriptionElement.parentElement.removeChild(this._descriptionElement);
        this._descriptionElement = null;
    }

    displayDescriptions(): void {
        if(this.hideDescriptions) return;
        let descriptionHtml = "<ul>";
        for(let item of this.descriptions) {
            descriptionHtml += "<li>" + item + "</li>";
        }
        descriptionHtml += "</ul>";

        this._descriptionElement = document.createElement('div');
        this._descriptionElement.className = "informative-validator-descriptions";
        this._descriptionElement.innerHTML = descriptionHtml;
        this._inputElement.parentNode.insertBefore(this._descriptionElement, this._inputElement.nextSibling);
    }

    clearFeedback(): void {
        if(this._feedbackElement == null) return;
        this._feedbackElement.parentElement.removeChild(this._feedbackElement);
        this._feedbackElement = null;
    }

    shouldDisplayFeedback(): boolean {
        return !(
            (this.feedback == null) ||
            (this.hideFeedback) ||
            (this.formControl == null) ||
            (this.formControl.untouched) ||
            (this.formControl.status === 'DISABLED') ||
            (this._valid)
        );
    }

    displayFeedback(): void {
        if(!this._initialised) return;
        this.clearFeedback();

        let feedbackHtml = "<ul>";
        for(let item of this.feedback) {
            feedbackHtml += "<li>" + item + "</li>";
        }
        feedbackHtml += "</ul>";

        this._feedbackElement = document.createElement('div');
        this._feedbackElement.className = "informative-validator-feedback";
        this._feedbackElement.innerHTML = feedbackHtml;
        this._inputElement.parentNode.insertBefore(this._feedbackElement, this._descriptionElement.nextSibling);
    }


    validate(): Promise<any> {
        let syncRules = this.getSyncRules();
        let asyncRules = this.getAsyncRules();
        this.feedback = new Array<string>();
        let promises = new Array<Promise<boolean>>();
        let valid = true;

        for(let rule of syncRules) {
            let ruleIsValid = rule.isValid(this.formControl);
            if(!ruleIsValid) {
                if(rule.getFeedback() != null) {
                    this.feedback.push(rule.getFeedback());
                }
                valid = false;
            }
        }

        if(!valid) { // There's no sense completing async validation if sync validation failed
            return new Promise((resolve) => {
                this._valid = valid;
                resolve();
            });
        }

        for(let rule of asyncRules) {
            promises.push(rule.isValid(this.formControl));
        }

        return Promise.all(promises).then((results) => {
            for(let key in results) {
                if(!results[key]) {
                    if(asyncRules[key].getFeedback() != null) {
                        this.feedback.push(asyncRules[key].getFeedback());
                    }
                    valid = false;
                }
            }

            return new Promise((resolve) => {
                this._valid = valid;
                resolve();
            });
        }).catch((error) => {
            this.feedback = new Array<string>();
            this.feedback.push("An unknown error occured during validation. Validation has failed.");
            return new Promise((resolve) => {
                this._valid = false;
                resolve();
            });
        });
    }
}
