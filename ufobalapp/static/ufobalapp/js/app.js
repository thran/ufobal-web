var app = angular.module('ufoIS', ["ngCookies", "ngRoute", "mm.foundation", "ng.django.urls", "smart-table"]);

app.config(["$httpProvider", function ($httpProvider) {
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}]);

app.run(["$rootScope", "$location", function ($rootScope, $location) {
    $rootScope.$on('$routeChangeSuccess', function(){
        ga('send', 'pageview', $location.path());
    });

    $rootScope.$on('$routeChangeStart', function(event, next, current) {

    });
}]);

app.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
        $locationProvider.hashPrefix('!');
        $routeProvider.
            when('/', {
                templateUrl: 'home.html',
                controller: "home"
            }).
            when('/hraci', {
                templateUrl: 'players.html',
                controller: "players"
            }).
            when('/hrac/:id/:hrac', {
                templateUrl: 'player.html',
                controller: "player"
            }).
            when('/tymy', {
                templateUrl: 'teams.html',
                controller: "teams"
            }).
            when('/tym/:id/:tym', {
                templateUrl: 'team.html',
                controller: "team"
            }).
             when('/turnaje', {
                templateUrl: 'tournaments.html',
                controller: "tournaments"
            }).
            when('/turnaj/:id/:turnaj', {
                templateUrl: 'tournament.html',
                controller: "tournament"
            }).
            otherwise({
                redirectTo: '/'
            });

        $locationProvider.html5Mode(true);
    }]);


app.controller("home", ["$scope", function ($scope) {

}]);


app.controller("teams", ["$scope", "dataService", "$filter", function ($scope, dataService, $filter) {
    dataService.getTeams().then(function(teams){
        teams = $filter('orderBy')(teams, "name");
        $scope.teams = teams;
    });
}]);

app.controller("team", ["$scope", "dataService", "$routeParams", function ($scope, dataService, $routeParams) {
    var id = parseInt($routeParams.id);
    $scope.getTeamNames = dataService.getTeamNames;

    dataService.getTeams().then(function(teams){
        $scope.team = dataService.getObject("teams", id);
    });
}]);

app.controller("tournaments", ["$scope", "dataService", "$filter", function ($scope, dataService, $filter) {
    dataService.getTournaments().then(function(tournaments){
        tournaments = $filter('orderBy')(tournaments, "date", true);
        $scope.tournaments = tournaments;
    });
}]);

app.controller("tournament", ["$scope", "dataService", "$routeParams", function ($scope, dataService, $routeParams) {
    var id = parseInt($routeParams.id);

    dataService.getTournaments().then(function(){
        $scope.tournament = dataService.getObject("tournaments", id);
    });
}]);


app.controller("players", ["$scope", "dataService", "$filter", function ($scope, dataService, $filter) {
    $scope.getPlayerTeams = dataService.getPlayerTeams;

    dataService.getGoals().then(function(){
        dataService.getPlayers().then(function(players){
            players = $filter('orderBy')(players, "canada", true);
            $scope.players = players;
        });
    });
}]);

app.controller("player", ["$scope", "dataService", "$routeParams", function ($scope, dataService, $routeParams) {
    var id = parseInt($routeParams.id);
    $scope.genders = genders;
    $scope.getPlayerTeams = dataService.getPlayerTeams;

    $scope.computeAge = function(){
        if ($scope.player.birthdate){
            var ageDifMs = Date.now() - Date.parse($scope.player.birthdate);
            var ageDate = new Date(ageDifMs);
            $scope.player.age = Math.abs(ageDate.getUTCFullYear() - 1970);
        }
    };

    $scope.addAttendance = function(){
        dataService.addAttendance($scope.player, $scope.selectedTeam);
    };

    $scope.removeAttendance = function(team){
        if (confirm("Opravdu chcete smazat tuto účast na turnaji?")) {
            dataService.removeAttendance($scope.player, team);
        }
    };

    $scope.save = function(){
        dataService.savePlayer($scope.player)
            .success(function(){
                $scope.edit = false;
            });
    };

    dataService.getPlayers().then(function(players){
        $scope.player = dataService.getObject("players", id);
    });

    dataService.getTournaments().then(function(tournaments){
        $scope.tournaments = tournaments;
    });
    dataService.getGoals();
}]);
