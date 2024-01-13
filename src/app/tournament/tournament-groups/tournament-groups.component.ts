import { Component, Input, numberAttribute } from '@angular/core';

@Component({
  selector: 'app-tournament-groups',
  templateUrl: './tournament-groups.component.html',
  styleUrls: ['./tournament-groups.component.css']
})
export class TournamentGroupsComponent {
  @Input({transform: numberAttribute}) tournamentId?: number;
}
