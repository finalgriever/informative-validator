import { Directive, ElementRef, OnInit, OnChanges, OnDestroy, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

import { SynchronousValidationRule, AsynchronousValidationRule,
         SynchronousValidationRuleSet, AsynchronousValidationRuleSet } from './informative-validator-rules';

@Directive({
    selector: '[informative-validator]'
})
export class InformativeValidatorDirective implements OnInit, OnChanges, OnDestroy {
    private _inputElement: any;
    private _descriptionElement: any;
    private _feedbackElement: any;
    private _initialised: boolean = false;
    private _valid: boolean = false;

    // The client component can either build a list of rules itself,
    // or pass in a defined ruleset. One approach is more flexible,
    // the other is more explicit and rigorous.
    @Input() syncRules: Array<SynchronousValidationRule>;
    @Input() asyncRules: Array<AsynchronousValidationRule>;

    @Input() syncRuleSet: SynchronousValidationRuleSet;
    @Input() asyncRuleSet: AsynchronousValidationRuleSet;

    @Input() hideFeedback: boolean = false;
    @Input() hideDescriptions: boolean = false;

    @Input() validationControl: AbstractControl;

    descriptions: Array<string>;
    feedback: Array<string>;

    constructor(element: ElementRef) {
        this._inputElement = element.nativeElement;
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
        this._initialised = true;
        this.buildDescriptions();
        this.displayDescriptions();
    }

    ngOnChanges(): void {
        if(!this._initialised) return;
        this.validate().then(() => {
            if(this.shouldDisplayFeedback()) {
                this.setErrors();
            } else {
                this.clearErrors();
            }
        });
    }

    ngOnDestroy(): void {
        this.clearFeedback();
        this.clearDescriptions();
    }

    buildDescriptions(): void {
        let syncRules = this.getSyncRules();
        let asyncRules = this.getAsyncRules();
        this.descriptions = new Array<string>();
        for(let rule of syncRules) {
            this.descriptions.push(rule.getDescription());
        }
        for(let rule of asyncRules) {
            this.descriptions.push(rule.getDescription());
        }
    }

    setErrors(): void {
        this.validationControl.setErrors({ "customErrors": true });
        this.displayFeedback();
    }

    clearErrors(): void {
        this.validationControl.setErrors({});
        this.clearFeedback();
    }

    clearDescriptions(): void {
        if(this._descriptionElement == null) return;
        this._descriptionElement.parentElement.removeChild(this._descriptionElement);
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
    }

    shouldDisplayFeedback(): boolean {
        if(this.feedback == null) {
            return false;
        }
        if(!this._initialised) {
            return false;
        }
        if(this.hideFeedback) {
            return false;
        }
        if(this.validationControl.untouched) {
            return false;
        }
        if(this._valid) {
            return false;
        }
        return true;
    }

    displayFeedback(): void {
        this.clearFeedback();

        let feedbackHtml = "<ul>";
        for(let item of this.feedback) {
            feedbackHtml += "<li>" + item + "</li>";
        }
        feedbackHtml += "</ul>";

        this._feedbackElement = document.createElement('div');
        this._feedbackElement.className = "informative-validator-feedback";
        this._feedbackElement.innerHTML = feedbackHtml;
        this._inputElement.parentNode.insertBefore(this._descriptionElement, this._descriptionElement.nextSibling);
    }


    validate(): Promise<any> {
        let syncRules = this.getSyncRules();
        let asyncRules = this.getAsyncRules();
        this.feedback = new Array<string>();
        let promises = new Array<Promise<boolean>>();
        let valid = true;

        for(let rule of syncRules) {
            let ruleIsValid = rule.isValid(this.validationControl);
            if(!ruleIsValid) {
                this.feedback.push(rule.getFeedback());
            }
            valid = valid && rule.isValid(this.validationControl);
        }

        if(!valid) { // There's no sense completing async validation if sync validation failed
            return new Promise((resolve) => {
                this._valid = valid;
                resolve();
            });
        }

        for(let rule of asyncRules) {
            promises.push(rule.isValid(this.validationControl));
        }

        return Promise.all(promises).then((results) => {
            for(let key in results) {
                if(!results[key]) {
                    this.feedback.push(asyncRules[key].getDescription());
                }
                valid = valid && results[key];
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

// Usage:
// 
// <div [informative-validator] syncRules="myListOfSyncRules" asyncRules="myListOfAsyncRules">
//     <input type="text" />
// </div>
//
// or
//
// <div [informative-validator] syncRuleSet="instanceOfASyncRuleset" asyncRuleSet="instanceOfAnAsyncRuleset">
//     <input type="text" />
// </div>
//
// Alternatively, see the read me on how to easily extend this directive
// to create your own, more expressive validation directive.
//
// All you need is one decoration, and two functions ;)
