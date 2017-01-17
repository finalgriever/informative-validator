import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InformativeValidatorDirective } from './informative-validator.directive';

@NgModule({
    declarations: [
        InformativeValidatorDirective
    ],
    imports: [
        FormsModule
    ],
    exports: [
        InformativeValidatorDirective
    ]
})
export class InformativeValidatorModule {}
