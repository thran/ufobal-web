import { Component, Input, numberAttribute } from '@angular/core';
import { EntitiesService } from '../../entities.service';
import { TeamOnTournament, Tournament } from '../../models';

@Component({
  selector: 'app-tournament-detail',
  templateUrl: './tournament-detail.component.html',
  styleUrls: ['./tournament-detail.component.css']
})
export class TournamentDetailComponent {
  @Input({transform: numberAttribute}) tournamentId?: number;
  @Input({transform: numberAttribute}) teamId?: number;
  public tournament: Tournament | null = null;
  // public players: Player[] | null = null;
  public teams: { [pk: number]: TeamOnTournament } | null = null;
  public playerCount: number = 0;
  public goalCount: number = 0;

  public selectedTeam: TeamOnTournament | null = null;

  constructor(public entities: EntitiesService) {
  }

  ngOnInit(): void {
    console.log(this.teamId);
    this.entities.getTournament(this.tournamentId!).subscribe((tournament) => {
        this.tournament = tournament as Tournament;
        this.entities.getPlayersWithGoalStats().subscribe((players) => {
          this.prepareData();
        });
      }
    );
  }

  prepareData() {
    this.teams = {};
    for (const team of this.tournament!.team_on_tournaments!) {
      this.playerCount += team.players!.length;
      this.teams[team.pk] = team;
      team.goals_scored = 0;
      team.goals_received = 0;
      if (team.pk === this.teamId) {
        this.selectedTeam = team;
      }
    }

    for (const match of this.tournament!.matches!) {
      const teamOnePk = typeof match.team_one === "number" ? match.team_one : match.team_one.pk;
      const teamTwoPk = typeof match.team_two === "number" ? match.team_two : match.team_two.pk;
      this.teams[teamOnePk].goals_scored! += match.score_one;
      this.teams[teamTwoPk].goals_scored! += match.score_two;
      this.teams[teamOnePk].goals_received! += match.score_two;
      this.teams[teamTwoPk].goals_received! += match.score_one;
      this.goalCount += match.score_one + match.score_two;
    }
  }

  protected readonly NaN = NaN;
}
