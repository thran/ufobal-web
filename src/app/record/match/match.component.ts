import { Component, Input, numberAttribute } from '@angular/core';

@Component({
  selector: 'app-match',
  templateUrl: './match.component.html',
  styleUrls: ['./match.component.css']
})
export class MatchComponent {
  @Input({transform: numberAttribute}) tournamentId ?: number;
  @Input({transform: numberAttribute}) matchId?: number;

}
