import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { AppRoutingModule, PageNotFoundComponent } from './app-routing.module';
import { HomeComponent } from './home/home.component';
import { FaqComponent } from './faq/faq.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { HallOfRecordsComponent } from './stats/hall-of-records/hall-of-records.component';
import { PlayerListComponent } from './player/player-list/player-list.component';
import { PlayerDetailComponent } from './player/player-detail/player-detail.component';
import { TeamListComponent } from './team/team-list/team-list.component';
import { TeamDetailComponent } from './team/team-detail/team-detail.component';
import { TournamentListComponent } from './tournament/tournament-list/tournament-list.component';
import { TournamentDetailComponent } from './tournament/tournament-detail/tournament-detail.component';
import { TournamentGroupsComponent } from './tournament/tournament-groups/tournament-groups.component';
import { StatsCanadaComponent } from './stats/stats-canada/stats-canada.component';
import { StatsGoaliesComponent } from './stats/stats-goalies/stats-goalies.component';
import { TournamentComponent } from './record/tournament/tournament.component';
import { RegisterComponent } from './record/register/register.component';
import { TeamOnTournamentComponent } from './record/team-on-tournament/team-on-tournament.component';
import { MatchComponent } from './record/match/match.component';
import { UserService } from './user/user.service';
import { HttpClientModule, HttpClientXsrfModule } from '@angular/common/http';
import { ToastrModule } from 'ngx-toastr';
import { UserComponent } from './user/user.component';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerComponent } from './utils/spinner/spinner.component';
import { NgbdSortableHeader, SmartTableComponent } from './utils/table/smart-table.component';
import { SortPipe } from './utils/sort.pipe';
import { BackDirective } from './utils/back.directive';
import { FilterPipe } from './utils/filter.pipe';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    FaqComponent,
    PrivacyPolicyComponent,
    HallOfRecordsComponent,
    PlayerListComponent,
    PlayerDetailComponent,
    TeamListComponent,
    TeamDetailComponent,
    TournamentListComponent,
    TournamentDetailComponent,
    TournamentGroupsComponent,
    StatsCanadaComponent,
    StatsGoaliesComponent,
    PageNotFoundComponent,
    TournamentComponent,
    RegisterComponent,
    TeamOnTournamentComponent,
    MatchComponent,
    UserComponent,
    SpinnerComponent,
    SmartTableComponent,
    SortPipe,
    BackDirective,
    FilterPipe,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    HttpClientXsrfModule.withOptions({
      cookieName: 'csrftoken',
      headerName: 'X-CSRFToken',
    }),
    ToastrModule.forRoot(),
    NgbModule,
    NgbdSortableHeader,
  ],
  providers: [
    UserService,
    SortPipe,
    BackDirective,
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
