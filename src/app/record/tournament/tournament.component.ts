import { Component, Input, numberAttribute } from '@angular/core';

@Component({
  selector: 'app-tournament',
  templateUrl: './tournament.component.html',
  styleUrls: ['./tournament.component.css']
})
export class TournamentComponent {
  @Input({transform: numberAttribute}) tournamentId?: number;

}
