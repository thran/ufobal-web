import { Component, Input, numberAttribute } from '@angular/core';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  @Input({transform: numberAttribute}) tournamentId?: number;

}
