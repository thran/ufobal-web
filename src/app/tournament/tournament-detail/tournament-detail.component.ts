import { Component, Input, numberAttribute, ViewChild } from '@angular/core';
import { EntitiesService } from '../../entities.service';
import { Match, TeamOnTournament, Tournament } from '../../models';
import { SmartTableComponent } from '../../utils/table/smart-table.component';

@Component({
  selector: 'app-tournament-detail',
  templateUrl: './tournament-detail.component.html',
  styleUrls: ['./tournament-detail.component.css']
})
export class TournamentDetailComponent {
  @Input({transform: numberAttribute}) tournamentId?: number;
  @Input({transform: numberAttribute}) teamId?: number;
  @ViewChild('teamsTable') teamsTable: SmartTableComponent | null = null;
  @ViewChild('matchesTable') matchesTable: SmartTableComponent | null = null;

  public tournament: Tournament | null = null;
  // public players: Player[] | null = null;
  public teams: { [pk: number]: TeamOnTournament } | null = null;
  public playerCount: number = 0;
  public goalCount: number = 0;

  public selectedTeam: TeamOnTournament | null = null;

  constructor(public entities: EntitiesService) {
  }

  ngOnInit(): void {
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
        setTimeout(() => this.updateFilter());
      }
    }

    for (const match of this.tournament!.matches!) {
      this.teams[match.team_one.pk].goals_scored! += match.score_one;
      this.teams[match.team_two.pk].goals_scored! += match.score_two;
      this.teams[match.team_one.pk].goals_received! += match.score_two;
      this.teams[match.team_two.pk].goals_received! += match.score_one;
      this.goalCount += match.score_one + match.score_two;
    }
  }

  protected readonly NaN = NaN;

  updateFilter() {
    this.teamId = this.selectedTeam ? this.selectedTeam.pk : NaN;

    if (this.teamsTable) {
      this.teamsTable.filterRows((row: TeamOnTournament) => {
        return this.selectedTeam === null || row.pk === this.selectedTeam.pk;
      })
    }

    if (this.matchesTable) {
      this.matchesTable.filterRows((row: Match) => {
        return this.selectedTeam === null
          || row.team_one.pk === this.selectedTeam.pk
          || row.team_two.pk === this.selectedTeam.pk;
      });

    }
  }
}
