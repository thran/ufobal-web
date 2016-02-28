app.controller("tournamentRegistration", ["$scope", "dataService", "$location", function($scope, dataService, $location){
    $scope.registration = {};

    dataService.getLiveTournament().then(function (tournament) {
        $scope.tournament = tournament;
        $scope.registration.tournament = tournament.pk;
        dataService.getTeams().then(function (teams) {
            $scope.teams = teams;
        });
    });

    $scope.addTeam = function () {
        dataService.addTeam($scope.newTeam)
            .success(function () {
                $('#newTeam').foundation('reveal', 'close');
                $scope.newTeam = {};
            });
    };

    $scope.register = function () {
        $scope.error = null;
        dataService.addTeamOnTournament($scope.registration)
            .success(function (pk) {
                $scope.registration = {};
                $location.path("/turnaj/tym/" + pk);
            })
            .error(function (msg) {
                $scope.error = msg;
            });
    };

    var teamSelected = function(n, o){
        if (n) {
            $scope.registration.team = n.pk;
        }else{
            $scope.registration.team = null;
        }
    };

    $scope.$watch("team", teamSelected);
    $(document).foundation('reveal');
}]);


app.controller("tournamentTeam", ["$scope", "dataService", "$routeParams", function($scope, dataService, $routeParams){
    var pk = parseInt($routeParams.id);
    $scope.genders = genders;

    dataService.getLiveTournament().then(function (tournament) {
        $scope.tournament = tournament;
        dataService.getTeams().then(function () {
            angular.forEach(tournament.teamOnTournaments, function (team) {
                if (team.pk === pk) {
                    $scope.team = team;
                }
            });
        });
    });

    dataService.getPlayers().then(function (players) {
        $scope.players = players;
    });

    $scope.computeAge = function(){
        if ($scope.newPlayer.birthdate){
            var ageDifMs = Date.now() - Date.parse($scope.newPlayer.birthdate);
            var ageDate = new Date(ageDifMs);
            $scope.newPlayer.age = Math.abs(ageDate.getUTCFullYear() - 1970);
        }
    };

    $scope.addAttendance = function () {
        dataService.addAttendance($scope.player, $scope.team);
    };
    $scope.removeAttendance= function (player) {
        dataService.removeAttendance(player, $scope.team);
    };

    $scope.addPlayer = function () {
        $scope.newPlayer.full_name = $scope.newPlayer.nickname;
        dataService.addPlayer($scope.newPlayer)
            .success(function () {
                $('#newPlayer').foundation('reveal', 'close');
                dataService.addAttendance($scope.newPlayer, $scope.team);
                $scope.newPlayer = {};
            });
    };

    $scope.setCaptain = function () {
        dataService.setCaptain($scope.team).then(function () {
            $scope.captainMsg = "Uloženo";
        });
    };

    $scope.setDefaultGoalie = function () {
        dataService.setDefaultGoalie($scope.team).then(function () {
            $scope.captainMsg = "Uloženo";
        });
    };

    $(document).foundation('reveal');
}]);


app.controller("tournamentLive", ["$scope", "dataService", function($scope, dataService){

    dataService.getLiveTournament().then(function (tournament) {
        $scope.tournament = tournament;
        dataService.getTeams().then(function () {
        });
        dataService.getMatches($scope.tournament.pk).then(function (matches) {
        });
    });

    $scope.addMatch = function () {
        $scope.match.tournament = $scope.tournament;
        dataService.addMatch($scope.match).success(function () {
            $('#newMatch').foundation('reveal', 'close');
            $scope.match = null;
        });
    };

    $(document).foundation('reveal');
}]);

app.controller("tournamentMatch", ["$scope", "$routeParams", "dataService", "$timeout", "$sce", "$filter", "$interval",
                    function($scope, $routeParams, dataService, $timeout, $sce, $filter, $interval){
    var id = parseInt($routeParams.id);
    var tournamentId = parseInt($routeParams.tournamentId);
    $scope.timer = {};
    $scope.eventFilter = {type: "!shot"};
    $scope.cards = cards;

    $scope.$watch("showShots", function (n, o) {
        if (n){
            $scope.eventFilter.type = "";
        }else{
            $scope.eventFilter.type = "!shot";
        }
    });

    dataService.getMatches(tournamentId).then(function (matches) {
        dataService.getPlayers().then(function () {
            dataService.getTeams().then(function () {
                $timeout(function(){
                    angular.forEach(matches, function (match) {
                        if (id === match.pk){
                            $scope.match = match;
                            loadMatchLocalData();
                            prepareEvents(match);
                            $scope.match.halftimeLenght = $scope.match.tournament.halftime_length;
                            setTime(match);
                            match.team_one.color = "team-blue";
                            match.team_two.color = "team-red";
                            if (!match.referee){
                                $scope.startChangeReferee();
                            }
                        }
                    });
                });
            });
        });
    });

    var setTime = function (match) {
        var savedTime = localStorage.getItem("time" + match.pk);
        var time = savedTime ? savedTime : "00:00:00";
        angular.forEach(match.events, function (event) {
            if (event.time > time){
                time = event.time;
            }
        });
        var halftime_length = match.halftime_length ? moment.duration(match.halftime_length).asMilliseconds() : 0;
        time = moment.duration(time).asMilliseconds();
        match.halftime = match.length ? null : (match.halftime_length ?  2 : (time || match.start ? 1 : 0));
        $scope.timer.setTime(match.halftimeLenght * 60 * 1000 - time + halftime_length);
    };

    $scope.nextHalftime = function () {
        if ($scope.match.halftime === 1 ) {
            if (confirm("Opravdu přejít do druhého poločasu?")) {
                $scope.timer.stop();
                $scope.match.halftime_length = getTime();
                $scope.timer.setTime($scope.match.halftimeLenght * 60 * 1000);
                $scope.match.halftime = 2;
                $scope.match.events.push({ type: "halftime", time: $scope.match.halftime_length, saved: true});
                saveMatch($scope.match);
            }
        }else if ($scope.match.halftime === 2 ) {
            if (confirm("Opravdu chcete ukončit zápas?")) {
                $scope.timer.stop();
                $scope.match.length = getTime();
                $scope.match.halftime = null;
                $scope.match.end = moment().format(datetimeFormat);
                $scope.match.events.push({ type: "end", time: $scope.match.length, saved: true});
                saveMatch($scope.match);
            }
        }
    };

    var saveMatch = function (match) {
        match.changed = true;
        dataService.saveMatch(match).success(function () {
            match.changed = false;
        }).finally(saveDataLocally);
    };

    $scope.start = function (switchState) {
        var start = switchState ? $scope.timer.switchState: $scope.timer.start;
        if (!$scope.match.team_one.goalie || !$scope.match.team_two.goalie){
            alert("Není nastaven brankář.");
            return;
        }
        if ($scope.match.halftime === 0 ){
            if (confirm("Začít zápas?")){
                $scope.match.halftime = 1;
                $scope.match.start = moment().format(datetimeFormat);
                saveMatch($scope.match);
                start();
            }
        }else{
            start();
        }
    };

    $scope.changeReferee = function(){
        saveMatch($scope.match);
        $('#changeReferee').foundation('reveal', 'close');
    };

    $scope.newGoal = function (team) {
         $scope.goal = {
             team: team,
             time: getTime(),
             match: $scope.match
         };
        $('#newGoal').foundation('reveal', 'open');
    };

    $scope.newPenalty = function (team) {
         $scope.penalty = {
             team: team,
             time: getTime(),
             match: $scope.match,
             card: "yellow"
         };
        $('#newPenalty').foundation('reveal', 'open');
    };

    $scope.newGoalieChange = function (team) {
         if (!$scope.edit && $scope.match.halftime === null){
             return;
         }
         $scope.goalieChange = {
             team: team,
             time: getTime(),
             match: $scope.match
         };
        $('#newGoalieChange').foundation('reveal', 'open');
    };

    $scope.startChangeReferee = function () {
         if (!$scope.edit && $scope.match.halftime === null){
             return;
         }
        $('#changeReferee').foundation('reveal', 'open');
    };

    $scope.saveShot = function (team) {
         $scope.match.events.push({
            type: "shot",
            time: getTime(),
            data: {
                time: getTime(),
                match: $scope.match,
                team: team
            },
            saved: false,
            team: team
        });
        saveData();
    };

    $scope.saveGoal = function () {
        $scope.match.events.push({
            type: "goal",
            time: $scope.goal.time,
            data: $scope.goal,
            saved: false,
            team: $scope.goal.team
        });
        $('#newGoal').foundation('reveal', 'close');
        saveData();
    };

    $scope.savePenalty = function () {
        $scope.match.events.push({
            type: "penalty",
            time: $scope.penalty.time,
            data: $scope.penalty,
            team: $scope.penalty.team,
            saved: false
        });
        $('#newPenalty').foundation('reveal', 'close');
        saveData();
    };

    $scope.saveGoalieChange = function () {
        $scope.match.events.push({
            type: "goalieChange",
            time: $scope.goalieChange.time,
            data: $scope.goalieChange,
            team: $scope.goalieChange.team,
            saved: false
        });
        $scope.goalieChange.team.goalie = $scope.goalieChange.goalie;
        $('#newPenalty').foundation('reveal', 'close');
        saveData();
    };

    $scope.startEditGoal = function (event) {
        $scope.goal = event.data;
        $scope.goal.team = event.team;
        $scope.editEvent = event;
        $('#editGoal').foundation('reveal', 'open');
    };

    $scope.editGoal = function () {
        $scope.editEvent.data = $scope.goal;
        $scope.editEvent.saved = false;
        $scope.editEvent.time = $scope.goal.time;
        $scope.goal = null;
        saveData();
        $('#editGoal').foundation('reveal', 'close');
    };

    $scope.startEditPenalty = function (event) {
        $scope.penalty = event.data;
        $scope.penalty.team = event.team;
        $scope.editEvent = event;
        $('#editPenalty').foundation('reveal', 'open');
    };

    $scope.editPenalty = function () {
        $scope.editEvent.data = $scope.penalty;
        $scope.editEvent.saved = false;
        $scope.editEvent.time = $scope.penalty.time;
        $scope.penalty = null;
        saveData();
        $('#editPenalty').foundation('reveal', 'close');
    };
    
    $scope.remove = function (event) {
        if (confirm("Opravdu smazat?")) {
            if (event.data.pk) {
                dataService.removeEvent(event.data, event.type).success(function () {
                    $scope.match.events.splice($scope.match.events.indexOf(event), 1);
                });
            } else {
                $scope.match.events.splice($scope.match.events.indexOf(event), 1);
            }
            calculateEventCounts();
        }
    };

    var calculateEventCounts = function () {
        $scope.counts = { teamOne: {'shots': 0, goals: 0}, teamTwo: {'shots': 0, goals: 0}};
        if (!$scope.match){
            return;
        }
        angular.forEach($scope.match.events, function (event) {
            if (event.type === "goal" || event.type === "shot"){
                $scope.counts[event.team === $scope.match.team_one ? 'teamOne' : 'teamTwo'][event.type+"s"]++;
            }
        });
        return $scope.count;
    };

    var prepareEvents = function (match) {
        if (match.events){
            calculateEventCounts();
            return;
        }
        match.events = [];

        var cachedPKs = [];
        angular.forEach(JSON.parse(localStorage.getItem("events" + match.pk)), function (event) {
            event = angular.copy(event);
            event.team = dataService.getObject("teamontournaments", event.team);
            if (event.type === "goal"){
                event.data.shooter = dataService.getObject("players", event.data.shooter);
                event.data.assistance = dataService.getObject("players", event.data.assistance);
                event.data.team = event.team;
            }
            if (event.type === "shot"){
                event.data.shooter = dataService.getObject("players", event.data.shooter);
            }
            if (event.type === "penalty"){
                event.data.player = dataService.getObject("players", event.data.player);
            }
            if (event.type === "goalieChange"){
                event.data.goalie = dataService.getObject("players", event.data.goalie);
                event.data.match = match;
                event.data.team = event.team;
            }
            if (event.data.pk){
                cachedPKs.push(event.type + event.data.pk);
            }
            match.events.push(event);
        });
        saveData();

        angular.forEach(match.goals, function (goal) {
            if (cachedPKs.indexOf("goal" + goal.pk) > -1){
                return;
            }
            goal.shooter = dataService.getObject("players", goal.shooter);
            goal.assistance = dataService.getObject("players", goal.assistance);
            match.events.push({
                type: "goal",
                time: goal.time,
                data: goal,
                team: inTeam(match.team_one, goal.shooter) ? match.team_one : match.team_two,
                saved: true
            });
        });
        angular.forEach(match.shots, function (shot) {
            if (cachedPKs.indexOf("shot" + shot.pk) > -1){
                return;
            }
            shot.shooter = dataService.getObject("players", shot.shooter);
            match.events.push({
                type: "shot",
                time: shot.time,
                data: shot,
                team: dataService.getObject("teamontournaments", shot.team),
                saved: true
            });
        });
        angular.forEach(match.penalties, function (penalty) {
            if (cachedPKs.indexOf("penalty" + penalty.pk) > -1){
                return;
            }
            penalty.player = dataService.getObject("players", penalty.player);
            angular.forEach(cards, function (card) {
                if (card.id === penalty.card) {
                    penalty.cardText = card.text;
                }
            });
            match.events.push({
                type: "penalty",
                time: penalty.time,
                data: penalty,
                team: inTeam(match.team_one, penalty.player) ? match.team_one : match.team_two,
                saved: true
            });
        });
        angular.forEach($filter("orderBy")(match.goalies, "start"), function (goalie) {
            goalie.goalie = dataService.getObject("players", goalie.goalie);
            var team = inTeam(match.team_one, goalie.goalie) ? match.team_one : match.team_two;
            team.goalie = goalie.goalie;
            if (goalie.start === "00:00:00"){
                return;
            }
            match.events.push({
                type: "goalieChange",
                time: goalie.start,
                data: goalie,
                team: team,
                saved: true
            });

        });
        if (match.halftime_length) {
            match.events.push({ type: "halftime", time: match.halftime_length, saved: true});
        }
        if (match.length) {
            match.events.push({ type: "end", time: match.length, saved: true});
        }
        match.events = $filter("orderBy")(match.events, "time");
        calculateEventCounts();
    };

    var saveData = function () {
        calculateEventCounts();
        dataService.ping().success(function () {
            loadMatchLocalData();
            angular.forEach($scope.match.events, function (event) {
                if (!event.saved && !event.data.saving) {
                    if (event.type === "goalieChange"){
                        dataService.goalieChange(event.data).success(function () {
                            event.saved = true;
                        }).finally(saveDataLocally);
                    }else {
                        dataService.saveEvent(event.data, event.type).success(function () {
                            event.saved = true;
                            if (event.type === "goal"){
                                if (event.team === $scope.match.team_one){
                                    $scope.match.score_one++;
                                }else{
                                    $scope.match.score_two++;
                                }
                            }
                        }).finally(saveDataLocally);
                    }
                }
            });
        });
    };

    var getTime = function () {
        var ms = $scope.match.halftimeLenght * 60 * 1000 - Math.round($scope.timer.getTime());
        if ($scope.match.halftime === 2){
            ms = ms + moment.duration($scope.match.halftime_length).asMilliseconds();
        }
        return moment.utc(ms).format("HH:mm:ss");
    };

    $(document).foundation('reveal');

    var saveDataLocally = function(){
        localStorage.setItem("time" + $scope.match.pk, getTime());

        if ($scope.match && $scope.match.changed){
            var match = shallowCopy($scope.match);
            match.referee = $scope.match.referee.pk;
            localStorage.setItem("match" + $scope.match.pk, JSON.stringify(match));
        }else{
            localStorage.removeItem("match" + $scope.match.pk);
        }

        var toSave = [];
        angular.forEach($scope.match.events, function (event) {
            if (event.saved === false) {
                var eventPure = shallowCopy(event, true);
                eventPure.data = shallowCopy(event.data, true);
                toSave.push(eventPure);
            }
        });
        localStorage.setItem("events" + $scope.match.pk, JSON.stringify(toSave));
    };
    $interval(saveDataLocally, 5 * 1000);
    $interval(saveData, 15 * 1000);

    var loadMatchLocalData = function () {
        var match = localStorage.getItem("match" + $scope.match.pk);
        if (match){
            match = JSON.parse(match);
            angular.extend($scope.match, match);
            $scope.match.referee = dataService.getObject("players", match.referee);
            saveMatch($scope.match);
        }
    };
}]);
