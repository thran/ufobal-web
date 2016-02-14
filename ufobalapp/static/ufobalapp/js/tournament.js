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
        dataService.addTeamOnTournament($scope.registration)
            .success(function (pk) {
                $scope.registration = {};
                $location.path("/turnaj/tym/" + pk);
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
}]);