import { Component, Input, numberAttribute } from '@angular/core';

@Component({
  selector: 'app-team-on-tournament',
  templateUrl: './team-on-tournament.component.html',
  styleUrls: ['./team-on-tournament.component.css']
})
export class TeamOnTournamentComponent {
  @Input({transform: numberAttribute}) tournamentId?: number;
  @Input({transform: numberAttribute}) teamId?: number;

}
