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
    var pk = parseInt($routeParams.pk);
    $scope.genders = genders;

    dataService.getLiveTournament().then(function (tournament) {
        $scope.tournament = tournament;
        dataService.getTeams().then(function () {
            angular.forEach(tournament.teamOnTournaments, function (team) {
                if (team.pk === pk) {
                    $scope.team = team;
                    dataService.getPlayers().then(function (players) {
                        angular.forEach(team.players, function (player) {
                            if (player.pk === team.captain){
                                $scope.captain = player;
                            }
                        });
                        $scope.players = players;
                    });
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

    $scope.setCaptain = function (captain) {
        dataService.setCaptain($scope.team, captain).then(function () {
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
}]);