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
    });

    dataService.getMatches().then(function (matches) {
        //dataService.getObject("matchs", )
    });

    $scope.addMatch = function () {
        $scope.match.tournament = $scope.tournament;
        dataService.addMatch($scope.match).success(function () {
            $('#newMatch').foundation('reveal', 'close');
        });
    };

    $(document).foundation('reveal');
}]);

app.controller("tournamentMatch", ["$scope", "$routeParams", "dataService", function($scope, $routeParams, dataService){
    var id = parseInt($routeParams.id);
    $scope.timer = {};

    dataService.getMatches().then(function (matches) {
        angular.forEach(matches, function (match) {
            if (id === match.pk){
                $scope.match = match;
                $scope.match.halftimeLenght = 8;
                $scope.timer.setTime($scope.match.halftimeLenght * 60 * 1000);
                $scope.match.halftime = 1;
            }
        });
    });

    $scope.nextHalftime = function () {
        if ($scope.match.halftime === 1 ) {
            if (confirm("Opravdu přejít do druhého poločasu?")) {
                $scope.timer.stop();
                $scope.match.halftimeAt = getTime();

                $scope.timer.setTime($scope.match.halftimeLenght * 60 * 1000);
                $scope.match.halftime = 2;
            }
        }else if ($scope.match.halftime === 2 ) {
            if (confirm("Opravdu chcete ukončit zápas?")) {
                $scope.match.halftime = null;
                $scope.timer.stop();
                $scope.match.endAt = getTime();
            }
        }
    };

    var getTime = function () {
        if ($scope.match.halftime === 1){
            return $scope.match.halftimeLenght * 60 - Math.round($scope.timer.getTime() / 1000);
        }else{
            return $scope.match.halftimeAt + $scope.match.halftimeLenght * 60 - Math.round($scope.timer.getTime() / 1000);
        }
    };

    $(document).foundation('reveal');
}]);