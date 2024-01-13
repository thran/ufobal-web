import { Component, Input } from '@angular/core';
import { EntitiesService } from '../../entities.service';
import { ET, Team, Tournament } from '../../models';

@Component({
  selector: 'app-tournament-detail',
  templateUrl: './tournament-detail.component.html',
  styleUrls: ['./tournament-detail.component.css']
})
export class TournamentDetailComponent {
  @Input({transform: numberAttribute}) tournamentId?: number;
  @Input({transform: numberAttribute}) teamId?: number;
  public tournament: Tournament | null = null;

  constructor(public entities: EntitiesService) {
  }

  ngOnInit(): void {
    // this.entities.getEntity(ET.Tournament, this.tournamentId!).subscribe(
    //   (tournament) => this.tournament = tournament as Tournament;
    //   this.entities.getPlayersWithGoalStats().subscribe((players) => this.players = players);
    // );
  }


}
