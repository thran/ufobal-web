var app = angular.module('ufoIS', ["ngCookies", "ngRoute", "mm.foundation", "ng.django.urls", "smart-table"]);

app.config(["$httpProvider", function ($httpProvider) {
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}]);

app.run(["$rootScope", "$location", "$window", function ($rootScope, $location, $window) {
    $rootScope.$on('$routeChangeSuccess', function(){
        ga('send', 'pageview', $location.path());
    });

    $rootScope.$on('$routeChangeStart', function(event, next, current) {
        if (!localStorage.getItem("checked") && next.originalPath === "/"){
            $location.path("/intro");
            $window.location.href = "/intro";
        }
        $("#feedback").css('display', next.templateUrl === 'tournament_match.html' ? "none" : "block");
    });
}]);

app.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
        $locationProvider.hashPrefix('!');
        $routeProvider.
            when('/', {
                templateUrl: 'home.html',
                controller: "home"
            }).
            when('/sparovat_ucet', {
                templateUrl: 'pair_account.html',
                controller: "auth"
            }).
            when('/sparovat_ucet/:token', {
                templateUrl: 'pair_account.html',
                controller: "auth"
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
            when('/turnaj', {
                templateUrl: 'tournament_main.html',
                controller: "tournamentMain"
            }).
            when('/turnaj-zive', {
                templateUrl: 'tournament_live.html',
                controller: "tournamentMain"
            }).
            when('/turnaj/tym/:id', {
                templateUrl: 'tournament_team.html',
                controller: "tournamentTeam"
            }).
            when('/turnaj/prihlasovani', {
                templateUrl: 'tournament_registration.html',
                controller: "tournamentRegistration"
            }).
            when('/turnaj/zapas/:tournamentId/:id', {
                templateUrl: 'tournament_match.html',
                controller: "tournamentMatch"
            }).
            when('/turnaj/zapas/:tournamentId/:id/:edit', {
                templateUrl: 'tournament_match.html',
                controller: "tournamentMatch"
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
            when('/intro', {
                templateUrl: 'faq.html',
                controller: "intro"
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
    dataService.getLiveTournament().then(function (tournament) {
       $scope.liveTournament = tournament;
    });
}]);

app.controller("intro", ["$scope", "$window", function ($scope, $window) {
    $scope.intro = true;
    $scope.check = function(){
        if ($scope.checked) {
            localStorage.setItem("checked", true);
            $window.location.href = "/";
        }
    };
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

app.controller("tournament", ["$scope", "dataService", "$routeParams", "$filter", "$timeout", function ($scope, dataService, $routeParams, $filter, $timeout) {
    var id = parseInt($routeParams.id);
    var allPlayers;
    $scope.man = $scope.woman = true;

    dataService.getTournaments().then(function(){
        $scope.tournament = dataService.getObject("tournaments", id);
        dataService.getGoals().then(function(){
            dataService.getPlayers().then(function(players){
                dataService.getMatches(id).then(function () {
                    $timeout(function(){
                        $scope.goalies = getGoalieScore($scope.tournament);
                    });
                });

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
        $scope.players = filterGender(allPlayers, $scope.man, $scope.woman, $filter);
    };

    var getGoalieScore = function (tournament) {
        var goalies = {};
        angular.forEach(tournament.matches, function (match) {
            if (!match.length){
                return;
            }
            angular.forEach(match.goalies, function (goalieOnMatch) {
                if (!goalies[goalieOnMatch.goalie]){
                    var player = dataService.getObject("players", goalieOnMatch.goalie);
                    goalies[goalieOnMatch.goalie] = {
                        player: player,
                        matches: {},
                        totalTime: 0,
                        shots: 0,
                        goals: 0,
                        team: inTeam(match.team_one, player) ? match.team_one : match.team_two
                    };
                }
                var goalie = goalies[goalieOnMatch.goalie];
                goalie.matches[match.pk] = 1;
                goalie.totalTime = goalie.totalTime + moment.duration(goalieOnMatch.end).asMilliseconds() - moment.duration(goalieOnMatch.start).asMilliseconds();
                angular.forEach(match.goals, function (goal) {
                    if (!goal.team){
                        goal.team = inTeam(match.team_one, goal.shooter) ? match.team_one : match.team_two;
                    }
                    if (goal.team !== goalie.team && goalieOnMatch.start < goal.time  && goal.time <= goalieOnMatch.end){
                        goalie.goals++;
                        goalie.shots++;
                    }
                });
                angular.forEach(match.shots, function (shot) {
                    if (shot.team !== goalie.team.pk && goalieOnMatch.start < shot.time  && shot.time <= goalieOnMatch.end){
                        goalie.shots++;
                    }
                });
            });
        });
        goalies = Object.keys(goalies).map(function(key){ return goalies[key]; });
        angular.forEach(goalies, function (goalie) {
            goalie.success = 1 - goalie.goals / (goalie.shots);
            goalie.matches = Object.keys(goalie.matches).length;
        });
        goalies = $filter("orderBy")(goalies, "-success");
        if (goalies.length === 0){
            return null;
        }
        return goalies;
    };
}]);


var filterGender = function (allPlayers, man, woman, $filter) {
    var players = allPlayers;
    if (!man) {
        players = $filter('filter')(players, {gender: "woman"}, true);
    }
    if (!woman) {
        players = $filter('filter')(players, {gender: "man"}, true);
    }
    return players;
};

app.controller("players", ["$scope", "dataService", "$filter", function ($scope, dataService, $filter) {
    $scope.getPlayerTeams = dataService.getPlayerTeams;

    dataService.getGoals().then(function(){
        dataService.getPlayers().then(function(players){
            players = $filter('orderBy')(players, "canada", true);
            $scope.players = players;
        });
    });
}]);

app.controller("player", ["$scope", "dataService", "$routeParams", "userService", function ($scope, dataService, $routeParams, userService) {
    var id = parseInt($routeParams.id);
    $scope.user = userService.user;
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
    var defaultFilter = {
        yearFrom: new Date().getFullYear()-6,
        yearTo: new Date().getFullYear(),
        nizkov: true,
        brno: true,
        hala: false,
        man: true,
        woman: true,
    };
    $scope.filter = angular.copy(defaultFilter);
    angular.extend($scope.filter, JSON.parse(localStorage.getItem("statsTournamentFilter")));

    $scope.resetTournamentFilter = function () {
        $scope.filter = angular.copy(defaultFilter);
    };

    $scope.filterGender = function () {
        $scope.players = filterGender($scope.stats, $scope.filter.man, $scope.filter.woman, $filter);
        return $scope.players;
    };

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
                    $scope.filterGender();
                    localStorage.setItem("statsTournamentFilter", JSON.stringify(filter));
                    orderPlayers();
                }, true);
            });
        });
    });

    var orderPlayers = function () {
        if (localStorage.getItem("stats")) {
            var savedState = JSON.parse(localStorage.getItem("stats"));
            $scope.stats = $filter('orderBy')($scope.stats, savedState.sort.predicate, savedState.sort.reverse);
        }
        angular.forEach($scope.filterGender(), function(player, index){
            player.rank = index + 1;
        });
    };

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