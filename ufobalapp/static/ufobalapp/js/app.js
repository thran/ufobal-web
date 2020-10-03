var app = angular.module('ufoIS', ["ngCookies", "ngRoute", "mm.foundation", "djng.urls", "smart-table", 'ngEqualizer']);

app.config(["$httpProvider", function ($httpProvider) {
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}]);

app.run(["$rootScope", "$location", "$window", function ($rootScope, $location, $window) {
    $rootScope.$on('$routeChangeSuccess', function(){
        ga('send', 'pageview', $location.path());
    });

    $rootScope.$on('$routeChangeStart', function(event, next, current) {
        //if (!localStorage.getItem("checked") && next.originalPath === "/"){
        //    $location.path("/intro");
        //    $window.location.href = "/intro";
        //}
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
            when('/sin_slavy', {
                templateUrl: 'hall_of_records.html',
                controller: "hall_of_records"
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
            when('/turnaj/:id/:turnaj/:selected_team_id', {
                templateUrl: 'tournament.html',
                controller: "tournament"
            }).
            when('/skupiny/:id', {
                templateUrl: 'groups.html',
                controller: "groups"
            }).
            when('/statistiky', {
                templateUrl: 'stats.html',
                controller: "stats"
            }).
            when('/brankari', {
                templateUrl: 'stats_goalies.html',
                controller: "statsGoalies"
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


app.controller("home", ["$scope", "dataService", "$sce", function ($scope, dataService, $sce) {
    dataService.getStats().then(function (stats) {
       $scope.stats = stats;
    });
    dataService.getLiveTournament().then(function (tournament) {
       $scope.liveTournament = tournament;
    });
    $scope.to_trusted = function(html_code) {
        return $sce.trustAsHtml(html_code);
    };
}]);

app.controller("hall_of_records", ["$scope", "dataService", function ($scope, dataService) {
    dataService.getHallOfRecords().then(function (stats) {
       $scope.stats = stats;
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
    var selected_team_id = $routeParams.selected_team_id ? parseInt($routeParams.selected_team_id) : null;
    var allPlayers;
    var allGoalies;
    var allPairs;
    $scope.goalCount = 0;
    $scope.playerCount = 0;
    $scope.man = $scope.woman = true;

    dataService.getTournaments().then(function(){
        $scope.tournament = dataService.getObject("tournaments", id);
        dataService.getGoals().then(function(){
            dataService.getPlayers().then(function(players){
                dataService.getPairs(id).then(function (pairs) {
                    allPairs = $scope.pairs = $filter("orderBy")(pairs, "-points");
                });

                dataService.getMatches(id).then(function (matches) {
                    var teams = {};
                    angular.forEach($scope.tournament.teamOnTournaments, function(team){
                        teams[team.pk] = team;
                        team.goals_scored = 0;
                        team.goals_recieved = 0;
                        $scope.playerCount += team.players.length;
                        if (team.pk === selected_team_id){
                            $scope.filterTeam = team.name;
                        }
                    });

                    angular.forEach(matches, function(match){
                        var teamOnePk = match.team_one.pk ? match.team_one.pk : match.team_one;
                        var teamTwoPk = match.team_two.pk ? match.team_two.pk : match.team_two;
                        teams[teamOnePk].goals_scored += match.score_one;
                        teams[teamTwoPk].goals_scored += match.score_two;
                        teams[teamOnePk].goals_recieved += match.score_two;
                        teams[teamTwoPk].goals_recieved += match.score_one;
                        $scope.goalCount += match.score_one + match.score_two;
                    });

                    $timeout(function(){
                        allGoalies = getGoalieScore($scope.tournament, dataService);
                        allGoalies = $filter("orderBy")(allGoalies, "-success");
                        $scope.goalies = allGoalies;
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
                $scope.allPlayers = allPlayers;
            });
        });
    });

    $scope.$watch('filterTeam', function (n, o) {
        if ($scope.filterTeam === null){
            $scope.filterTeam = '';
        }
        $scope.filterPlayers();
    });

    $scope.filterPlayers = function () {
        var players = filterGender(allPlayers, $scope.man, $scope.woman, $filter);
        if ($scope.filterTeam) {
            players = filterPlayers(players, $scope.filterTeam);
            $scope.goalies = filterPlayers(allGoalies, $scope.filterTeam);
            $scope.pairs = filterPlayers(allPairs, $scope.filterTeam);
        }else{
            $scope.goalies = allGoalies;
            $scope.pairs = allPairs;
        }
        $scope.players = players;
    };

    var filterPlayers = function (players, filter) {
        var teams = $filter('filter')($scope.tournament.teamOnTournaments, {name: filter});
        return $filter('filter')(players, function (player) {
            var found = false;
            angular.forEach(teams, function (team) {
                if (team.player_pks.indexOf(player.pk) !== -1) {
                    found = true;
                }
            });
            return found;
        });
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
    $scope.userStatus = userService.status;
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

    $scope.pair = function () {
        var text = prompt("Nějaké dodatečné informace pro spárování s hráčem? " +
            "Třeba odkaz někam, kde je tvoje jméno i fotka.", "");
        dataService.createPairingRequest($scope.player, text)
            .success(function () {
                toastr.info('Žádost o spárování odeslána.');
            })
            .error(function (response) {
                toastr.error('Chyba: ' + response);
            });
    };

    dataService.getTournaments().then(function(tournaments){
        $scope.tournaments = tournaments;
    });
    dataService.getGoals();
}]);

var defaultStatsFilter = {
    yearFrom: new Date().getFullYear()-6,
    yearTo: new Date().getFullYear(),
    nizkov: true,
    brno: true,
    hala: false,
    man: true,
    woman: true,
};

app.controller("stats", ["$scope", "dataService", "$filter", function ($scope, dataService, $filter) {
    var tournaments;
    $scope.filter = angular.copy(defaultStatsFilter);
    angular.extend($scope.filter, JSON.parse(localStorage.getItem("statsTournamentFilter")));

    $scope.resetTournamentFilter = function () {
        $scope.filter = angular.copy(defaultStatsFilter);
    };

    $scope.sortCallback = function(){
       orderPlayers();
    };

    $scope.filterGender = function () {
        $scope.players = filterGender($scope.stats, $scope.filter.man, $scope.filter.woman, $filter);
        return $scope.players;
    };

    dataService.getGoals().then(function(){
        dataService.getTournaments().then(function(data){
            dataService.getPlayers().then(function(players){
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
            if (!savedState.sort.predicate){
                savedState.sort.predicate = "canadaFiltered";
                savedState.sort.reverse = true;
            }
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

app.controller("statsGoalies", ["$scope", "dataService", "$filter", function ($scope, dataService, $filter) {
    var tournaments;
    $scope.filter = angular.copy(defaultStatsFilter);
    angular.extend($scope.filter, JSON.parse(localStorage.getItem("statsGoaliesTournamentFilter")));

    $scope.minMatches = 10;
    $scope.$watch("minMatches", function (n, o) {
        orderGoalies();
    });

    $scope.resetTournamentFilter = function () {
        $scope.filter = angular.copy(defaultStatsFilter);
    };

    $scope.sortCallback = function(){
       orderGoalies();
    };

    $scope.filterGender = function () {
        $scope.players = filterGender($scope.statsGoalies, $scope.filter.man, $scope.filter.woman, $filter);
        $scope.players = $filter('filter')($scope.players, function (player) {
            return player.goalieStats.success > 0 && player.goalieStats.matchesSum >= $scope.minMatches;
        });
        return $scope.players;
    };

    dataService.getGoals().then(function(){
        dataService.getTournaments().then(function(data){
            dataService.getMatches().then(function (matches) {
                dataService.getPlayers().then(function(players){
                    $scope.statsGoalies = players;
                    tournaments = data;
                    $scope.$watch("filter", function (filter, o) {
                        $scope.tournaments = [];
                        angular.forEach(tournaments, function (tournament) {
                            if (
                                (!filter.yearFrom || tournament.year >= filter.yearFrom) &&
                                (!filter.yearTo || tournament.year <= filter.yearTo) &&
                                (filter.nizkov || tournament.name.indexOf("Nížkov") === -1) &&
                                (filter.brno || tournament.name.indexOf("Brno") === -1) &&
                                (filter.hala || tournament.name.indexOf("Hala") === -1) &&
                                (tournament.matches.length > 0)
                            ) {
                                $scope.tournaments.push(tournament);
                            }
                        });
                        $scope.tournaments = $filter("orderBy")($scope.tournaments, "date");
                        updateStats();
                        $scope.filterGender();
                        localStorage.setItem("statsGoaliesTournamentFilter", JSON.stringify(filter));
                        orderGoalies();
                    }, true);
                });
            });
        });
    });

    var orderGoalies = function () {
        if (localStorage.getItem("statsGoalies")) {
            var savedState = JSON.parse(localStorage.getItem("statsGoalies"));
            if (!savedState.sort.predicate){
                savedState.sort.predicate = "goalieStats.success";
                savedState.sort.reverse = true;
            }
            $scope.statsGoalies = $filter('orderBy')($scope.statsGoalies, savedState.sort.predicate, savedState.sort.reverse);
        }else{
            $scope.statsGoalies = $filter('orderBy')($scope.statsGoalies, "goalieStats.success", true);
        }
        angular.forEach($scope.filterGender(), function(player, index){
            player.rank = index + 1;
        });
    };

    var updateStats = function(){
        angular.forEach($scope.statsGoalies, function (player) {
            player.goalieStats = {
                "timeSum": 0,
                "matchesSum": 0,
                "shotsSum": 0,
                "goalsSum": 0,
                "tournaments": {}
            };
        });

        angular.forEach($scope.tournaments, function(tournament) {
            goalies = getGoalieScore(tournament, dataService);
            angular.forEach(goalies, function (goalie) {
                var player = dataService.getObject('players', goalie.pk);
                player.goalieStats.tournaments[tournament.pk] = goalie;
                player.goalieStats.timeSum += goalie.totalTime;
                player.goalieStats.matchesSum += goalie.matches;
                player.goalieStats.shotsSum += goalie.shots;
                player.goalieStats.goalsSum += goalie.goals;
                player.goalieStats.success = 1 - player.goalieStats.goalsSum / player.goalieStats.shotsSum;
            });
        });
    };
}]);

toastr.options = {
    "positionClass": "toast-top-center",
    "preventDuplicates": false,
    "onclick": null,
    "showDuration": "300",
    "hideDuration": "1000",
    "timeOut": "2000",
    "extendedTimeOut": "1000",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut"
};
