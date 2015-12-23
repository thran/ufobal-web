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
            when('/statistiky', {
                templateUrl: 'stats.html',
                controller: "stats"
            }).
            when('/faq', {
                templateUrl: 'faq.html'
            }).
            otherwise({
                redirectTo: '/'
            });

        $locationProvider.html5Mode(true);
    }]);


app.controller("home", ["$scope", "dataService", function ($scope, dataService) {
    dataService.getStats().then(function (stats) {
       $scope.stats = stats;
    });
}]);


app.controller("teams", ["$scope", "dataService", "$filter", function ($scope, dataService, $filter) {
    dataService.getTeams().then(function(teams){
        teams = $filter('orderBy')(teams, "-medals");
        $scope.teams = teams;
    });
}]);

app.controller("team", ["$scope", "dataService", "$routeParams", function ($scope, dataService, $routeParams) {
    var id = parseInt($routeParams.id);

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

app.controller("tournament", ["$scope", "dataService", "$routeParams", "$filter", function ($scope, dataService, $routeParams, $filter) {
    var id = parseInt($routeParams.id);
    var allPlayers;
    $scope.man = $scope.woman = true;

    dataService.getTournaments().then(function(){
        $scope.tournament = dataService.getObject("tournaments", id);
        dataService.getGoals().then(function(){
            dataService.getPlayers().then(function(players){
                angular.forEach(players, function(player) {
                    player.goalsSumFiltered = player.goals[$scope.tournament.pk];
                    player.assistsSumFiltered = player.assists[$scope.tournament.pk];
                    player.goalsSumFiltered  = player.goalsSumFiltered ? player.goalsSumFiltered : 0;
                    player.assistsSumFiltered  = player.assistsSumFiltered ? player.assistsSumFiltered : 0;
                    player.canadaFiltered =  player.goalsSumFiltered + player.assistsSumFiltered;
                    player.scored = player.canadaFiltered > 0;
                });
                allPlayers = $filter('filter')(players, {scored: true});
                allPlayers = $filter('orderBy')(allPlayers, "canadaFiltered", true);
                $scope.players = allPlayers;
            });
        });
    });

    $scope.filterGender = function () {
        var players = allPlayers;
        if (!$scope.man) {
            players = $filter('filter')(players, {gender: "woman"}, true);
        }
        if (!$scope.woman) {
            players = $filter('filter')(players, {gender: "man"}, true);
        }
        $scope.players = players;
    };
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
    $scope.getScoreWithoutTeam = dataService.getScoreWithoutTeam;

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


app.controller("stats", ["$scope", "dataService", "$filter", function ($scope, dataService, $filter) {
    var tournaments;
    $scope.filter = {
        yearFrom: 2010,
        yearTo: new Date().getFullYear(),
        nizkov: true,
        brno: true,
        hala: false
    };
     angular.extend($scope.filter, JSON.parse(localStorage.getItem("statsTournamentFilter")));

    dataService.getGoals().then(function(){
        dataService.getTournaments().then(function(data){
            dataService.getPlayers().then(function(players){
                players = $filter('orderBy')(players, "canada", true);
                $scope.stats = players;

                tournaments = data;
                $scope.$watch("filter", function(filter, o){
                    $scope.tournaments = [];
                    angular.forEach(tournaments, function(tournament){
                        if (
                                (!filter.yearFrom || tournament.year >= filter.yearFrom) &&
                                (!filter.yearTo || tournament.year <= filter.yearTo) &&
                                (filter.nizkov || tournament.name.indexOf("Nížkov") === -1) &&
                                (filter.brno || tournament.name.indexOf("Brno") === -1) &&
                                (filter.hala || tournament.name.indexOf("Hala") === -1)
                        ){
                            $scope.tournaments.push(tournament);
                        }
                    });
                    $scope.tournaments = $filter("orderBy")($scope.tournaments, "date");
                    updateStats();
                    localStorage.setItem("statsTournamentFilter", JSON.stringify(filter));
                }, true);
            });
        });
    });

    var updateStats = function(){
        angular.forEach($scope.stats, function(player){
            player.goalsSumFiltered = 0;
            player.assistsSumFiltered = 0;
            player.canadaFiltered= 0;

             angular.forEach($scope.tournaments, function(tournament) {
                 var g = player.goals[tournament.pk];
                 var a = player.assists[tournament.pk];
                 player.goalsSumFiltered += g ? g : 0;
                 player.assistsSumFiltered += a ? a : 0;
                 player.canadaFiltered += (g ? g : 0) + (a ? a : 0);
             });
        });
    };

}]);