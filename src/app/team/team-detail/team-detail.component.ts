import { Component, Input, numberAttribute } from '@angular/core';
import { ET, Team } from '../../models';
import { EntitiesService } from '../../entities.service';

@Component({
  selector: 'app-team-detail',
  templateUrl: './team-detail.component.html',
  styleUrls: ['./team-detail.component.css']
})
export class TeamDetailComponent {
  @Input({transform: numberAttribute}) teamId?: number;
  public team: Team | null = null;

  constructor(public entities: EntitiesService) {
  }

  ngOnInit(): void {
    this.entities.getEntity(ET.Team, this.teamId!).subscribe((team) => this.team = team as Team);
  }

}
