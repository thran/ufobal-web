var app = angular.module('ufoIS', ["ngCookies", "ngRoute", "djng.urls", "smart-table", 'ngEqualizer', 'star-rating']);

app.config(["$httpProvider", function ($httpProvider) {
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}]);

app.run(["$rootScope", "$location", "$window", function ($rootScope, $location, $window) {
    $rootScope.$on('$routeChangeSuccess', function(){
        ga('send', 'pageview', $location.path());
    });

    $rootScope.$on('$routeChangeStart', function(event, next, current) {
        //if (!loadLocally("checked") && next.originalPath === "/"){
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
            when('/privacy_policy', {
                templateUrl: 'privacy_policy.html',
                controller: "privacy_policy"
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
            when('/turnaj/:id', {
                templateUrl: 'tournament_main.html',
                controller: "tournamentMain"
            }).
            when('/turnaj-zive/:id', {
                templateUrl: 'tournament_live.html',
                controller: "tournamentMain"
            }).
            when('/turnaj/:tournament_id/tym/:id', {
                templateUrl: 'tournament_team.html',
                controller: "tournamentTeam"
            }).
            when('/turnaj/prihlasovani/:id', {
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
            when('/hodnoceni_rozhodcich/:id', {
                templateUrl: 'referee_feedbacks.html',
                controller: "referee_feedbacks"
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
    dataService.getTournament(liveTournamentPk).then(function () {
       $scope.liveTournament = dataService.getObject('tournaments', liveTournamentPk);
    });
    $scope.to_trusted = function(html_code) {
        return $sce.trustAsHtml(html_code);
    };
}]);

app.controller("privacy_policy", ["$scope", function ($scope) {
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
            saveLocally("checked", true, 60 * 60 * 24 * 365 * 10);
            $window.location.href = "/";
        }
    };
}]);

app.controller("teams", ["$scope", "dataService", "$filter", function ($scope, dataService, $filter) {
    $scope.medalsValue = function (team) {
        var value = 0;
        for (i=0; i <= 4; i++) {
            value = value + team.medals[i] * Math.pow(10, (4 - i) * 3);
        }
        return -value;
    };

    dataService.getTeams().then(function(teams){
        teams = $filter('orderBy')(teams, $scope.medalsValue);
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
            .then(function(){
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
            .then(function () {
                toastr.info('Žádost o spárování odeslána.');
            })
            .catch(function (response) {
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
    liga: false,
    other: false,
    man: true,
    woman: true,
    minMatches: 10,
};

app.controller("stats", ["$scope", "dataService", "$filter", function ($scope, dataService, $filter) {
    var tournaments;
    $scope.filter = angular.copy(defaultStatsFilter);
    angular.extend($scope.filter, JSON.parse(loadLocally("statsTournamentFilter")));

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
                                (filter.nizkov || tournament.category_slugname !== "nizkov") &&
                                (filter.brno || tournament.category_slugname !== "brno") &&
                                (filter.other || tournament.category_slugname !== "other") &&
                                (filter.hala || tournament.category_slugname !== "hala" )  &&
                                (filter.liga || tournament.category_slugname !== "liga" )  &&
                                tournament.category_slugname !== "trening"
                        ){
                            $scope.tournaments.push(tournament);
                        }
                    });
                    $scope.tournaments = $filter("orderBy")($scope.tournaments, "date");
                    updateStats();
                    $scope.filterGender();
                    saveLocally("statsTournamentFilter", JSON.stringify(filter), 60 * 60 * 24);
                    orderPlayers();
                }, true);
            });
        });
    });

    var orderPlayers = function () {
        if (loadLocally("stats")) {
            var savedState = JSON.parse(loadLocally("stats"));
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
    angular.extend($scope.filter, JSON.parse(loadLocally("statsGoaliesTournamentFilter")));

    $scope.resetTournamentFilter = function () {
        $scope.filter = angular.copy(defaultStatsFilter);
    };

    $scope.sortCallback = function(){
       orderGoalies();
    };

    $scope.filterGender = function () {
        $scope.players = filterGender($scope.statsGoalies, $scope.filter.man, $scope.filter.woman, $filter);
        $scope.players = $filter('filter')($scope.players, function (player) {
            return player.goalieStats.success > 0 && player.goalieStats.matchesSum >= $scope.filter.minMatches;
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
                                (filter.nizkov || tournament.category_slugname !== "nizkov") &&
                                (filter.brno || tournament.category_slugname !== "brno") &&
                                (filter.other || tournament.category_slugname !== "other") &&
                                (filter.hala || tournament.category_slugname !== "hala" ) &&
                                tournament.category_slugname !== "liga"  &&
                                tournament.category_slugname !== "trening'" &&
                                (tournament.matches.length > 0)
                            ) {
                                $scope.tournaments.push(tournament);
                            }
                        });
                        $scope.tournaments = $filter("orderBy")($scope.tournaments, "date");
                        updateStats();
                        $scope.filterGender();
                        saveLocally("statsGoaliesTournamentFilter", JSON.stringify(filter), 60 * 60 * 24);
                        orderGoalies();
                    }, true);
                });
            });
        });
    });

    var orderGoalies = function () {
        if (loadLocally("statsGoalies")) {
            var savedState = JSON.parse(loadLocally("statsGoalies"));
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

app.service("dataService", ["$http", "$q", "djangoUrl", "$filter", function($http, $q, djangoUrl, $filter){
    var self = this;
    var data = {};
    var dataMaps = {};
    var deferredTmp = {};
    var dataProcessors = {
        players: function(player){
            player.birthdate = player.birthdate !== null ? new Date(player.birthdate) : null;
            player.tournaments = [];
            player.goals = {};
            player.assists = {};
            player.goalsSum = 0;
            player.assistsSum = 0;
            player.canada = 0;
            player.search = player.nickname + "###" + removeDiacritics(player.nickname);
            player.penalty_count = player.penalties ? player.penalties.length : 0;
        },
        team: function (team) {
            if (dataMaps.teams[team.pk]){
                return;
            }
            team.matches = [];
            dataMaps.teams[team.pk] = team;
            data.teams.push(team);
            team.teamOnTournaments = [];
            team.medals = [0, 0, 0, 0, 0];
        },
        tournament: function (tournament) {
            if (dataMaps.tournaments[tournament.pk]){
                return;
            }
            tournament.matches = [];
            dataMaps.tournaments[tournament.pk] = tournament;
            data.tournaments.push(tournament);
            tournament.teamOnTournaments = [];
            tournament.fields = [];
            for (var i = 1; i <= tournament.field_count; i++){
                tournament.fields.push("" + i);
            }
        },
        teamontournaments: function(teamOnTournament){
            teamOnTournament.matches = [];
            // create and link teams
            dataProcessors.team(teamOnTournament.team);
            dataMaps.teams[teamOnTournament.team.pk].teamOnTournaments.push(teamOnTournament);
            if (teamOnTournament.rank < 6) {
                dataMaps.teams[teamOnTournament.team.pk].medals[teamOnTournament.rank - 1] += 1;
            }

            // create and link tournaments
            dataProcessors.tournament(teamOnTournament.tournament);
            dataMaps.tournaments[teamOnTournament.tournament.pk].teamOnTournaments.push(teamOnTournament);

            // link players
            teamOnTournament.players = [];
            angular.forEach(teamOnTournament.player_pks, function(playerPk){
                var player = dataMaps.players[playerPk];
                player.tournaments.push(teamOnTournament);
                teamOnTournament.players.push(player);
                if (playerPk === teamOnTournament.captain){
                    teamOnTournament.captain = player;
                }
                if (playerPk === teamOnTournament.default_goalie){
                    teamOnTournament.defaultGoalie = player;
                }
                angular.forEach(player.penalties, function(penalty) {
                    if (teamOnTournament.tournament.pk === penalty.tournament) {
                        penalty.tournament = teamOnTournament.tournament;
                    }
                });
            });
        },
        matchs: function (match) {
            match.tournament = self.getObject("tournaments", match.tournament);
            match.team_one = self.getObject("teamontournaments", match.team_one);
            match.team_two = self.getObject("teamontournaments", match.team_two);
            match.referee_team = self.getObject("teamontournaments", match.referee_team);
            match.referee = self.getObject("players", match.referee);
            match.state = match.end ? "ended" : (match.start ?  "ongoing" : "waiting");
            match.start = match.start !== null ? new Date(match.start) : null;
            match.end = match.end !== null ? new Date(match.end) : null;
            match.search = match.team_one.name + "###" + match.team_two.name;

            match.tournament.matches.push(match);

            // need to handle refreshing
            // match.team_one.matches.push(match);
            // match.team_two.matches.push(match);
        },
        pairs: function (pair) {
            pair.player1 = self.getObject("players", pair.players[0]);
            pair.player2 = self.getObject("players", pair.players[1]);
            pair.pk = pair.player1.pk;
        }
    };

    var getData = function(object, filter, cache_suffix, url_params){
        var cacheName = object + (cache_suffix ? cache_suffix : "");
        if (deferredTmp[cacheName]){
            return deferredTmp[cacheName].promise;
        }
        var deferred = $q.defer();
        if (data[cacheName]){
            deferred.resolve(data[cacheName]);
            return deferred.promise;
        }
        deferredTmp[cacheName] = deferred;
        if (object === "teams" || object === "tournaments"){
            getData("teamontournaments");
        } else if(object === "goals") {
            getGoals();
        } else {
            getDataFromServer(object, cacheName, filter, url_params);
        }
        return deferred.promise;
    };

    var resolvePromise = function(object){
        if (deferredTmp[object]) {
            deferredTmp[object].resolve(data[object]);
            deferredTmp[object] = null;
        }
    };

    var rejectPromise = function(object, response, status){
        if (deferredTmp[object]) {
            deferredTmp[object].reject("Error: request returned status " + status + " and message " + response);
            deferredTmp[object] = null;
        }
    };

    var getDataFromServer = function(object, cacheName, filter, url_params){
        $http.get(djangoUrl.reverse("api:get_" + object, url_params), {params: filter})
            .then(function(response){
                response = response.data;
                data[cacheName] = response;
                dataMaps[object] = {};
                if (object === "teamontournaments") {
                    data.teams = [];
                    dataMaps.teams = {};
                    if (!dataMaps.tournaments) {
                        data.tournaments = [];
                        dataMaps.tournaments = {};
                    }
                    getData("players").then(function () {
                        angular.forEach(response, function (obj) {
                            dataMaps[object][obj.pk] = obj;
                            dataProcessors[object](obj);
                        });
                        angular.forEach(data.teams, function (team) {
                            self.getTeamNames(team);
                        });
                        angular.forEach(data.players, function (player) {
                            self.getPlayerTeams(player);
                        });
                        resolvePromise("teams");
                        resolvePromise("tournaments");
                    });
                }else if (object === "emptyTournaments") {
                    if (!dataMaps.tournaments){
                        data.tournaments = [];
                        dataMaps.tournaments = {};
                    }
                    angular.forEach(response, function(obj) {
                        dataProcessors.tournament(obj);
                    });
                }else if (object === "tournament"){
                    if (!dataMaps.tournaments){
                        data.tournaments = [];
                        dataMaps.tournaments = {};
                    }
                    dataProcessors.tournament(response);
                }else if (object === "matchs"){
                    self.getTeams().then(function() {
                        self.getPlayers().then(function() {
                            angular.forEach(response, function (obj) {
                                dataMaps[object][obj.pk] = obj;
                                dataProcessors[object](obj);
                            });
                        });
                    });
                }else{
                    angular.forEach(response, function(obj) {
                        dataMaps[object][obj.pk] = obj;
                        dataProcessors[object](obj);
                    });
                }
                resolvePromise(cacheName);
                return response;
            })
            .catch(function (response, status, headers, config) {
                response = response.data;
                rejectPromise(cacheName, response, status);
                if (object === "teamontournaments"){
                    rejectPromise("teams", response, status);
                    rejectPromise("tournaments", response, status);
                }
                throw response.data;
            });
    };

    var getGoals = function(){
        $http.get(djangoUrl.reverse("api:get_goals"))
            .then(function(response) {
                response = response.data;
                data.goals = response;
                getData("players").then(function(){
                    angular.forEach(response.goals, function(goals) {
                        var player = dataMaps.players[goals.shooter];
                        player.goals[goals.match__tournament] = goals.count;
                        player.goalsSum += goals.count;
                        player.canada += goals.count;
                    });
                    angular.forEach(response.assists, function(assists) {
                        var player = dataMaps.players[assists.assistance];
                        player.assists[assists.match__tournament] = assists.count;
                        player.assistsSum += assists.count;
                        player.canada += assists.count;
                    });
                    resolvePromise("goals");
                });
                return response;
            })
            .catch(function (response, status, headers, config) {
                rejectPromise("goals", response, status);
                throw response.data;
            });
    };

    self.getPlayers = function(){
        var r = getData("players");
        getData("teamontournaments");
        return r;
    };
    self.getTeams = function(){
        getData("players");
        return getData("teams");
    };
    self.getTournaments = function(){
        getData("players");
        getData('emptyTournaments');
        return getData("tournaments");
    };
    self.getTournament = function(tournament_pk){
        self.getTeams();
        return getData("tournament",null, tournament_pk, {"pk": tournament_pk});
    };
    self.getGoals = function(){
        getData("players");
        return getData("goals");
    };
    self.getPairs = function(tournament_pk){
        getData("players");
        return getData("pairs", null, tournament_pk, {"tournament_pk": tournament_pk});
    };
    self.getMatches = function (tournament_pk) {
        if (tournament_pk) {
            return getData("matchs", {"tournament": tournament_pk}, tournament_pk);
        } else {
            return getData("matchs");
        }
    };

    self.getObject = function(object, id){
        if (typeof id === "object"){
            return id;
        }
        if (!dataMaps[object]){
            return null;
        }
        return dataMaps[object][id];
    };

    self.refreshTournament = function(tournament){
        return $http.get(djangoUrl.reverse("api:get_matchs"), {params: {"tournament": tournament.pk}})
            .then(function(response){
                var matches = response.data;
                tournament.matches = [];
                angular.forEach(matches, function (match) {
                    dataProcessors.matchs(match);
                });
                return matches;
            });
    };

    self.addTeam = function(newTeam){
        newTeam.saving = true;
        return $http.post(djangoUrl.reverse("api:add_team"), newTeam)
            .then(function (response) {
                var pk = response.data;
                newTeam.saving = false;
                newTeam.pk = parseInt(pk);
                dataProcessors.team(newTeam);
                return pk;
            })
            .catch(function (error) {
                newTeam.saving = false;
                throw error.data;
            });
    };

    self.addPlayer = function(player){
        player.saving = true;
        var player_to_save = shallowCopy(player);
        player_to_save.birthdate = $filter('date')(player.birthdate, "yyyy-MM-dd");
        return $http.post(djangoUrl.reverse("api:add_player"), player_to_save)
            .then(function (response) {
                var pk = response.data;
                player.saving = false;
                player.pk = parseInt(pk);
                dataProcessors.players(player);
                data.players.push(player);
                dataMaps.players[pk] = player;
                return pk;
            })
            .catch(function (error) {
                player.saving = false;
                throw error.data;
            });
    };

    self.addTeamOnTournament = function (registration) {
        registration.saving = true;
        if (registration.name === ""){
            delete  registration.name;
        }
        return $http.post(djangoUrl.reverse("api:add_team_on_tournament"), registration)
            .then(function (response) {
                var pk = parseInt(response.data);
                registration.saving = false;
                var team = dataMaps.teams[registration.team];
                var teamOnTournament = {
                    pk: pk,
                    team: team,
                    name: registration.name ? registration.name + " (" + team.name + ")" : team.name,
                    name_pure: registration.name ? registration.name : team.name,
                    tournament: dataMaps.tournaments[registration.tournament],
                    players: []
                };
                dataMaps.tournaments[registration.tournament].teamOnTournaments.push(teamOnTournament);
                team.teamOnTournaments.push(teamOnTournament);
                return pk;
            })
            .catch(function (error) {
                registration.saving = false;
                throw error.data;
            });
    };

    self.addAttendance = function(player, team){
        player.saving = true;
        return $http.post(djangoUrl.reverse("api:add_attendance"), { player: player.pk, team: team.pk})
            .then(function(response){
                if (player.tournaments.indexOf(team) === -1){
                    player.tournaments.push(team);
                }
                if (team.players.indexOf(player) === -1){
                    team.players.push(player);
                }
                player.saving = false;
                return response.data;
            })
            .catch(function(error){
                player.saving = false;
                toastr.error(error.data);
                throw error.data;
            });
    };

    self.removeAttendance = function(player, team){
        player.saving = true;
        return $http.delete(djangoUrl.reverse("api:remove_attendance", [player.pk, team.pk]))
            .then(function(response){
                player.tournaments.splice(player.tournaments.indexOf(team), 1);
                team.players.splice(team.players.indexOf(player), 1);
                player.saving = false;
                return response.data;
            })
            .catch(function(error){
                player.saving = false;
                throw error.data;
            });
    };

    self.setCaptain = function (teamOnTournament) {
        return $http.post(djangoUrl.reverse("api:set_captain"), {player: teamOnTournament.captain.pk, team: teamOnTournament.pk});
    };

    self.setDefaultGoalie = function (teamOnTournament) {
        return $http.post(djangoUrl.reverse("api:set_default_goalie"), {player: teamOnTournament.defaultGoalie.pk, team: teamOnTournament.pk});
    };

    self.savePlayer = function(player){
        player.saving = true;
        var player_to_save = shallowCopy(player);
        player_to_save.birthdate = $filter('date')(player.birthdate, "yyyy-MM-dd");
        return $http.post(djangoUrl.reverse("api:save_player"), player_to_save)
            .then(function(response){
                player.saving = false;
                return response.data;
            })
            .catch(function (error) {
                player.saving = false;
                return error.data;
            });
    };

    self.getPlayerTeams = function(player){
        if (!player){
            return;
        }
        if (player.teams){
            var sum = 0;
            angular.forEach(player.teams, function(team) {
                sum += team.count;
            });
            if (sum === player.tournaments.length) {
                return player.teams;
            }
        }
        var teams = [];
        var teamsSearch = [];
        var pkMap = {};
        angular.forEach(player.tournaments, function(teamOnTournament){
            if (typeof pkMap[teamOnTournament.team.pk] !== "number"){
                pkMap[teamOnTournament.team.pk] = teams.length;
                teams.push({
                    team: teamOnTournament.team,
                    count: 0
                });
                teamsSearch += teamOnTournament.team.name + "###" + removeDiacritics(teamOnTournament.team.name) + "###";
            }
        teams[pkMap[teamOnTournament.team.pk]].count += 1;
        });
        player.teams = teams;
        player.teamsSearch = teamsSearch;
        return teams;
    };

    self.getTeamNames = function(team){
        if (!team){
            return;
        }
        if (team.names){
            var sum = 0;
            angular.forEach(team.names, function(name) {
                sum += name.count;
            });
            if (sum === team.teamOnTournaments.length) {
                return team.names;
            }
        }
        var names = [];
        var pkMap = {};
        var namesSearch = "";
        angular.forEach(team.teamOnTournaments, function(teamOnTournament){
            if (typeof  pkMap[teamOnTournament.name] !== "number"){
                pkMap[teamOnTournament.name] = names.length;
                names.push({
                    name: teamOnTournament.name_pure,
                    count: 0
                });
                namesSearch += teamOnTournament.name_pure + "###" + removeDiacritics(teamOnTournament.name_pure) + "###";
            }
            names[pkMap[teamOnTournament.name]].count += 1;
        });
        team.names = names;
        team.namesSearch = namesSearch;
        return names;
    };

    self.getScoreWithoutTeam = function(player){
        if (!player){
            return;
        }
        var withGoal = $.map(Object.keys(player.goals), function (x){ return parseInt(x); });
        var withAssists = $.map(Object.keys(player.assists), function (x){ return parseInt(x); });
        var participations = unique($.merge(withGoal, withAssists));
        var tournaments = $.map(player.tournaments, function(x){return x.tournament.pk; });
        angular.forEach(tournaments, function(pk){
            var index = participations.indexOf(pk);
            if (index > -1) {
                participations.splice(index, 1);
            }
        });
        if (player.scoreWithoutTeam && player.scoreWithoutTeam.length === participations.length){
            return player.scoreWithoutTeam;
        }
        tournaments = $.map(participations, function(x) { return self.getObject("tournaments", x); });
        player.scoreWithoutTeam = tournaments;
        return tournaments;
    };

    var stats = null;
    self.getStats = function () {
        var deferred = $q.defer();
        if (stats){
            deferred.resolve(stats);
            return deferred.promise;
        }
        $http.get(djangoUrl.reverse("api:get_stats"))
            .then(function (response) {
                response = response.data;
                stats = response;
                deferred.resolve(response);
                return response;
            }).catch(function (error) {
                return error.data;
            });
        return deferred.promise;
    };

    var hallOfRecords = null;
    self.getHallOfRecords = function () {
        var deferred = $q.defer();
        if (hallOfRecords){
            deferred.resolve(hallOfRecords);
            return deferred.promise;
        }
        $http.get(djangoUrl.reverse("api:get_hall_of_glory"))
            .then(function (response) {
                response = response.data;
                hallOfRecords = response;
                deferred.resolve(response);
                return response;
            }).catch(function (error) {
                return error.data;
            });
        return deferred.promise;
    };

    self.addMatch = function (match) {
        match.saving = true;
        return $http.post(djangoUrl.reverse("api:add_match"), shallowCopy(match, true))
            .then(function (response) {
                var pk = response.data;
                match.pk = parseInt(pk);
                match.tournament.matches.push(match);
                match.team_one.matches.push(match);
                match.team_two.matches.push(match);
                match.saving = false;
                dataMaps.matchs[pk] = match.pk;
                data["matchs" + match.tournament.pk].push(match);
                return pk;
            }).catch(function (error) {
                match.saving = false;
                throw error.data;
            });
    };

    self.saveMatch = function (match) {
        match.saving = true;
        return $http.post(djangoUrl.reverse("api:edit_match", {match_id: match.pk}), shallowCopy(match, true))
            .then(function (response) {
                match.saving = false;
                return response.data;
            }).catch(function (error) {
                match.saving = false;
                throw error.data;
            });
    };

    self.removeEvent = function(event, type) {
        if (event.pk){
            event.saving = true;
            var params = {};
            params[type + "_id"] = event.pk;
            return $http.delete(djangoUrl.reverse("api:remove_"+type, params))
                .then(function (response) {
                    event.saving = false;
                    return response.data;
                })
                .catch(function (error) {
                    event.saving = false;
                    throw error.data;
                });
        }else{
            console.error("PK is missing");
        }
    };

    self.saveEvent = function(event, type) {
        if (!event.pk){
            event.saving = true;
            return $http.post(djangoUrl.reverse("api:add_"+type), shallowCopy(event, true))
                .then(function (response) {
                    var pk = response.data;
                    event.saving = false;
                    event.pk = parseInt(pk);
                    return pk;
                })
                .catch(function (error) {
                    event.saving = false;
                    throw error.data;
                });
        }else{
            event.saving = true;
            var params = {};
            params[type + "_id"] = event.pk;
            return $http.post(djangoUrl.reverse("api:edit_"+type, params), shallowCopy(event, true))
                .then(function (response) {
                    event.saving = false;
                    return response.data;
                })
                .catch(function (error) {
                    event.saving = false;
                    throw error.data;
                });
        }
    };

    self.goalieChange = function(goalieChange){
        goalieChange.saving = true;
        return $http.post(djangoUrl.reverse("api:change_goalie", {
            match_id: goalieChange.match.pk,
            team_id: goalieChange.team.pk
        }), shallowCopy(goalieChange, true))
            .then(function (response) {
                goalieChange.saving = false;
                return response.data;
            })
            .catch(function (error) {
                goalieChange.saving = false;
                throw error.data;
            });
    };

    self.ping = function () {
        return $http.get(djangoUrl.reverse("api:ping"))
            .then(function (response) {
                return response.data;
            });
    };

    self.createPairingRequest = function(player, text) {
        return $http.post(djangoUrl.reverse("api:create_pairing_request", {player_id: player.pk}), {
            text: text
        }).then(function (response) {
                return response.data;
            });
    };

    self.getGroups = function(tournament_id) {
        return $http.get(djangoUrl.reverse("api:get_groups", {tournament_id: tournament_id}))
            .then(function (response) {
                return response.data;
            });
    };

    self.getRefereeFeedbacks = function(tournament_id) {
        return $http.get(djangoUrl.reverse("api:get_referee_feedbacks", {tournament_id: tournament_id}))
            .then(function (response) {
                return response.data;
            }).catch(function (error) {
                toastr.error(error.data);
                throw error.data;
            });
    };

    self.saveFeedback = function(feedback) {
        feedback.saving = true;
        return $http.post(djangoUrl.reverse("api:save_referee_feedback"), feedback)
            .then(function (response){
                var pk = response.data;
                feedback.pk = parseInt(pk);
                feedback.saving = false;
                return pk;
            }).catch(function (error) {
                feedback.saving = false;
                toastr.error(error.data);
                throw error.data;
            });
    };
}]);

var genders = [
    {id: 'man', text: "muž"},
    {id: 'woman', text: "žena"}
];

var cards = [
    {id: 'yellow', text: "žlutá"},
    {id: 'red', text: "červená"}
];


app.directive("timer", function(){
    return {
        restrict: 'EA',
        replace: false,
        scope: {
            interval: '=',
            interface: '=',
            countdown: '='
        },
        controller: ["$scope", "$element", "$compile", "$timeout", function($scope, $element, $compile, $timeout){
            $element.append($compile($element.contents())($scope));
            var timeoutPromise = null;
            var startTime = null;
            var interval = angular.isDefined($scope.interval) ? $scope.interval : 100;
            var millis = 0;

            var calculateTimeUnits = function () {
                millis = Math.round(millis / 10) * 10;
                $scope.negative = millis < 0;
                if ($scope.negative){
                    millis = 999 - millis;
                }

                $scope.sign = $scope.negative ? "-" : "";
                $scope.deciseconds = Math.floor((millis / 100) % 10);
                $scope.seconds = Math.floor((millis / 1000) % 60);
                $scope.minutes = Math.floor(((millis / (60 * 1000)) % 60));
                $scope.hours = Math.floor(((millis / (60 * 60 * 1000)) % 24));
                $scope.days = Math.floor(((millis / (60 * 60 * 1000)) / 24) % 30);
                $scope.months = Math.floor(((millis / (60 * 60 * 1000)) / 24 / 30) % 12);
                $scope.years = Math.floor((millis / (60 * 60 * 1000)) / 24 / 365);

                $scope.secondsTotal = Math.floor(millis / 1000);
                $scope.minutesTotal = Math.floor(millis / (60 * 1000));
                $scope.hoursTotal = Math.floor(millis / (60 * 60 * 1000));
                $scope.daysTotal = Math.floor(millis / (60 * 60 * 1000) / 24);
                $scope.monthsTotal = Math.floor(millis / (60 * 60 * 1000) / 24 / 30);
                $scope.yearsTotal = Math.floor(millis / (60 * 60 * 1000) / 24 / 365);

                $scope.sseconds = $scope.seconds < 10 ? '0' + $scope.seconds : $scope.seconds;
                $scope.mminutes = $scope.minutes < 10 ? '0' + $scope.minutes : $scope.minutes;
                $scope.hhours = $scope.hours < 10 ? '0' + $scope.hours : $scope.hours;
                $scope.ddays = $scope.days < 10 ? '0' + $scope.days : $scope.days;
                $scope.mmonths = $scope.months < 10 ? '0' + $scope.months : $scope.months;
                $scope.yyears = $scope.years < 10 ? '0' + $scope.years : $scope.years;

                if ($scope.negative){
                    millis = 999 - millis;
                }
            };

            var tick = function () {
                millis = moment().diff(startTime) * ($scope.countdown ? -1 : 1);
                var adjustment = millis % interval;

                if ($scope.interface.running) {
                    timeoutPromise = $timeout(tick, interval - adjustment);
                }
                calculateTimeUnits();
            };

            $scope.interface.setTime = function (time) {
                millis = time;
                calculateTimeUnits();
            };

            $scope.interface.start = function () {
                if ($scope.interface.running){
                    return;
                }
                startTime = moment() - millis * ($scope.countdown ? -1 : 1);
                $scope.interface.running = true;
                tick();
            };

            $scope.interface.reset = function () {
                $scope.interface.stop();
                startTime = null;
                millis = 0;
            };

            $scope.interface.stop = function () {
                $scope.interface.running = false;
                if (timeoutPromise){
                    $timeout.cancel(timeoutPromise);
                }
            };

            $scope.interface.switchState = function () {
                if ($scope.interface.running){
                    $scope.interface.stop();
                }else{
                    $scope.interface.start();
                }
            };

            $scope.interface.addTime = function (time) {
                startTime = moment() - millis * ($scope.countdown ? -1 : 1);
                startTime = startTime - time * ($scope.countdown ? -1 : 1);
                millis = moment().diff(startTime) * ($scope.countdown ? -1 : 1);
                calculateTimeUnits();
            };

            $scope.interface.getTime = function () {
                return millis;
            };

            calculateTimeUnits();
            $scope.interface.running = false;
        }]
   };
});

app.controller("tournamentRegistration", ["$scope", "dataService", "$location", "userService", "$routeParams", function($scope, dataService, $location, userService, $routeParams){
    $scope.user = userService.user;
    var id = $routeParams.id ? parseInt($routeParams.id) : null;
    $scope.registration = {};

    dataService.getTournament(id).then(prepareTournament = function () {
        $scope.tournament = dataService.getObject('tournaments', id);
        $scope.registration.tournament = $scope.tournament.pk;
        dataService.getTeams().then(function (teams) {
            $scope.teams = teams;
        });
    });

    $scope.addTeam = function () {
        dataService.addTeam($scope.newTeam)
            .then(function () {
                $('#newTeam').foundation('reveal', 'close');
                $scope.team = $scope.newTeam;
                $scope.newTeam = {};
            });
    };

    $scope.register = function () {
        $scope.error = null;
        dataService.addTeamOnTournament($scope.registration)
            .then(function (pk) {
                $scope.registration = {};
                $location.path("/turnaj/" + id + "/tym/" + pk);
            })
            .catch(function (msg) {
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
    var tournament_id = parseInt($routeParams.tournament_id);
    $scope.genders = genders;

    dataService.getTournament(tournament_id).then(function () {
        $scope.tournament = dataService.getObject('tournaments', tournament_id);
        dataService.getTeams().then(function () {
            angular.forEach($scope.tournament.teamOnTournaments, function (team) {
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
            .then(function () {
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


app.controller("tournamentMain", ["$scope", "dataService", "$interval", "$location", "userService", "EqualizerState", "$timeout", "$routeParams", function($scope, dataService, $interval, $location, userService, EqualizerState, $timeout, $routeParams){
    var id = $routeParams.id ? parseInt($routeParams.id) : null;
    $scope.user = userService.user;

    dataService.getTournament(id).then(function () {
        $scope.tournament = dataService.getObject('tournaments', id);
        if ($scope.tournament.closed_edit && !$scope.user.is_staff && $location.path() !== "/turnaj-zive"){
            var url = "turnaj/" + $scope.tournament.pk + "/" + $scope.tournament.full_name;
            $location.path(url);
            $window.location.href = url;
        }
        dataService.getTeams().then(function () {
        });
        dataService.getMatches($scope.tournament.pk).then(function (matches) {
            $scope.matchesLoaded = true;

            if ($location.path() === "/turnaj-zive"){
                var i = $interval(function () {
                    if ($scope.refresh) {
                        dataService.refreshTournament($scope.tournament);
                    }
                }, 15 * 1000);
                $scope.$on('$destroy', function() {
                    $interval.cancel(i);
                });
            }
            $timeout(EqualizerState.equalize, 1000);
            $timeout(EqualizerState.equalize, 3000);
        });
    });

    $scope.addMatch = function () {
        $scope.match.tournament = $scope.tournament;
        $scope.match.team_one.goalie = $scope.match.team_one.defaultGoalie;
        $scope.match.team_two.goalie = $scope.match.team_two.defaultGoalie;
        $scope.match.score_one = 0;
        $scope.match.score_two = 0;
        dataService.addMatch($scope.match).then(function () {
            $('#newMatch').foundation('reveal', 'close');
            if ($scope.tournament.is_tournament_open) {
                var url = "turnaj/zapas/" + $scope.tournament.pk + "/" + $scope.match.pk + "/edit";
                $location.path(url);
            }
            $scope.match = null;
        }).catch(function (error) {
            $scope.match.saving_error = error;
        });
    };

    $(document).foundation('reveal');

    $('#newMatch').on('opened.fndtn.reveal', function() {
        $('#newMatch').find('select').get(0).focus();
    });
}]);

var RED_CARD_TIME = 2 * 60 * 1000;
var YELLOW_CARD_TIME = 1 * 60 * 1000;

function getCardPenaltyTime (event) {
    if (event.data.card === "red") {
        return RED_CARD_TIME;
    } else {
        return YELLOW_CARD_TIME;
    }
}

app.controller("tournamentMatch", ["$scope", "$routeParams", "dataService", "$timeout", "$sce", "$filter", "$interval",
                    function($scope, $routeParams, dataService, $timeout, $sce, $filter, $interval){
    var id = parseInt($routeParams.id);
    var tournamentId = parseInt($routeParams.tournamentId);
    $scope.onlyView = $routeParams.edit !== "edit";
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

    $scope.penaltyTimerFilter = function (teamId) { // TODO change to custom filter
        if (!$scope.match) { // why does this happen
            return function() {
                return false;
            };
        }
        var team = $scope.match["team" + teamId];
        var cardsThreshold = 2;

        return function(event, index, events) { // TODO this is called suspiciously frequently
            var penaltyTime = getCardPenaltyTime(event);

            if (!(event.type === "penalty" && event.team === team && (moment.duration(getTime()) - moment.duration(event.time)) <= penaltyTime)) {
                return false;
            }

            if (event.data.card === "red" || event.data.card === "yellow") {
                return true;
            }

            var allCards = events.filter(function(e){
                return (e.type === "penalty" && e.data.player === event.data.player);
            });

            return allCards.length >= cardsThreshold && event === allCards.slice(-1)[0];
        };
    };

    $scope.getRemainingPenaltyTime = function(event) {
        var penaltyTime = getCardPenaltyTime(event);
        var diff = moment.duration(getTime()) - moment.duration(event.time);

        return moment.utc(penaltyTime - diff).format("mm:ss");
    };

    dataService.getMatches(tournamentId).then(function (matches) {
        dataService.getPlayers().then(function () {
            dataService.getTeams().then(function () {
                $timeout(function(){
                    prepareMatch(matches);
                    if ($scope.onlyView){
                        var i = $interval(function () {
                            if ($scope.refresh) {
                                var tournament = dataService.getObject("tournaments", tournamentId);
                                dataService.refreshTournament(tournament).then(function () {
                                    prepareMatch(tournament.matches);
                                });
                            }
                        }, 15 * 1000);
                        $scope.$on('$destroy', function() {
                            $interval.cancel(i);
                        });
                    }else{
                        var i1 = $interval(saveDataLocally, 5 * 1000);
                        var i2 = $interval(saveData, 15 * 1000);
                        $scope.$on('$destroy', function() {
                            $interval.cancel(i1);
                            $interval.cancel(i2);
                        });
                    }
                });
            });
        });
    });

    var prepareMatch = function (matches){
        angular.forEach(matches, function (match) {
            if (id === match.pk){
                $scope.match = match;
                loadMatchLocalData();
                prepareEvents(match);
                $scope.match.halftimeLenght = $scope.match.tournament.halftime_length;
                setTime(match);
                match.team_one.color = "team-blue";
                match.team_two.color = "team-red";
                match.team1 = match.team_one;
                match.team2 = match.team_two;
                if (!match.referee){
                    $scope.startChangeReferee();
                }
            }
        });
    };

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
        dataService.saveMatch(match).then(function () {
            match.changed = false;
        }).finally(saveDataLocally);
    };

    $scope.start = function (switchState) {
        var start = switchState ? $scope.timer.switchState: $scope.timer.start;
        if (!$scope.match.team_one.goalie || !$scope.match.team_two.goalie){
            toastr.error("Není nastaven brankář.");
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
         if ($scope.onlyView || (!$scope.edit && $scope.match.halftime === null)){
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
         if ($scope.onlyView || (!$scope.edit && $scope.match.halftime === null)){
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
        toastr.success('Střela uložena');
        saveData();
    };

    $scope.saveGoal = function (assistance) {
        if (assistance === $scope.goal.shooter){
            return;
        }
        $scope.goal.assistance = assistance;
        $scope.match.events.push({
            type: "goal",
            time: $scope.goal.time,
            data: $scope.goal,
            saved: false,
            team: $scope.goal.team
        });
        $('#newGoal').foundation('reveal', 'close');
        toastr.success('Gól uložen');
        saveData();
    };

    $scope.savePenalty = function () {
        if ($scope.penalty.reason_extra) {
            $scope.penalty.reason += " - " + $scope.penalty.reason_extra;
        }
        angular.forEach(cards, function (card) {
            if (card.id === $scope.penalty.card) {
                $scope.penalty.cardText = card.text;
            }
        });
        $scope.match.events.push({
            type: "penalty",
            time: $scope.penalty.time,
            data: $scope.penalty,
            team: $scope.penalty.team,
            saved: false
        });
        $('#newPenalty').foundation('reveal', 'close');
        toastr.success('Karta uložena');
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
        toastr.success('Brankář změněn');
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
        $scope.editEvent.onlyEdit = true;
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
                dataService.removeEvent(event.data, event.type).then(function () {
                    $scope.match.events.splice($scope.match.events.indexOf(event), 1);
                    if (event.type === "goal"){
                        if (event.team === $scope.match.team_one){
                            $scope.match.score_one--;
                        }else{
                            $scope.match.score_two--;
                        }
                    }
                });
            } else {
                $scope.match.events.splice($scope.match.events.indexOf(event), 1);
            }
            calculateEventCounts();
        }
    };

    var calculateEventCounts = function () {
        $scope.match.team_one.counts = {'shots': 0, goals: 0};
        $scope.match.team_two.counts = {'shots': 0, goals: 0};
        if (!$scope.match){
            return;
        }
        angular.forEach($scope.match.events, function (event) {
            if (event.type === "goal" || event.type === "shot"){
                event.team.counts[event.type+"s"]++;
            }
        });
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
        if ($scope.onlyView){
            return;
        }
        dataService.ping().then(function () {
            loadMatchLocalData();
            angular.forEach($scope.match.events, function (event) {
                if (!event.saved && !event.data.saving) {
                    if (event.type === "goalieChange"){
                        dataService.goalieChange(event.data).then(function () {
                            event.saved = true;
                        }).finally(saveDataLocally);
                    }else {
                        dataService.saveEvent(event.data, event.type).then(function () {
                            event.saved = true;
                            if (event.type === "goal" && !event.onlyEdit){
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

    var loadMatchLocalData = function () {
        var match = localStorage.getItem("match" + $scope.match.pk);
        if (match){
            match = JSON.parse(match);
            angular.extend($scope.match, match);
            $scope.match.referee = dataService.getObject("players", match.referee);
            saveMatch($scope.match);
        }
    };

    $scope.switchTeamSides = function () {
        var tmp = $scope.match.team1;
        $scope.match.team1 = $scope.match.team2;
        $scope.match.team2 = tmp;
    };
}]);

app.controller("groups", ["$scope", "dataService", "$routeParams", function($scope, dataService, $routeParams){
    var tournament_id = parseInt($routeParams.id);
    dataService.getGroups(tournament_id).then(function(data){
        $scope.groups = data.groups;
        $scope.matches = data.matches;
        $scope.stats = data.stats;
    });

    dataService.getTournaments().then(function (tournament) {
        $scope.tournament = dataService.getObject('tournaments', tournament_id);
    });
}]);

app.controller("referee_feedbacks", ["$scope", "dataService", "$routeParams", "userService", "$timeout", function($scope, dataService, $routeParams, userService, $timeout){
    var tournament_id = parseInt($routeParams.id);

    $(document).foundation('reveal');
    $(document).on('closed.fndtn.reveal', '[data-reveal]', function () {
        if ($scope.match.referee_feedback.saved) {
            $scope.match.referee_feedback.saved = false;
        } else {
            $scope.save();
        }
    });

    dataService.getTournaments().then(function (tournament) {
        $scope.tournament = dataService.getObject('tournaments', tournament_id);
    });

    $scope.getRefereeFeedbacks = function () {
        dataService.getRefereeFeedbacks(tournament_id)
            .then(function (matches) {
                $scope.matches = matches;
            }).catch(function (error){
                $scope.error = error;
        });
    };
    $scope.getRefereeFeedbacks();

    $scope.newFeedback = function (match) {
        match.referee_feedback = {
            match: match.pk,
            author: userService.user.player.pk,
            feedback: {
                stars: 0,
                positives: [],
                negatives: [],
                comment: "",
            },

    };
        $scope.match = match;
        $scope.feedback = match.referee_feedback.feedback;
    };

    $scope.editFeedback = function (match) {
        $scope.match = match;
        $scope.feedback = match.referee_feedback.feedback;
    };

    $scope.changeRating = function ($event) {
        $scope.feedback.stars = $event.rating;
    };

    $scope.starsColor = function (rating, numOfStars, staticColor) {
        return 'ok';
    };

    $scope.starChange = function (value) {
        $scope.feedback.stars = Math.min(5, Math.max(0.5, $scope.feedback.stars + value));
    };

    $scope.addPositive = function () {
        $scope.feedback.positives.push('');
        $timeout(function (){
            $('#positives input:last-child')[0].focus();
        });
    };

    $scope.addNegative = function () {
        $scope.feedback.negatives.push('');
        $timeout(function (){
            $('#negatives input:last-child')[0].focus();
        });
    };

    $scope.save = function () {
        if ($scope.feedback.stars === 0) {
            return;
        }
        dataService.saveFeedback($scope.match.referee_feedback)
            .then(function (){
                $scope.match.referee_feedback.saved = true;
                $('#feedback-modal').foundation('reveal', 'close');
            });
    };
}]);

app.service("userService", ["$http", "djangoUrl", function($http, djangoUrl){
    var self = this;
    self.status = {
        "logged": false,
        "loading": false
    };
    self.user = {};
    self.error = {};

    // called on create
    self.init = function (){
        self.processUser(user);
    };

    // get user profile from backend
    self.loadUser = function(){
        self.status.loading = true;
        return $http.get(djangoUrl.reverse("api:user_profile"))
            .then(function(response){
                response = response.data;
                _processUser(response);
                return response;
            })
            .finally(function(response){
                self.status.loading = false;
            });
    };

    self.processUser = function(data){
        _processUser(angular.copy(data));
    };

    // process user data
    var _processUser = function(data){
        if (!data) {
            self.status.logged = false;
            return;
        }
        self.status.logged = true;
        angular.extend(self.user, data);
    };

    self.logout = function(){
        self.status.loading = true;
        $http.get(djangoUrl.reverse("api:logout"))
            .then(function(response){
                response = response.data;
                clearObj(self.user);
                self.status.logged = false;
                return response;
            })
            .finally(function(response){
                self.status.loading = false;
            });
    };

    self.pairUser = function (token) {
        return $http.post(djangoUrl.reverse("api:pair_user", {pairing_token: token}), {})
            .then(function(response){
                var player = response.data;
                self.user.player = player;
                return player;
            })
            .catch(function(error){
                throw error.data;
            });
    };

    var _resetError = function(){
        clearObj(self.error);
    };

    var clearObj = function(obj){
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)){ delete obj[prop]; }
        }
    };

    self.loadUserFromJS = function (scope) {
        scope.$apply(self.loadUser());
    };

    self.loginGoogle = function() {
        _openPopup("/login/google-oauth2/", "/close_login_popup/");
    };

    self.loginFacebook = function() {
        _openPopup("/login/facebook/", "/close_login_popup/");
    };

    self.login = function(username, pass){
        self.status.loading = true;
        _resetError();
        var promise = $http.post(djangoUrl.reverse("api:login"), {
            username: username,
            password: pass
        });
        promise.then(function(response){
                _processUser(response.data);
                return response.data;
            })
            .catch(function(error){
                self.error = error.data;
                throw error.data;
            })
            .finally(function(response){
                self.status.loading = false;
            });
        return promise;
    };

    self.signup = function(data){
        self.status.loading = true;
        _resetError();
        var promise = $http.post(djangoUrl.reverse("api:signup"), data);
        promise.then(function(response){
                _processUser(response.data);
                return response.data;
            })
            .catch(function(error){
                self.error = error.data;
                throw error.data;
            })
            .finally(function(response){
                self.status.loading = false;
            });
        return promise;
    };

    var _openPopup = function(url, next){
        var settings = 'height=700,width=700,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=yes,directories=no,status=yes';
        url += "?next=" + next;
        window.open(url, "popup", settings);
    };

    self.init();

}]);

app.controller("auth", ["$scope", "userService", "$location", "$routeParams", "$timeout", function($scope, userService, $location, $routeParams, $timeout){
    var token = $routeParams.token;
    if (token){
        localStorage.setItem("token", token);
        $scope.token = token;
    }else if (localStorage.getItem("token")){
        $scope.token = localStorage.getItem("token");
    }

    $scope.userService = userService;
    $scope.user = userService.user;

    $scope.openProfile = function () {
        if (userService.user.player){
            $location.path("/hrac/" + userService.user.player.pk + "/" + userService.user.player.nickname);
        }else{
            $location.path("/sparovat_ucet");
        }
    };

    $scope.pairUser = function (token) {
        userService.pairUser(token).then(function(){
            $scope.openProfile();
        })
        .error(function(response){
            $scope.error = "Spárování se nezdařilo  - " + response;
        });
    };

    $scope.credentials = {};
    $scope.login = function () {
        userService.login($scope.credentials.username, $scope.credentials.password)
            .then(function () {
                $('#login-modal').foundation('reveal', 'close');
            }).catch(function (response) {
                toastr.error(response.error);
        });
    };

    $scope.signup = function () {
        userService.signup($scope.credentials)
            .then(function () {
                $('#sign-up-modal').foundation('reveal', 'close');
            }).catch(function (response) {
                toastr.error(response.error);
        });
    };

    $timeout(function(){ $(document).foundation('reveal'); });
}]);


var social_auth_callback = function(){
    var element = angular.element($("body"));
    element.injector().get("userService").loadUserFromJS(element.scope());
};

function saveLocally(key, value, ttl_seconds) {
    var now = new Date();

    var item = {
        value: value,
        expiry: now.getTime() + ttl_seconds * 1000,
    };
    localStorage.setItem(key, JSON.stringify(item));
}

function loadLocally(key) {
    var itemStr = localStorage.getItem(key);
    if (!itemStr) {
        return null;
    }

    var item = JSON.parse(itemStr);
    if (!item.expiry || new Date().getTime() > item.expiry) {
        localStorage.removeItem(key);
        return null;
    }
    return item.value;
}


var datetimeFormat = "YYYY-MM-DD HH:mm:ss";
app.directive('stPersist', ["$timeout", function ($timeout) {
    return {
        require: '^stTable',
        scope: {
            stPersist: "=stPersist",
            sortCallback: '&'
        },
        link: function (scope, element, attr, ctrl) {
            var nameSpace = attr.stPersist;

            scope.$watch(ctrl.tableState, function (newValue, oldValue) {
                if (newValue !== oldValue && scope.dataLoaded) {
                    saveLocally(nameSpace, JSON.stringify(newValue), 60 * 60 * 24);
                    if (newValue.sort.predicate !== oldValue.sort.predicate) {
                        scope.sortCallback();
                    }
                }
            }, true);

            scope.$watch("stPersist", function (newValue, oldValue) {
                if (newValue) {
                    scope.dataLoaded = true;
                    var savedState = loadLocally(nameSpace);
                    if (savedState) {
                        savedState = JSON.parse(savedState);
                        var tableState = ctrl.tableState();
                        angular.extend(tableState, savedState);

                        ctrl.pipe();
                    }
                }
            });

        }
    };
}]);

 app.directive("stResetSearch", function() {
     return {
        restrict: 'EA',
        require: '^stTable',
        link: function(scope, element, attrs, ctrl) {
          return element.bind('click', function() {
            return scope.$apply(function() {
              var tableState;
              tableState = ctrl.tableState();
              tableState.search.predicateObject = {};
              tableState.pagination.start = 0;
              return ctrl.pipe();
            });
          });
        }
      };
});

app.directive('stRank', [function () {
    return {
        require: '^stTable',
        link: function (scope, element, attr, ctrl) {
            scope.$watch(ctrl.tableState, function () {
                angular.forEach(ctrl.getFilteredCollection(), function(row, index) {
                    row.rank = index + 1;
                });
            }, true);
        }
    };
}]);

var shallowCopy = function(obj, pks){
    var newObj = {};
    angular.forEach(obj, function(value, key){
        if (typeof value !== "object"){
            newObj[key] = value;
        }else if (pks && value && value.pk){
            newObj[key] = value.pk;
        }
    });
    return newObj;
};

app.directive('back', function(){
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element.bind('click', goBack);
            function goBack() {
                history.back();
                scope.$apply();
            }
        }
    };
});

function unique(arr){
    var newArray = [];
    for(var i=0, j=arr.length; i<j; i++) {
        if (newArray.indexOf(arr[i]) === -1) {
            newArray.push(arr[i]);
        }
    }
    return newArray;
}

var inTeam = function (team, player) {
    var result = false;
    angular.forEach(team.players, function (p) {
        if(p === player || p.pk === player){
            result = true;
        }
    });
    return result;
};

var defaultDiacriticsRemovalMap = [
    {'base':'A', 'letters':'\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F'},
    {'base':'AA','letters':'\uA732'},
    {'base':'AE','letters':'\u00C6\u01FC\u01E2'},
    {'base':'AO','letters':'\uA734'},
    {'base':'AU','letters':'\uA736'},
    {'base':'AV','letters':'\uA738\uA73A'},
    {'base':'AY','letters':'\uA73C'},
    {'base':'B', 'letters':'\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181'},
    {'base':'C', 'letters':'\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E'},
    {'base':'D', 'letters':'\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779'},
    {'base':'DZ','letters':'\u01F1\u01C4'},
    {'base':'Dz','letters':'\u01F2\u01C5'},
    {'base':'E', 'letters':'\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E'},
    {'base':'F', 'letters':'\u0046\u24BB\uFF26\u1E1E\u0191\uA77B'},
    {'base':'G', 'letters':'\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E'},
    {'base':'H', 'letters':'\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D'},
    {'base':'I', 'letters':'\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197'},
    {'base':'J', 'letters':'\u004A\u24BF\uFF2A\u0134\u0248'},
    {'base':'K', 'letters':'\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2'},
    {'base':'L', 'letters':'\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780'},
    {'base':'LJ','letters':'\u01C7'},
    {'base':'Lj','letters':'\u01C8'},
    {'base':'M', 'letters':'\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C'},
    {'base':'N', 'letters':'\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4'},
    {'base':'NJ','letters':'\u01CA'},
    {'base':'Nj','letters':'\u01CB'},
    {'base':'O', 'letters':'\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C'},
    {'base':'OI','letters':'\u01A2'},
    {'base':'OO','letters':'\uA74E'},
    {'base':'OU','letters':'\u0222'},
    {'base':'OE','letters':'\u008C\u0152'},
    {'base':'oe','letters':'\u009C\u0153'},
    {'base':'P', 'letters':'\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754'},
    {'base':'Q', 'letters':'\u0051\u24C6\uFF31\uA756\uA758\u024A'},
    {'base':'R', 'letters':'\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782'},
    {'base':'S', 'letters':'\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784'},
    {'base':'T', 'letters':'\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786'},
    {'base':'TZ','letters':'\uA728'},
    {'base':'U', 'letters':'\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244'},
    {'base':'V', 'letters':'\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245'},
    {'base':'VY','letters':'\uA760'},
    {'base':'W', 'letters':'\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72'},
    {'base':'X', 'letters':'\u0058\u24CD\uFF38\u1E8A\u1E8C'},
    {'base':'Y', 'letters':'\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE'},
    {'base':'Z', 'letters':'\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762'},
    {'base':'a', 'letters':'\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250'},
    {'base':'aa','letters':'\uA733'},
    {'base':'ae','letters':'\u00E6\u01FD\u01E3'},
    {'base':'ao','letters':'\uA735'},
    {'base':'au','letters':'\uA737'},
    {'base':'av','letters':'\uA739\uA73B'},
    {'base':'ay','letters':'\uA73D'},
    {'base':'b', 'letters':'\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253'},
    {'base':'c', 'letters':'\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184'},
    {'base':'d', 'letters':'\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A'},
    {'base':'dz','letters':'\u01F3\u01C6'},
    {'base':'e', 'letters':'\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD'},
    {'base':'f', 'letters':'\u0066\u24D5\uFF46\u1E1F\u0192\uA77C'},
    {'base':'g', 'letters':'\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F'},
    {'base':'h', 'letters':'\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265'},
    {'base':'hv','letters':'\u0195'},
    {'base':'i', 'letters':'\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131'},
    {'base':'j', 'letters':'\u006A\u24D9\uFF4A\u0135\u01F0\u0249'},
    {'base':'k', 'letters':'\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3'},
    {'base':'l', 'letters':'\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747'},
    {'base':'lj','letters':'\u01C9'},
    {'base':'m', 'letters':'\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F'},
    {'base':'n', 'letters':'\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5'},
    {'base':'nj','letters':'\u01CC'},
    {'base':'o', 'letters':'\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275'},
    {'base':'oi','letters':'\u01A3'},
    {'base':'ou','letters':'\u0223'},
    {'base':'oo','letters':'\uA74F'},
    {'base':'p','letters':'\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755'},
    {'base':'q','letters':'\u0071\u24E0\uFF51\u024B\uA757\uA759'},
    {'base':'r','letters':'\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783'},
    {'base':'s','letters':'\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B'},
    {'base':'t','letters':'\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787'},
    {'base':'tz','letters':'\uA729'},
    {'base':'u','letters': '\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289'},
    {'base':'v','letters':'\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C'},
    {'base':'vy','letters':'\uA761'},
    {'base':'w','letters':'\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73'},
    {'base':'x','letters':'\u0078\u24E7\uFF58\u1E8B\u1E8D'},
    {'base':'y','letters':'\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF'},
    {'base':'z','letters':'\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763'}
];

var diacriticsMap = {};
for (var i=0; i < defaultDiacriticsRemovalMap .length; i++){
    var letters = defaultDiacriticsRemovalMap [i].letters;
    for (var j=0; j < letters.length ; j++){
        diacriticsMap[letters[j]] = defaultDiacriticsRemovalMap [i].base;
    }
}

function removeDiacritics (str) {
    return str.replace(/[^\u0000-\u007E]/g, function(a){
       return diacriticsMap[a] || a;
    });
}

function getGoalieScore (tournament, dataService) {
    var goalies = {};
    angular.forEach(tournament.matches, function (match) {
        if (!match.length){
            return;
        }
        angular.forEach(match.goalies, function (goalieOnMatch) {
            if (!goalies[goalieOnMatch.goalie]){
                var player = dataService.getObject("players", goalieOnMatch.goalie);
                goalies[goalieOnMatch.goalie] = {
                    pk: player.pk,
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
                if (goal.team !== goalie.team && goalieOnMatch.start <= goal.time && goal.time <= goalieOnMatch.end){
                    goalie.goals++;
                    goalie.shots++;
                }
            });
            angular.forEach(match.shots, function (shot) {
                if (shot.team !== goalie.team.pk && goalieOnMatch.start <= shot.time && shot.time <= goalieOnMatch.end){
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
    if (goalies.length === 0){
        return null;
    }
    return goalies;
}

angular.module('ufoIS').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('auth.html',
    "<li><a href=\"/faq\">Co a jak?</a></li>\n" +
    "<li ng-show=\"user.is_staff\"><a href=\"/managestats/\" target=\"_self\">Admin</a></li>\n" +
    "\n" +
    "<li class=\"has-dropdown not-click\">\n" +
    "    <a href=\"#\" ng-show=\"userService.status.logged\">{{ user.first_name }} {{ user.last_name }} <span ng-show=\"user.player\">- {{ user.player.nickname }}</span></a>\n" +
    "    <a href=\"#\" ng-hide=\"userService.status.logged\"> Přihlášení </a>\n" +
    "\n" +
    "    <ul class=\"dropdown\">\n" +
    "        <li ng-show=\"userService.status.logged\"><a href=\"#\" ng-click=\"openProfile()\">Profil hráče</a></li>\n" +
    "        <li ng-show=\"userService.status.logged\"><a ng-click=\"userService.logout()\">Odhlásit se</a></li>\n" +
    "        <li ng-hide=\"userService.status.logged\">\n" +
    "            <a class=\"login-provider\" id=\"login-google\" ng-click=\"userService.loginGoogle()\">\n" +
    "                <img width=\"24\" height=\"24\" class=\"provider-signup-img\" src=\"static/google-icon.png\">\n" +
    "                <span class=\"provider-signup-text\">přes <b>Google</b></span>\n" +
    "            </a>\n" +
    "        </li>\n" +
    "        <li ng-hide=\"userService.status.logged\">\n" +
    "            <a class=\"login-provider\" id=\"login-facebook\" ng-click=\"userService.loginFacebook()\">\n" +
    "                <img width=\"24\" height=\"24\" class=\"provider-signup-img\" src=\"static/facebook-icon.png\">\n" +
    "                <span class=\"provider-signup-text\">přes <b>Facebook</b>&nbsp;&nbsp;&nbsp;&nbsp;</span>\n" +
    "            </a>\n" +
    "        </li>\n" +
    "        <li ng-hide=\"userService.status.logged\">\n" +
    "            <a class=\"login-provider\" href=\"#\" id=\"login-email\" data-reveal-id=\"login-modal\">\n" +
    "                <i class=\"fi-at-sign\"></i>\n" +
    "                <span class=\"provider-signup-text\">přes <b>jméno</b></span>\n" +
    "            </a>\n" +
    "        </li>\n" +
    "        <li ng-hide=\"userService.status.logged\">\n" +
    "            <a class=\"login-provider\" href=\"#\" id=\"login-email\" data-reveal-id=\"sign-up-modal\">\n" +
    "                <i class=\"fi-arrow-up\"></i>\n" +
    "                <span class=\"provider-signup-text\">registrovat</span>\n" +
    "            </a>\n" +
    "        </li>\n" +
    "    </ul>\n" +
    "</li>\n" +
    "\n" +
    "<div id=\"login-modal\" class=\"reveal-modal small\" data-reveal>\n" +
    "    <a class=\"close-reveal-modal\">&#215;</a><br/>\n" +
    "    <form ng-submit=\"login()\">\n" +
    "        <div class=\"row collapse\">\n" +
    "            <div class=\"columns medium-12 large-5\">\n" +
    "                <input ng-model=\"credentials.username\" type=\"text\" placeholder=\"jméno\" name=\"username\" />\n" +
    "            </div>\n" +
    "            <div class=\"columns medium-8 large-5\">\n" +
    "                <input ng-model=\"credentials.password\" class=\"columns medium-5\" type=\"password\" placeholder=\"heslo\" name=\"password\" />\n" +
    "            </div>\n" +
    "            <div class=\"columns medium-4 large-2\">\n" +
    "                <input type=\"submit\" class=\"button postfix\" value=\"Přihlásit\">\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </form>\n" +
    "</div>\n" +
    "\n" +
    "<div id=\"sign-up-modal\" class=\"reveal-modal small\" data-reveal>\n" +
    "    <a class=\"close-reveal-modal\">&#215;</a><br/>\n" +
    "    <form ng-submit=\"signup()\">\n" +
    "        <label> Uživatelské jméno\n" +
    "            <input ng-model=\"credentials.username\" required type=\"text\" name=\"username\" />\n" +
    "        </label>\n" +
    "        <label> Email\n" +
    "            <input ng-model=\"credentials.email\" required type=\"email\" name=\"username\" />\n" +
    "        </label>\n" +
    "        <label> Heslo\n" +
    "            <input ng-model=\"credentials.password\" required type=\"password\" name=\"username\" />\n" +
    "        </label>\n" +
    "        <label> Kontrola hesla\n" +
    "            <input ng-model=\"credentials.password_check\" required type=\"password\"  name=\"username\" />\n" +
    "        </label>\n" +
    "        <label> Jméno\n" +
    "            <input ng-model=\"credentials.first_name\" type=\"text\" placeholder=\"nepovinné\" name=\"username\" />\n" +
    "        </label>\n" +
    "        <label> Příjmení\n" +
    "            <input ng-model=\"credentials.last_name\" type=\"text\" placeholder=\"nepovinné\" name=\"username\" />\n" +
    "        </label>\n" +
    "\n" +
    "        <div class=\"medium-5 columns\">\n" +
    "            <input type=\"submit\" class=\"button postfix\" value=\"Registrovat\">\n" +
    "        </div>\n" +
    "    </form>\n" +
    "</div>\n"
  );


  $templateCache.put('faq.html',
    "<h3>Co a jak?</h3>\n" +
    "\n" +
    "<h5>Co tento web vlastně je</h5>\n" +
    "<p>\n" +
    "    Jde o informační systém ufobalu (talířové taky). Naším cílem je shromáždit historické údaje do jedno systému,\n" +
    "    kde k nim bude snadný a rychlý přístup. Do budoucna (když se najde dobré technické řešení) chceme,\n" +
    "    aby se zápisy na turnaji dělali přímo do systému. Což nám umožní mít podrobnější, přesnější a rychlejší statistiky z turnajů.\n" +
    "</p>\n" +
    "\n" +
    "<h5>Co od vás potřebujeme</h5>\n" +
    "<p>\n" +
    "    Rádi bychom udělali historická data co nejvíce kompletní.\n" +
    "    Z tabulek výsledků se bohužel nedá vyčíst všechno a obsahují spoustu chyb a nejasností.\n" +
    "    Udělali jsme co šlo, abychom správně spojili výsledky z Nížkova, Brna a halových turnajů,\n" +
    "    ale nevíme všechno a neznáme všechny, takže bychom vás rádi poprosili o následující:\n" +
    "</p>\n" +
    "<ul>\n" +
    "    <li><b>Šiřte tento web</b> mezi další hráče ufobalu, aby nám taky pomohli. Použijte prosím odkaz <b><a target=\"_blank\" href=\"http://is.ufobal.cz/intro\">is.ufobal.cz/intro</a></b>.</li>\n" +
    "    <li>Najděte sebe a <b>doplňte osobní údaje</b> o sobě - hlavně jméno a pohlaví.</li>\n" +
    "    <li><b>Vyplňte za jaké týmy jste hráli</b> - víme, kde jste dali góly, ale bohužel ne vždy za jaký tým.</li>\n" +
    "    <li>\n" +
    "        <b>Zkontrolujte sebe a svůj tým</b> (týmy). Zejména očekáváme tyto problémy\n" +
    "        <ul>\n" +
    "            <li>Hráč je mezi hráči vícekrát.</li>\n" +
    "            <li>To stejné s týmy.</li>\n" +
    "            <li>Hráči chybějí nějaké góly.</li>\n" +
    "            <li>Špatné pořadí na turnaji. (Chybějící pořadí nehlašte, leda že byste znali celkové výsledky turnaje.)</li>\n" +
    "        </ul>\n" +
    "    </li>\n" +
    "    <li><b>Nahlašte nalezené problémy <a href=\"https://docs.google.com/forms/d/1AcEV9XoB__lzwH9sN71xINuW0r6bsnyIMRUMyLJByHM/viewform\" target=\"_blank\">sem</a></b>.</li>\n" +
    "    <li>Pro<b>hledejte</b> svoje disky a emaily (nevěřili byste, co se tam dá najít) jestli nemáte nějaké <b>historické tabulky s výsledky</b> (hlavně ty turnaje, které nemají pořadí týmů) a pošlete <a href=\"mailto:thran@centrum.cz\">nám</a> je.</li>\n" +
    "</ul>\n" +
    "\n" +
    "<p ng-show=\"intro\">\n" +
    "    Tyto a <b>další informace</b> budou vždy dostupné pod odkazem <i>Co a jak?</i> v horní liště napravo.\n" +
    "    <br>\n" +
    "    <b>Děkujme</b> všem, co se aktivně zapojí.\n" +
    "</p>\n" +
    "\n" +
    "<div ng-hide=\"intro\">\n" +
    "\n" +
    "    <h3>Často kladené dotazy</h3>\n" +
    "\n" +
    "    <h5>Můžu něco pokazit?</h5>\n" +
    "    <p>\n" +
    "        Krom znehodnocení dat o hráčích asi ne. Ale prosím, nezkoušejte to.\n" +
    "    </p>\n" +
    "\n" +
    "    <h5>Musím si vyplňovat jméno, příjmení a datum narození?</h5>\n" +
    "    <p>\n" +
    "        Rozhodně ne, ale budeme rádi. Díky jménu bude jasné o koho se přesně jedná.\n" +
    "        Datum budeme vždy zobrazovat jen jako věk a do budoucna bude použito pro nějaké statistiky.\n" +
    "        Slibujeme, že ho nikomu neřekneme.\n" +
    "    </p>\n" +
    "\n" +
    "    <h5>Nemůžu najít svůj tým na nějakém turnaji.</h5>\n" +
    "    <p>\n" +
    "        Bohužel u všech turnajů nevíme přesně, které týmy tam hráli.\n" +
    "        Pokud máte seznam týmů (nejlépe s pořadím) na nějakém turnaji, pošlete <a href=\"mailto:thran@centrum.cz\">nám</a> ho.\n" +
    "    </p>\n" +
    "\n" +
    "    <h5>Proč někteří hráči mají ve jméně jména týmů?</h5>\n" +
    "    <p>\n" +
    "        Ve výsledcích jsou často hráči stejného jména a někdy není jasné jaký hráč z Nížkova patří ke kterému z Brna.\n" +
    "        Aby bylo jasné o koho jde, pro jistotu jsme připojili jméno týmů, ve kterém hráč hrál.\n" +
    "        Pokud je hráč nějak identifikovatelný (doplněné jméno nebo účasti na turnajích), týmy se ze jména může smazat.\n" +
    "    </p>\n" +
    "\n" +
    "    <h5>Můžu vyplnit údaje za někoho jiného?</h5>\n" +
    "    <p>Ano, ale vyplňujte jen to čím jste si jisti.</p>\n" +
    "\n" +
    "</div>"
  );


  $templateCache.put('groups.html',
    "<a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "<hr>\n" +
    "\n" +
    "<h1>Skupiny - {{ tournament.full_name }}</h1>\n" +
    "\n" +
    "<div class=\"loader\" ng-hide=\"groups\"></div>\n" +
    "\n" +
    "<div ng-repeat=\"group in groups\">\n" +
    "    <h3 id=\"{{ group.name }}\">{{ group.name }}</h3>\n" +
    "    <table class=\"group\" ng-if=\"!group.playoff\">\n" +
    "        <tr class=\"first-line\">\n" +
    "            <th></th>\n" +
    "            <th ng-repeat=\"team in group.teams\"><a href=\"/tym/{{ team.team.pk }}/{{ team.team.name }}\">{{ team.name_pure }}</a></th>\n" +
    "            <td>V / P / R</td>\n" +
    "            <td>Skóre</td>\n" +
    "        </tr>\n" +
    "        <tr ng-repeat=\"team in group.teams\" ng-init=\"stats = stats[team.pk][group.level]\">\n" +
    "            <th>{{ team.name_pure }}</th>\n" +
    "            <td ng-repeat=\"team2 in group.teams\" ng-init='score = matches[team.pk+\"-\"+team2.pk][group.level]'>\n" +
    "                <span ng-show=\"score\">{{ score[0] }} : {{ score[1] }}<span ng-show=\"score[2]\">P</span></span>\n" +
    "            </td>\n" +
    "            <td><span>\n" +
    "                {{ stats['wins'] }}<span ng-show=\"stats['winsP']\">({{ stats['winsP'] }}P)</span> /\n" +
    "                {{ stats['looses'] }}<span ng-show=\"stats['loosesP']\">({{ stats['loosesP'] }}P)</span> /\n" +
    "                {{ stats['draws'] }}</span></td>\n" +
    "            <td><span ng-show=\"stats['score']\">{{ stats['score'][0] }} : {{ stats['score'][1] }}</span></td>\n" +
    "        </tr>\n" +
    "    </table>\n" +
    "\n" +
    "    <table class=\"playoff\" ng-if=\"group.playoff\">\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[0][0].win }\">{{ group.playoff[0][0].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[0][0].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[0][1].win }\">{{ group.playoff[0][1].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[0][1].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[1][0].win }\">{{ group.playoff[1][0].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[1][0].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[1][1].win }\">{{ group.playoff[1][1].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[1][1].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[0][2].win }\">{{ group.playoff[0][2].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[0][2].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black; border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[0][3].win }\">{{ group.playoff[0][3].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[0][3].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td class=\"gray\">Finále</td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[2][0].win }\">{{ group.playoff[2][0].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[2][0].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[2][1].win }\">{{ group.playoff[2][1].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[2][1].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[0][4].win }\">{{ group.playoff[0][4].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[0][4].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[0][5].win }\">{{ group.playoff[0][5].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[0][5].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2  ng-class=\"{bold: group.playoff[1][2].win }\">{{ group.playoff[1][2].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[1][2].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td class=\"gray\">O 3. místo</td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            <td style=\"border-bottom: 1px solid black; border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[2][2].win }\">{{ group.playoff[2][2].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[2][2].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[1][3].win }\">{{ group.playoff[1][3].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[1][3].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[0][6].win }\">{{ group.playoff[0][6].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[0][6].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[2][3].win }\">{{ group.playoff[2][3].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[2][3].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td style=\"border-bottom: 1px solid black; border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            </tr>\n" +
    "        <tr>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[0][7].win }\">{{ group.playoff[0][7].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[0][7].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[1][4].win }\">{{ group.playoff[1][4].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[1][4].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[1][5].win }\">{{ group.playoff[1][5].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[1][5].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td class=\"gray\">O 5. místo</td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[2][4].win }\">{{ group.playoff[2][4].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[2][4].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\"></td>\n" +
    "            </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[2][5].win }\">{{ group.playoff[2][5].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[2][5].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[1][6].win }\">{{ group.playoff[1][6].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[1][6].score }}</td>\n" +
    "            <td style=\"border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td class=\"gray\">O 7. místo</td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black; border-right: 1px solid black\"></td>\n" +
    "            <td></td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2 ng-class=\"{bold: group.playoff[2][6].win }\">{{ group.playoff[2][6].team.name_pure }}</td>\n" +
    "            <td style=\"border-bottom: 1px solid black\" rowspan=2>{{ group.playoff[2][6].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2  ng-class=\"{bold: group.playoff[1][7].win }\">{{ group.playoff[1][7].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[1][7].score }}</td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td rowspan=2 ng-class=\"{bold: group.playoff[2][7].win }\">{{ group.playoff[2][7].team.name_pure }}</td>\n" +
    "            <td rowspan=2>{{ group.playoff[2][7].score }}</td>\n" +
    "        </tr>\n" +
    "        <tr>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "            <td></td>\n" +
    "        </tr>\n" +
    "    </table>\n" +
    "    <hr>\n" +
    "</div>\n"
  );


  $templateCache.put('hall_of_records.html',
    "<div class=\"row\"><div class=\"columns medium-8 medium-offset-2\">\n" +
    "    <h3>Síň rekordů</h3>\n" +
    "    <div class=\"loader\" ng-hide=\"stats\"></div>\n" +
    "\n" +
    "    <div id=\"hall-of-glory\" ng-cloak ng-show=\"stats\">\n" +
    "        <div>\n" +
    "            Maximální počet týmů na turnaji:\n" +
    "            <b>{{ stats.max_teams_per_tournament.value }} týmů na turnaji</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_teams_per_tournament.instances\">\n" +
    "                    <a ng-href=\"turnaj/{{ instance.pk }}/{{ instance.full_name }}\">{{ instance.full_name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Maximální počet zápasů na turnaji:\n" +
    "            <b>{{ stats.max_matches_per_tournament.value }} zápasů na turnaji</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_matches_per_tournament.instances\">\n" +
    "                <a ng-href=\"turnaj/{{ instance.pk }}/{{ instance.full_name }}\">{{ instance.full_name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Tým s nejvíce zápasy:\n" +
    "            <b>{{ stats.max_matches_per_team.value }} zápasů týmu</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_matches_per_team.instances\">\n" +
    "                <a ng-href=\"tym/{{ instance.pk }}/{{ instance.name }}\">{{ instance.name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Tým s nejvíce góly:\n" +
    "            <b>{{ stats.max_goals_per_team.value }} gólů týmu</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_goals_per_team.instances\">\n" +
    "                <a ng-href=\"tym/{{ instance.pk }}/{{ instance.name }}\">{{ instance.name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Tým s nejvíce góly na zápas:\n" +
    "            <b>{{ stats.max_avg_goals_per_team.value | number:1  }} gólů na zápas týmu</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_avg_goals_per_team.instances\">\n" +
    "                <a ng-href=\"tym/{{ instance.pk }}/{{ instance.name }}\">{{ instance.name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Hráč s nejvíce góly na turnaji:\n" +
    "            <b>{{ stats.max_goal_per_tournament_player.value }} gólů</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_goal_per_tournament_player.instances\">\n" +
    "                <a ng-href=\"hrac/{{ instance[0].pk }}/{{ instance[0].full_name }}\">{{ instance[0].full_name }}</a>,\n" +
    "                <a ng-href=\"turnaj/{{ instance[1].pk }}/{{ instance[1].full_name }}\">{{ instance[1].full_name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Hráč s nejvíce asistencemi na turnaji:\n" +
    "            <b>{{ stats.max_assistance_per_tournament_player.value }} asistencí</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_assistance_per_tournament_player.instances\">\n" +
    "                <a ng-href=\"hrac/{{ instance[0].pk }}/{{ instance[0].full_name }}\">{{ instance[0].full_name }}</a>,\n" +
    "                <a ng-href=\"turnaj/{{ instance[1].pk }}/{{ instance[1].full_name }}\">{{ instance[1].full_name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Hráčka s nejvíce góly na turnaji:\n" +
    "            <b>{{ stats.max_goal_per_tournament_player_female.value }} gólů</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_goal_per_tournament_player_female.instances\">\n" +
    "                <a ng-href=\"hrac/{{ instance[0].pk }}/{{ instance[0].full_name }}\">{{ instance[0].full_name }}</a>,\n" +
    "                <a ng-href=\"turnaj/{{ instance[1].pk }}/{{ instance[1].full_name }}\">{{ instance[1].full_name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <div>\n" +
    "            Hráčka s nejvíce asistencemi na turnaji:\n" +
    "            <b>{{ stats.max_assistance_per_tournament_player_female.value }} asistencí</b>\n" +
    "            <ul><li ng-repeat=\"instance in stats.max_assistance_per_tournament_player_female.instances\">\n" +
    "                <a ng-href=\"hrac/{{ instance[0].pk }}/{{ instance[0].full_name }}\">{{ instance[0].full_name }}</a>,\n" +
    "                <a ng-href=\"turnaj/{{ instance[1].pk }}/{{ instance[1].full_name }}\">{{ instance[1].full_name }}</a>\n" +
    "            </li></ul>\n" +
    "        </div>\n" +
    "\n" +
    "        <hr>\n" +
    "        <i>Některé statistiky jsou počítány až od vzniku UfoISu v roce 2016.</i>\n" +
    "    </div>\n" +
    "\n" +
    "</div></div>\n"
  );


  $templateCache.put('home.html',
    "<div class=\"loader\" ng-hide=\"stats\"></div>\n" +
    "\n" +
    "<div class=\"row\"><div class=\"columns medium-6 medium-offset-3\">\n" +
    "    <h3>Ufobalový Informační Systém</h3>\n" +
    "\n" +
    "    <div ng-cloak ng-show=\"stats\">\n" +
    "        V systému je aktuálně:\n" +
    "        <ul>\n" +
    "            <li><b>{{ stats.tournament_count }}</b> turnajů od roku <b>{{ stats.min_year }}</b> až do roku <b>{{ stats.max_year }}</b></li>\n" +
    "            <li><b>{{ stats.player_count }}</b> hráčů z toho <b>{{ stats.player_female_count }}</b> žen a <b>{{ stats.player_male_count }}</b> mužů (zbytek asi velbloudi)</li>\n" +
    "            <li><b>{{ stats.team_count }}</b> týmů s jejich <b>{{ stats.team_on_tournament_count }}</b> účastmi na turnajích</li>\n" +
    "            <li><b>{{ stats.goals | number }}</b> gólů a <b>{{ stats.assists | number }}</b> asistencí</li>\n" +
    "            <li><b>{{ stats.active_players | number }}</b> aktivních hráčů (hrajicích od roku {{ stats.active_players_year }})\n" +
    "        </ul>\n" +
    "    </div>\n" +
    "\n" +
    "    <a target=\"_blank\" href=\"http://ufobal.cz\">Oficiální stránky ufobalu</a>\n" +
    "\n" +
    "    <br>\n" +
    "    <b><a target=\"_blank\" class=\"red\" href=\"/static/záznam_zápasu.pdf\">Stručný návod na zapisování zápasu</a></b>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <div ng-show=\"liveTournament\">\n" +
    "        <h3><a href=\"/turnaj/{{ liveTournament.pk }}\">{{ liveTournament.full_name }}</a></h3>\n" +
    "        <strong>datum:</strong> {{ liveTournament.date | date : \"d. M. yyyy\"}}<br>\n" +
    "        <div ng-show=\"liveTournament.registration_open\"><a href=\"/turnaj/prihlasovani/{{ liveTournament.pk }}\">přihlásit se na turnaj</a> - do {{ liveTournament.registration_to | date : \"d. M. yyyy\"}}</div>\n" +
    "        <span ng-show=\"liveTournament.description\" ng-bind-html=\"to_trusted(liveTournament.description)\"></span>\n" +
    "    </div>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <h3>Jak na UfoIS</h3>\n" +
    "    <a href=\"https://www.youtube.com/watch?v=jxACZ41WJQI\" target=\"_blank\">\n" +
    "        <img src=\"/static/youtube.png\" alt=\"Jak na ufoIS\">\n" +
    "    </a>\n" +
    "</div></div>\n"
  );


  $templateCache.put('pair_account.html',
    "<h2>Párování</h2>\n" +
    "<p ng-show=\"userService.status.logged\">\n" +
    "    Před tím než bodeš moci dělat akce v systému (měnit osobní informace, přihlašovat tým, zaznamenávat zápas, ...),\n" +
    "    je potřeba, aby si svůj účet spároval s hráčem v systému.\n" +
    "    Pokud máš kód, tak ho zadej níže. Jinak se můžeš najít mezi <a href=\"/hraci\">hráči</a> a kliknout na <i>sparovat</i> v pravém horním rohu.\n" +
    "\n" +
    "    Pokud se nemůžeš najít nebo máš jiný problém, prosím obrať se na <a href=\"mailto:thran@centrum.cz\">správce systému</a>.\n" +
    "</p>\n" +
    "\n" +
    "<p ng-hide=\"userService.status.logged\">Pokud chceš spárovat tvůj účet s nějakým hráčem v sytému, musíš se nejdříve přihlásit.</p>\n" +
    "\n" +
    "<div ng-hide=\"userService.status.logged\">\n" +
    "    <a class=\"login-provider standalone\" id=\"login-google\" ng-click=\"userService.loginGoogle()\">\n" +
    "        <img width=\"24\" height=\"24\" class=\"provider-signup-img\" src=\"static/google-icon.png\">\n" +
    "        <span class=\"provider-signup-text\"><b>Google</b></span>\n" +
    "    </a>\n" +
    "        <a class=\"login-provider standalone\" id=\"login-facebook\" ng-click=\"userService.loginFacebook()\">\n" +
    "        <img width=\"24\" height=\"24\" class=\"provider-signup-img\" src=\"static/facebook-icon.png\">\n" +
    "        <span class=\"provider-signup-text\"><b>Facebook</b></span>\n" +
    "    </a>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <form ng-submit=\"login()\"> <div class=\"row medium-6 medium-offset-3\">\n" +
    "        <div class=\"columns medium-12 large-4\">\n" +
    "            <input ng-model=\"credentials.username\" type=\"text\" placeholder=\"jméno\" name=\"username\" />\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-8 large-4\">\n" +
    "            <input ng-model=\"credentials.password\" class=\"columns medium-5\" type=\"password\" placeholder=\"heslo\" name=\"password\" />\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-4 large-4\">\n" +
    "            <input type=\"submit\" class=\"button postfix\" value=\"Přihlásit\">\n" +
    "        </div>\n" +
    "    </div></form>\n" +
    "\n" +
    "     <a class=\"login-provider\" href=\"#\" id=\"login-email\" data-reveal-id=\"sign-up-modal\">\n" +
    "        <i class=\"fi-arrow-up\"></i>\n" +
    "        <span class=\"provider-signup-text\">registrovat</span>\n" +
    "    </a>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<div class=\"row\" ng-show=\"userService.status.logged\">\n" +
    "    <div class=\"row collapse\">\n" +
    "        <div class=\"small-9 columns\">\n" +
    "            <input type=\"text\" placeholder=\"kód\" ng-model=\"token\" class=\"columns medium-6\">\n" +
    "        </div>\n" +
    "        <div class=\"small-3 columns\">\n" +
    "            <a href=\"#\" ng-click=\"pairUser(token)\" ng-disabled=\"!token\" class=\"button postfix\">Spárovat</a>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "<span class=\"fi-alert\" ng-show=\"error\">{{ error }}</span>"
  );


  $templateCache.put('player.html',
    "    <div class=\"loader\" ng-hide=\"player\"></div>\n" +
    "\n" +
    "\n" +
    "<div ng-cloak ng-show=\"player\">\n" +
    "    <div>\n" +
    "        <a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "        <hr>\n" +
    "        <a ng-hide=\"edit || !(user.is_staff || user.player.pk === player.pk)\" ng-click=\"edit=true\" class=\"right\"><i class=\"fi-pencil\"></i> upravit profil</a>\n" +
    "        <a ng-hide=\"user.player.pk || player.is_paired || !userStatus.logged\" ng-click=\"pair()\" class=\"right\"><i class=\"fi-arrows-compress\"></i> spárovat</a>\n" +
    "\n" +
    "        <h1> &nbsp; {{ player.nickname }} </h1>\n" +
    "        <h2 ng-class=\"{man: player.gender=='man', woman: player.gender=='woman'}\">\n" +
    "            {{ player.name }} {{ player.lastname }} <span ng-show=\"player.age\">({{ player.age }})</span>\n" +
    "        </h2>\n" +
    "\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-cloak ng-show=\"edit\">\n" +
    "        <hr>\n" +
    "        <a ng-click=\"edit=false\" class=\"right\"><i class=\"fi-x\"></i> zrušit změny</a>\n" +
    "\n" +
    "\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"columns medium-3\">\n" +
    "                <label>Přezdívka\n" +
    "                    <input type=\"text\" ng-model=\"player.nickname\" />\n" +
    "                </label>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"columns medium-3\">\n" +
    "                <label>Jméno\n" +
    "                    <input type=\"text\" ng-model=\"player.name\" />\n" +
    "                </label>\n" +
    "            </div>\n" +
    "            <div class=\"columns medium-3\">\n" +
    "                <label>Příjmení\n" +
    "                    <input type=\"text\" ng-model=\"player.lastname\" />\n" +
    "                </label>\n" +
    "            </div>\n" +
    "            <div class=\"columns medium-6\"></div>\n" +
    "        </div>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"columns medium-3\">\n" +
    "                <label>Pohlaví\n" +
    "                    <select\n" +
    "                        ng-model=\"player.gender\"\n" +
    "                        ng-options=\"gender.id as gender.text for gender in genders\">\n" +
    "                        <option value=\"\">----</option>\n" +
    "                    </select>\n" +
    "                </label>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"columns medium-3\">\n" +
    "                <label>Datum narození\n" +
    "                    <input type=\"date\" ng-change=\"computeAge()\" ng-model=\"player.birthdate\">\n" +
    "                </label>\n" +
    "            </div>\n" +
    "             <div class=\"columns medium-3\">\n" +
    "                <label>Věk\n" +
    "                    <input disabled type=\"text\" ng-model=\"player.age\" />\n" +
    "                </label>\n" +
    "            </div>\n" +
    "            <div class=\"columns medium-6\"></div>\n" +
    "        </div>\n" +
    "        <i>Datum narození nebude nikde zveřejňováno (pouze jako věk).</i>\n" +
    "        <br>\n" +
    "\n" +
    "        <button ng-hide=\"player.saving\" ng-click=\"save()\">Uložit</button>\n" +
    "        <div ng-show=\"player.saving\" class=\"loader small\"></div>\n" +
    "    </div>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <h3>Turnaje</h3>\n" +
    "\n" +
    "    <table>\n" +
    "        <thead>\n" +
    "            <tr>\n" +
    "                <th>Turnaj</th>\n" +
    "                <th>Tým</th>\n" +
    "                <th class=\"text-right\">Góly</th>\n" +
    "                <th class=\"text-right\">Asistence</th>\n" +
    "                <th class=\"text-right\">Kanada</th>\n" +
    "                <th class=\"text-right\">Umístění</th>\n" +
    "                <th></th>\n" +
    "            </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "            <tr ng-repeat=\"t in player.tournaments | orderBy:'tournament.date':true\">\n" +
    "                <td><a ng-href=\"/turnaj/{{ t.tournament.pk }}/{{ t.tournament.full_name }}/{{ t.pk }}\">{{ t.tournament.full_name }}</a></td>\n" +
    "                <td><a ng-href=\"tym/{{ t.team.pk }}/{{ t.name }}\">{{ t.name}}</a></td>\n" +
    "                <td class=\"text-right\">{{ player.goals[t.tournament.pk] }}</td>\n" +
    "                <td class=\"text-right\">{{ player.assists[t.tournament.pk] }}</td>\n" +
    "                <td class=\"text-right\">{{ player.goals[t.tournament.pk] + player.assists[t.tournament.pk] }}</td>\n" +
    "                <td class=\"text-right\">\n" +
    "                    <span ng-show=\"t.rank\">{{ t.rank }}.</span>\n" +
    "                    <span ng-hide=\"t.rank\">-</span>\n" +
    "                </td>\n" +
    "                <td class=\"text-right\"><a class=\"fi-x\" ng-show=\"user.is_staff || user.player.pk === player.pk\" ng-click=\"removeAttendance(t)\"></a></td>\n" +
    "            </tr>\n" +
    "        </tbody>\n" +
    "    </table>\n" +
    "\n" +
    "    <h3>Karty</h3>\n" +
    "    <table>\n" +
    "        <thead>\n" +
    "            <tr>\n" +
    "                <th></th>\n" +
    "                <th>Zdůvodnění</th>\n" +
    "                <th>Turnaj</th>\n" +
    "                <th>Zápas</th>\n" +
    "            </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "            <tr ng-repeat=\"penalty in player.penalties\">\n" +
    "                <td>{{ penalty.card_verbose }}</td>\n" +
    "                <td>{{ penalty.reason }}</td>\n" +
    "                <td><a ng-href=\"/turnaj/{{ penalty.tournament.pk }}/{{ penalty.tournament.full_name }}\">{{ penalty.tournament.full_name }}</a></td>\n" +
    "                <td><a ng-href=\"/turnaj/zapas/{{ penalty.tournament.pk }}/{{ penalty.match.pk }}\">detail</a></td>\n" +
    "            </tr>\n" +
    "        </tbody>\n" +
    "    </table>\n" +
    "\n" +
    "    <br><br><br><br><br>\n" +
    "    <hr>\n" +
    "    <h4>Přidávání historických turnajů</h4>\n" +
    "    <div class=\"row\" ng-show=\"user.is_staff || user.player.pk === player.pk\">\n" +
    "        <div class=\"text-right columns small-2\">\n" +
    "            <select\n" +
    "                ng-model=\"selectedTournament\"\n" +
    "                ng-options=\"tournament as tournament.full_name for tournament in tournaments | orderBy:'-date'\">\n" +
    "                <option value=\"\">----</option>\n" +
    "            </select>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-2\">\n" +
    "            <select\n" +
    "                ng-model=\"selectedTeam\"\n" +
    "                ng-options=\"team as team.name for team in selectedTournament.teamOnTournaments | orderBy:'name'\">\n" +
    "                <option value=\"\">----</option>\n" +
    "            </select>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-2\"><a class=\"fi-plus\" ng-click=\"addAttendance()\"> přidat</a></div>\n" +
    "        <div class=\"columns small-6\"><div ng-show=\"player.saving\" class=\"loader small\"></div></div>\n" +
    "    </div>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <h4 ng-hide=\"getScoreWithoutTeam(player).length == 0\">What? Turnaje se skórem, ale bez týmu</h4>\n" +
    "\n" +
    "    <div ng-repeat=\"t in getScoreWithoutTeam(player)\">\n" +
    "        {{ t.full_name }} - {{ player.goals[t.pk] ? player.goals[t.pk] : 0 }} golů a {{ player.assists[t.pk] ? player.assists[t.pk] : 0 }} assistencí\n" +
    "    </div>\n" +
    "</div>\n"
  );


  $templateCache.put('players.html',
    "<div class=\"loader\" ng-hide=\"players\"></div>\n" +
    "\n" +
    "<div st-persist=\"players\" st-table=\"rows\" st-safe-src=\"players\" ng-cloak class=\"row\" ng-show=\"players\">\n" +
    "    <div class=\"search-box\">\n" +
    "        <input st-search=\"search\" placeholder=\"hledat...\" class=\"input-sm form-control\" type=\"search\">\n" +
    "        <div class=\"fi-x\" st-reset-search></div>\n" +
    "    </div>\n" +
    "\n" +
    "    <table class=\"smart-table\">\n" +
    "        <thead>\n" +
    "        <tr>\n" +
    "            <th width=\"30%\" class=\"clickable\" st-sort=\"nickname\">Jméno</th>\n" +
    "            <th width=\"40%\">Týmy</th>\n" +
    "            <th class=\"text-right clickable\" st-sort=\"goalsSum\" st-descending-first=\"true\">Góly</th>\n" +
    "            <th class=\"text-right clickable\" st-sort=\"assistsSum\" st-descending-first=\"true\">Asistence</th>\n" +
    "            <th class=\"text-right clickable\" st-sort=\"canada\" st-descending-first=\"true\">Kanada</th>\n" +
    "            <th class=\"text-right clickable\" st-sort=\"penalties\" st-descending-first=\"true\">Karty</th>\n" +
    "        </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "        <tr ng-repeat=\"player in rows\">\n" +
    "            <td><a ng-class=\"player.gender\" href=\"\" ng-href=\"hrac/{{ player.pk }}/{{ player.nickname }}\">{{player.nickname}}</a></td>\n" +
    "            <td>\n" +
    "                <span ng-repeat=\"t in player.teams | orderBy:'-count' \">{{ t.team.name }} ({{ t.count }}x)<span ng-hide=\"$last\">, </span></span>\n" +
    "            </td>\n" +
    "            <td class=\"text-right\">{{ player.goalsSum }}</td>\n" +
    "            <td class=\"text-right\">{{ player.assistsSum }}</td>\n" +
    "            <td class=\"text-right\">{{ player.canada }}</td>\n" +
    "            <td class=\"text-right\">{{ player.penalty_count }}</td>\n" +
    "        </tr>\n" +
    "        </tbody>\n" +
    "        <tfoot>\n" +
    "            <tr>\n" +
    "                <td colspan=\"6\" class=\"text-center\">\n" +
    "                    <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"10\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                </td>\n" +
    "            </tr>\n" +
    "        </tfoot>\n" +
    "    </table>\n" +
    "</div>\n"
  );


  $templateCache.put('privacy_policy.html',
    "<h1>Privacy Policy for UfoIS</h1>\n" +
    "\n" +
    "<p>At UfoIS, accessible from is.ufobal.cz, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by UfoIS and how we use it.</p>\n" +
    "\n" +
    "<p>If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us.</p>\n" +
    "\n" +
    "<p>This Privacy Policy applies only to our online activities and is valid for visitors to our website with regards to the information that they shared and/or collect in UfoIS. This policy is not applicable to any information collected offline or via channels other than this website. Our Privacy Policy was created with the help of the <a href=\"https://www.privacypolicygenerator.info/\">Privacy Policy Generator</a>.</p>\n" +
    "\n" +
    "<h2>Consent</h2>\n" +
    "\n" +
    "<p>By using our website, you hereby consent to our Privacy Policy and agree to its terms.</p>\n" +
    "\n" +
    "<h2>Information we collect</h2>\n" +
    "\n" +
    "<p>The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.</p>\n" +
    "<p>If you contact us directly, we may receive additional information about you such as your name, email address, phone number, the contents of the message and/or attachments you may send us, and any other information you may choose to provide.</p>\n" +
    "<p>When you register for an Account, we may ask for your contact information, including items such as name, company name, address, email address, and telephone number.</p>\n" +
    "\n" +
    "<h2>How we use your information</h2>\n" +
    "\n" +
    "<p>We use the information we collect in various ways, including to:</p>\n" +
    "\n" +
    "<ul>\n" +
    "<li>Provide, operate, and maintain our website</li>\n" +
    "<li>Improve, personalize, and expand our website</li>\n" +
    "<li>Understand and analyze how you use our website</li>\n" +
    "<li>Develop new products, services, features, and functionality</li>\n" +
    "<li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes</li>\n" +
    "<li>Send you emails</li>\n" +
    "<li>Find and prevent fraud</li>\n" +
    "</ul>\n" +
    "\n" +
    "<h2>Log Files</h2>\n" +
    "\n" +
    "<p>UfoIS follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users' movement on the website, and gathering demographic information.</p>\n" +
    "\n" +
    "<h2>Cookies and Web Beacons</h2>\n" +
    "\n" +
    "<p>Like any other website, UfoIS uses 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.</p>\n" +
    "\n" +
    "<p>For more general information on cookies, please read <a href=\"https://www.privacypolicyonline.com/what-are-cookies/\">\"What Are Cookies\"</a>.</p>\n" +
    "\n" +
    "\n" +
    "\n" +
    "<h2>Advertising Partners Privacy Policies</h2>\n" +
    "\n" +
    "<P>You may consult this list to find the Privacy Policy for each of the advertising partners of UfoIS.</p>\n" +
    "\n" +
    "<p>Third-party ad servers or ad networks uses technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on UfoIS, which are sent directly to users' browser. They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.</p>\n" +
    "\n" +
    "<p>Note that UfoIS has no access to or control over these cookies that are used by third-party advertisers.</p>\n" +
    "\n" +
    "<h2>Third Party Privacy Policies</h2>\n" +
    "\n" +
    "<p>UfoIS's Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options. </p>\n" +
    "\n" +
    "<p>You can choose to disable cookies through your individual browser options. To know more detailed information about cookie management with specific web browsers, it can be found at the browsers' respective websites.</p>\n" +
    "\n" +
    "<h2>CCPA Privacy Rights (Do Not Sell My Personal Information)</h2>\n" +
    "\n" +
    "<p>Under the CCPA, among other rights, California consumers have the right to:</p>\n" +
    "<p>Request that a business that collects a consumer's personal data disclose the categories and specific pieces of personal data that a business has collected about consumers.</p>\n" +
    "<p>Request that a business delete any personal data about the consumer that a business has collected.</p>\n" +
    "<p>Request that a business that sells a consumer's personal data, not sell the consumer's personal data.</p>\n" +
    "<p>If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.</p>\n" +
    "\n" +
    "<h2>GDPR Data Protection Rights</h2>\n" +
    "\n" +
    "<p>We would like to make sure you are fully aware of all of your data protection rights. Every user is entitled to the following:</p>\n" +
    "<p>The right to access – You have the right to request copies of your personal data. We may charge you a small fee for this service.</p>\n" +
    "<p>The right to rectification – You have the right to request that we correct any information you believe is inaccurate. You also have the right to request that we complete the information you believe is incomplete.</p>\n" +
    "<p>The right to erasure – You have the right to request that we erase your personal data, under certain conditions.</p>\n" +
    "<p>The right to restrict processing – You have the right to request that we restrict the processing of your personal data, under certain conditions.</p>\n" +
    "<p>The right to object to processing – You have the right to object to our processing of your personal data, under certain conditions.</p>\n" +
    "<p>The right to data portability – You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.</p>\n" +
    "<p>If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.</p>\n" +
    "\n" +
    "<h2>Children's Information</h2>\n" +
    "\n" +
    "<p>Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity.</p>\n" +
    "\n" +
    "<p>UfoIS does not knowingly collect any Personal Identifiable Information from children under the age of 13. If you think that your child provided this kind of information on our website, we strongly encourage you to contact us immediately and we will do our best efforts to promptly remove such information from our records.</p>\n" +
    "\n" +
    "<h2>Requesting data deletion</h2>\n" +
    "<p>If you want to delete all your personal data from our servers, you can mail us at exthran@gmail.com requesting data deletion, and we will delete your personal data within 14 days.</p>\n"
  );


  $templateCache.put('referee_feedbacks.html',
    "<a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "<hr>\n" +
    "\n" +
    "<button style=\"float: right\" ng-click=\"getRefereeFeedbacks()\">Obnovit</button>\n" +
    "<h1>Hodnocení rozhodčích - {{ tournament.full_name }}</h1>\n" +
    "\n" +
    "<div class=\"loader\" ng-hide=\"matches || error\"></div>\n" +
    "\n" +
    "<div class=\"red\" ng-show=\"error\">{{ error }}</div>\n" +
    "\n" +
    "<div ng-repeat=\"match in matches\">\n" +
    "    <span ng-class=\"{gray: match.referee_feedback.feedback.star}\">\n" +
    "        <b>{{ match.referee_team.name_pure }}</b>: {{ match.team_one.name_pure }} - {{ match.team_two.name_pure }}\n" +
    "        -\n" +
    "        <a ng-hide=\"match.referee_feedback\" href=\"#\" data-reveal-id=\"feedback-modal\" ng-click=\"newFeedback(match)\">hodnotit</a>\n" +
    "        <a ng-show=\"match.referee_feedback\" href=\"#\" data-reveal-id=\"feedback-modal\" ng-click=\"editFeedback(match)\">upravit</a>\n" +
    "    </span>\n" +
    "    <br><br>\n" +
    "</div>\n" +
    "\n" +
    "<div id=\"feedback-modal\" class=\"large reveal-modal\" data-reveal aria-hidden=\"true\" role=\"dialog\">\n" +
    "    <h1 id=\"modalTitle\">{{ match.referee_team.name_pure }}</h1>\n" +
    "    hlavní rozhodčí: <b>{{ match.referee.full_name }}</b>\n" +
    "    <br>\n" +
    "    <br>\n" +
    "\n" +
    "    <b>Pozitiva</b>\n" +
    "    <div id=\"positives\">\n" +
    "        <div class=\"row\" ng-repeat=\"positive in feedback.positives track by $index\">\n" +
    "            <div class=\"column small-10\">\n" +
    "                <input type=\"text\" ng-model=\"feedback.positives[$index]\">\n" +
    "            </div>\n" +
    "            <div class=\"column small-2\">\n" +
    "                <span style=\"font-size: 1.7rem; cursor: pointer\" ng-click=\"feedback.positives.splice($index, 1)\">&#215;</span>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <button ng-click=\"addPositive()\">Přidat pozitivum</button>\n" +
    "\n" +
    "    <br>\n" +
    "    <hr>\n" +
    "    <b>Negativa</b>\n" +
    "    <div id=\"negatives\">\n" +
    "        <div class=\"row\" ng-repeat=\"negative in feedback.negatives track by $index\">\n" +
    "            <div class=\"column small-10\">\n" +
    "                <input type=\"text\" ng-model=\"feedback.negatives[$index]\">\n" +
    "            </div>\n" +
    "            <div class=\"column small-2\">\n" +
    "                <span style=\"font-size: 1.7rem; cursor: pointer\" ng-click=\"feedback.negatives.splice($index, 1)\">&#215;</span>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <button ng-click=\"addNegative()\">Přidat negativum</button>\n" +
    "\n" +
    "    <hr>\n" +
    "    <b>Komentář</b>\n" +
    "    <textarea name=\"\" id=\"\" cols=\"30\" rows=\"10\" title=\"Komentář\" ng-model=\"feedback.comment\"></textarea>\n" +
    "\n" +
    "    <hr>\n" +
    "     <b>Celkové hodnocení</b>\n" +
    "    <br>\n" +
    "    <br>\n" +
    "    <button class=\"pl-button\" ng-click=\"starChange(-.5)\">-</button>\n" +
    "    <div class=\"stars\"><star-rating-comp\n" +
    "            rating=\"feedback.stars\"\n" +
    "            read-only=\"false\"\n" +
    "            size=\"'large'\"\n" +
    "            get-color=\"starsColor\"\n" +
    "            show-half-stars=\"true\"\n" +
    "            on-click=\"changeRating($event)\"\n" +
    "    ></star-rating-comp></div>\n" +
    "    <button class=\"pl-button\" ng-click=\"starChange(.5)\">+</button>\n" +
    "    <br>\n" +
    "    <br>\n" +
    "    <hr>\n" +
    "\n" +
    "    <button ng-hide=\"match.referee_feedback.saving\" ng-disabled=\"feedback.stars == 0\" ng-click=\"save()\">Uložit</button>\n" +
    "    <div class=\"loader\" ng-show=\"match.referee_feedback.saving\"></div>\n" +
    "</div>\n"
  );


  $templateCache.put('stats_goalies.html',
    "<div class=\"loader\" ng-hide=\"statsGoalies\"></div>\n" +
    "\n" +
    "\n" +
    "<div st-persist=\"statsGoalies\" sort-callback=\"sortCallback()\" st-table=\"rows\" st-safe-src=\"players\" ng-cloak ng-show=\"statsGoalies\">\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns medium-6\">\n" +
    "            <fieldset>\n" +
    "                <legend>Filtrování hráčů</legend>\n" +
    "                <div class=\"fi-x\" st-reset-search></div>\n" +
    "                <div class=\"top-right-gender\">\n" +
    "                    <label class=\"man\" style=\"float: right !important; margin-left: 10px;\"> <input type=\"checkbox\" ng-change=\"filterGender()\" ng-model=\"filter.man\"> </label>\n" +
    "                    <label class=\"woman\" style=\"float: right !important;\"> <input type=\"checkbox\" ng-change=\"filterGender()\" ng-model=\"filter.woman\"> </label>\n" +
    "                </div>\n" +
    "                <label class=\"small-5 columns\">Jméno hráče<input st-search=\"search\" placeholder=\"jméno\" type=\"search\"/></label>\n" +
    "                <label class=\"small-4 columns\">Jméno týmu<input st-search=\"teamsSearch\" placeholder=\"tým\" type=\"search\"/></label>\n" +
    "                <label class=\"small-3 columns\">Zápasů<input ng-model=\"filter.minMatches\" placeholder=\"\" type=\"number\"/></label>\n" +
    "            </fieldset>\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-6\">\n" +
    "            <fieldset>\n" +
    "                <legend>Filtrování turnajů</legend>\n" +
    "                <label class=\"small-3 columns\">od roku<input type=\"number\" placeholder=\"rok\" ng-model=\"filter.yearFrom\"></label>\n" +
    "                <label class=\"small-3 columns\">do roku<input type=\"number\" placeholder=\"rok\" ng-model=\"filter.yearTo\"></label>\n" +
    "                <div class=\"small-6 columns\">\n" +
    "                    <label class=\"small-3 columns\">Nížkov <input type=\"checkbox\" ng-model=\"filter.nizkov\"> </label>\n" +
    "                    <label class=\"small-3 columns\">Brno <input type=\"checkbox\" ng-model=\"filter.brno\"> </label>\n" +
    "                    <label class=\"small-3 columns\">Hala <input type=\"checkbox\" ng-model=\"filter.hala\"> </label>\n" +
    "                    <label class=\"small-3 columns\">Další <input type=\"checkbox\" ng-model=\"filter.other\"> </label>\n" +
    "                </div>\n" +
    "                <div class=\"fi-x\" ng-click=\"resetTournamentFilter()\"></div>\n" +
    "            </fieldset>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <table class=\"smart-table\">\n" +
    "        <thead>\n" +
    "        <tr>\n" +
    "            <th>#</th>\n" +
    "            <th width=\"10%\" st-sort=\"nickname\" class=\"clickable\">Jméno</th>\n" +
    "            <th ng-repeat=\"tournament in tournaments\"><a ng-href=\"turnaj/{{ tournament.pk }}/{{ tournament.full_name }}\">{{ tournament.full_name }}</a></th>\n" +
    "            <th class=\"text-center clickable\" st-sort=\"goalieStats.matchesSum\" st-descending-first='true'>zápasů</th>\n" +
    "            <th class=\"text-center clickable\" st-sort=\"goalieStats.shotsSum\" st-descending-first=\"true\">střel</th>\n" +
    "            <th class=\"text-center clickable\" st-sort=\"goalieStats.goalsSum\" st-descending-first=\"true\">gólů</th>\n" +
    "            <th class=\"text-center clickable\" st-sort=\"goalieStats.success\" st-descending-first=\"true\" st-sort-default=\"true\">úspěšnost</th>\n" +
    "        </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "        <tr ng-repeat=\"player in rows\">\n" +
    "            <th>{{ player.rank }}</th>\n" +
    "            <td><a ng-class=\"player.player.gender\" href=\"\" ng-href=\"hrac/{{ player.pk }}/{{ player.nickname }}\">{{player.nickname}}</a></td>\n" +
    "            <td ng-repeat=\"tournament in tournaments\" ng-init=\"t = player.goalieStats.tournaments[tournament.pk];\">\n" +
    "                <span ng-show=\"t.success\">\n" +
    "                    <b>{{ t.success * 100 | number:1}}%</b>\n" +
    "                    <br>\n" +
    "                    <span class=\"small \">({{ t.goals }} / {{ t.shots }})</span>\n" +
    "                </span>\n" +
    "            </td>\n" +
    "            <td class=\"text-right\">{{ player.goalieStats.matchesSum }}</td>\n" +
    "            <td class=\"text-right\">{{ player.goalieStats.shotsSum }}</td>\n" +
    "            <td class=\"text-right\">{{ player.goalieStats.goalsSum }}</td>\n" +
    "            <td class=\"text-right\">{{ player.goalieStats.success * 100 | number:1}}%</td>\n" +
    "        </tr>\n" +
    "        </tbody>\n" +
    "        <tfoot>\n" +
    "            <tr>\n" +
    "                <td colspan=\"{{ tournaments.length + 6 }}\" class=\"text-center\">\n" +
    "                    {{ tableState }}\n" +
    "                    <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"10\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                </td>\n" +
    "            </tr>\n" +
    "        </tfoot>\n" +
    "    </table>\n" +
    "</div>\n"
  );


  $templateCache.put('stats.html',
    "<div class=\"loader\" ng-hide=\"stats\"></div>\n" +
    "\n" +
    "<div st-persist=\"stats\" sort-callback=\"sortCallback()\" st-table=\"rows\" st-safe-src=\"players\" ng-cloak ng-show=\"stats\">\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns medium-6\">\n" +
    "            <fieldset>\n" +
    "                <legend>Filtrování hráčů</legend>\n" +
    "                <div class=\"fi-x\" st-reset-search></div>\n" +
    "                <div class=\"top-right-gender\">\n" +
    "                    <label class=\"man\" style=\"float: right !important; margin-left: 10px;\"> <input type=\"checkbox\" ng-change=\"filterGender()\" ng-model=\"filter.man\"> </label>\n" +
    "                    <label class=\"woman\" style=\"float: right !important;\"> <input type=\"checkbox\" ng-change=\"filterGender()\" ng-model=\"filter.woman\"> </label>\n" +
    "                </div>\n" +
    "                <label class=\"small-6 columns\">Jméno hráče<input st-search=\"search\" placeholder=\"jméno\" type=\"search\"/></label>\n" +
    "                <label class=\"small-6 columns\">Jméno týmu<input st-search=\"teamsSearch\" placeholder=\"tým\" type=\"search\"/></label>\n" +
    "            </fieldset>\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-6\">\n" +
    "            <fieldset>\n" +
    "                <legend>Filtrování turnajů</legend>\n" +
    "                <label class=\"small-3 columns\">od roku<input type=\"number\" placeholder=\"rok\" ng-model=\"filter.yearFrom\"></label>\n" +
    "                <label class=\"small-3 columns\">do roku<input type=\"number\" placeholder=\"rok\" ng-model=\"filter.yearTo\"></label>\n" +
    "                <div class=\"small-6 columns\">\n" +
    "                    <label class=\"small-3 columns\">Nížkov <input type=\"checkbox\" ng-model=\"filter.nizkov\"> </label>\n" +
    "                    <label class=\"small-3 columns\">Brno <input type=\"checkbox\" ng-model=\"filter.brno\"> </label>\n" +
    "                    <label class=\"small-2 columns\">Hala <input type=\"checkbox\" ng-model=\"filter.hala\"> </label>\n" +
    "                    <label class=\"small-2 columns\">Liga <input type=\"checkbox\" ng-model=\"filter.liga\"> </label>\n" +
    "                    <label class=\"small-2 columns\">Další <input type=\"checkbox\" ng-model=\"filter.other\"> </label>\n" +
    "                </div>\n" +
    "                <div class=\"fi-x\" ng-click=\"resetTournamentFilter()\"></div>\n" +
    "            </fieldset>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <table class=\"smart-table\">\n" +
    "        <thead>\n" +
    "        <tr>\n" +
    "            <th>#</th>\n" +
    "            <th width=\"10%\" st-sort=\"nickname\" class=\"clickable\">Jméno</th>\n" +
    "            <th ng-repeat=\"tournament in tournaments\"><a ng-href=\"turnaj/{{ tournament.pk }}/{{ tournament.full_name }}\">{{ tournament.full_name }}</a></th>\n" +
    "            <th class=\"text-center clickable\" st-sort=\"goalsSumFiltered\" st-descending-first='true'>G</th>\n" +
    "            <th class=\"text-center clickable\" st-sort=\"assistsSumFiltered\" st-descending-first=\"true\">A</th>\n" +
    "            <th class=\"text-center clickable\" st-sort=\"canadaFiltered\" st-descending-first=\"true\" st-sort-default=\"true\">K</th>\n" +
    "        </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "        <tr ng-repeat=\"player in rows\">\n" +
    "            <th>{{ player.rank }}</th>\n" +
    "            <td><a ng-class=\"player.gender\" href=\"\" ng-href=\"hrac/{{ player.pk }}/{{ player.nickname }}\">{{player.nickname}}</a></td>\n" +
    "            <td ng-repeat=\"tournament in tournaments\" ng-init=\"g = player.goals[tournament.pk]; a = player.assists[tournament.pk]\">\n" +
    "                <b>{{ g }}</b><span ng-show=\"a && g\">+</span>{{ a }}\n" +
    "            </td>\n" +
    "            <td class=\"text-right\">{{ player.goalsSumFiltered }}</td>\n" +
    "            <td class=\"text-right\">{{ player.assistsSumFiltered }}</td>\n" +
    "            <td class=\"text-right\">{{ player.canadaFiltered }}</td>\n" +
    "        </tr>\n" +
    "        </tbody>\n" +
    "        <tfoot>\n" +
    "            <tr>\n" +
    "                <td colspan=\"{{ tournaments.length + 5 }}\" class=\"text-center\">\n" +
    "                    {{ tableState }}\n" +
    "                    <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"10\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                </td>\n" +
    "            </tr>\n" +
    "        </tfoot>\n" +
    "    </table>\n" +
    "</div>\n"
  );


  $templateCache.put('team.html',
    "<div class=\"loader\" ng-hide=\"team\"></div>\n" +
    "\n" +
    "<div ng-cloak ng-show=\"team\">\n" +
    "    <a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <h1>{{ team.name }} <span ng-if=\"team.name_short\">({{ team.name_short }})</span></h1>\n" +
    "    <h2>\n" +
    "        <span ng-repeat=\"n in getTeamNames(team) | filter:'!'+team.name:true | orderBy:'-count'\">{{ n.name }}<span ng-hide=\"$last\">, </span></span>\n" +
    "    </h2>\n" +
    "\n" +
    "    <h3>Turnaje</h3>\n" +
    "\n" +
    "    <table>\n" +
    "        <thead>\n" +
    "            <tr>\n" +
    "                <th>Turnaj</th>\n" +
    "                <th></th>\n" +
    "                <th>Hráči</th>\n" +
    "                <th>Umístění</th>\n" +
    "            </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "            <tr ng-repeat=\"t in team.teamOnTournaments | orderBy:'tournament.date':true\">\n" +
    "                <td><a ng-href=\"/turnaj/{{ t.tournament.pk }}/{{ t.tournament.full_name }}/{{ t.pk }}\">{{ t.tournament.full_name }}</a></td>\n" +
    "                <td><span ng-hide=\"t.name == team.name\">{{ t.name }}</span></td>\n" +
    "\n" +
    "                <td>\n" +
    "                    <span ng-repeat=\"player in t.players\">\n" +
    "                        <a ng-href=\"hrac/{{ player.pk }}/{{ player.nickname }}\">{{ player.nickname }}</a>\n" +
    "                        <span ng-hide=\"$last\">, </span>\n" +
    "                    </span>\n" +
    "                </td>\n" +
    "                <td class=\"text-right\">\n" +
    "                    <span ng-show=\"t.rank\">{{ t.rank }}.</span>\n" +
    "                    <span ng-hide=\"t.rank\">-</span>\n" +
    "                </td>\n" +
    "            </tr>\n" +
    "        </tbody>\n" +
    "    </table>\n" +
    "\n" +
    "</div>"
  );


  $templateCache.put('teams.html',
    "<div class=\"loader\" ng-hide=\"teams\"></div>\n" +
    "\n" +
    "<div st-persist=\"teams\" st-table=\"rows\" st-safe-src=\"teams\" ng-cloak ng-show=\"teams\">\n" +
    "    <div class=\"search-box\">\n" +
    "        <input st-search=\"namesSearch\" placeholder=\"hledat...\" class=\"input-sm form-control\" type=\"search\"/>\n" +
    "        <div class=\"fi-x\" st-reset-search></div>\n" +
    "    </div>\n" +
    "    <table class=\"smart-table\">\n" +
    "        <thead>\n" +
    "        <tr>\n" +
    "            <th width=\"20%\" class=\"clickable\" st-sort=\"name\">Jméno</th>\n" +
    "            <th width=\"40%\"></th>\n" +
    "            <th width=\"30%\" class=\"clickable\" st-sort=\"medalsValue\">Umístění</th>\n" +
    "            <th>Počet turnajů</th>\n" +
    "        </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "        <tr ng-repeat=\"team in rows\">\n" +
    "            <td><a ng-href=\"/tym/{{ team.pk }}/{{ team.name }}\">{{ team.name }}</a></td>\n" +
    "            <td>\n" +
    "                <span ng-repeat=\"n in team.names | filter:'!'+team.name:true | orderBy:'-count'\">{{ n.name }}<span ng-hide=\"$last\">, </span></span>\n" +
    "            </td>\n" +
    "            <td>\n" +
    "                <span ng-repeat=\"count in team.medals track by $index\" ng-show=\"count\">\n" +
    "                    <span class=\"medal medal-{{ $index + 1 }}\">{{ count }}&times;</span>\n" +
    "                </span>\n" +
    "            </td>\n" +
    "            <td>{{ team.teamOnTournaments.length }}</td>\n" +
    "        </tr>\n" +
    "        </tbody>\n" +
    "        <tfoot>\n" +
    "            <tr>\n" +
    "                <td colspan=\"4\" class=\"text-center\">\n" +
    "                    <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"10\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                </td>\n" +
    "            </tr>\n" +
    "        </tfoot>\n" +
    "    </table>\n" +
    "</div>\n"
  );


  $templateCache.put('tournament_live.html',
    "<a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "\n" +
    "<hr>\n" +
    "<div class=\"loader\" ng-hide=\"matchesLoaded\"></div>\n" +
    "<div ng-show=\"matchesLoaded\">\n" +
    "\n" +
    "    <a class=\"right\" href=\"/skupiny/{{ tournament.pk }}\"><button>Skupiny</button></a>\n" +
    "    <a class=\"right\" style=\"margin-right: 10px;\" href=\"/turnaj/{{ tournament.pk }}/{{ tournament.full_name }}\"><button>Statistiky</button></a>\n" +
    "    <a class=\"right\" style=\"margin: 0 10px;\" href=\"/turnaj/{{ tournament.pk }}\"><button>Správa turnaje</button></a>\n" +
    "    <div class=\"small switch right text-right\" style=\"margin-bottom: 0\">živě<br><input id='refresh' type=\"checkbox\" ng-model=\"refresh\"><label for=\"refresh\"></label></div>\n" +
    "\n" +
    "    <h1>{{ tournament.full_name }}</h1>\n" +
    "    <hr>\n" +
    "    <h4>Probíhající zápasy </h4>\n" +
    "    <div ng-repeat=\"match in tournament.matches | filter:{state: 'ongoing'} | orderBy:['-pk']\" class=\"row hoverLight stripes\">\n" +
    "        <div class=\"columns small-1 one-line\">{{ match.place }}</div>\n" +
    "        <div class=\"text-right columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}\"><b>{{ match.team_one.name_pure }}</b></a></div>\n" +
    "        <div class=\"columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}\"><b>{{ match.team_two.name_pure }}</b></a></div>\n" +
    "        <div class=\"columns small-2 one-line\">\n" +
    "            <span ng-show=\"match.start\"><b>{{ match.score_one }}:{{ match.score_two }}<span ng-show=\"match.with_shootout\">P</span></b></span>\n" +
    "            <span ng-show=\"match.start && ! match.end\">hraje se</span>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-3 one-line\">({{ match.referee_team.name_pure }})</div>\n" +
    "    </div>\n" +
    "\n" +
    "    <br>\n" +
    "    <h4>Ukončené zápasy </h4>\n" +
    "    <div ng-repeat=\"match in tournament.matches | filter:{state: 'ended'} | orderBy:['-pk']\" class=\"row hoverLight stripes\">\n" +
    "        <div class=\"columns small-1 one-line\">{{ match.place }}</div>\n" +
    "        <div class=\"text-right columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}\"><b>{{ match.team_one.name_pure }}</b></a></div>\n" +
    "        <div class=\"columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}\"><b>{{ match.team_two.name_pure }}</b></a></div>\n" +
    "        <div class=\"columns small-2 one-line\">\n" +
    "            <span ng-show=\"match.start\"><b>{{ match.score_one }}:{{ match.score_two }}<span ng-show=\"match.with_shootout\">P</span></b></span>\n" +
    "            <span ng-show=\"match.start && ! match.end\">hraje se</span>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-3 one-line\">({{ match.referee_team.name_pure }})</div>\n" +
    "    </div>\n" +
    "\n" +
    "    <br>\n" +
    "    <h4>Budoucí zápasy </h4>\n" +
    "    <div ng-repeat=\"match in tournament.matches | filter:{state: 'waiting'} | orderBy:['-pk']\" class=\"row hoverLight stripes\">\n" +
    "        <div class=\"columns small-1 one-line\">{{ match.place }}</div>\n" +
    "        <div class=\"text-right columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}\"><b>{{ match.team_one.name_pure }}</b></a></div>\n" +
    "        <div class=\"columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}\"><b>{{ match.team_two.name_pure }}</b></a></div>\n" +
    "        <div class=\"columns small-2 one-line\">\n" +
    "            <span ng-show=\"match.start\"><b>{{ match.score_one }}:{{ match.score_two }}<span ng-show=\"match.with_shootout\">P</span></b></span>\n" +
    "            <span ng-show=\"match.start && ! match.end\">hraje se</span>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-3 one-line\">({{ match.referee_team.name_pure }})</div>\n" +
    "    </div>\n" +
    "</div>\n"
  );


  $templateCache.put('tournament_main.html',
    "<a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "\n" +
    "<hr>\n" +
    "<div class=\"loader\" ng-hide=\"matchesLoaded\"></div>\n" +
    "<div ng-hide=\"user.is_authorized\">Přihlaš se prosím účtem, který je spárovaný s nějakým hráčem.</div>\n" +
    "<div class=\"text-center\" ng-show=\"matchesLoaded && user.is_authorized\">\n" +
    "\n" +
    "    <a class=\"right\" href=\"/skupiny/{{ tournament.pk }}\"><button>Skupiny</button></a>\n" +
    "    <a class=\"right\" style=\"margin-right: 10px;\" href=\"/turnaj/{{ tournament.pk }}/{{ tournament.full_name }}\"><button>Statistiky</button></a>\n" +
    "    <a class=\"right\" style=\"margin-right: 10px;\" href=\"/turnaj-zive/{{ tournament.pk }}\"><button>Divácký pohled</button></a>\n" +
    "    <a class=\"right\" style=\"margin-right: 10px;\" href=\"/hodnoceni_rozhodcich/{{ tournament.pk }}\"><button>Hodnocení rozhodčích</button></a>\n" +
    "    <h1>{{ tournament.full_name }}</h1>\n" +
    "    <hr>\n" +
    "    <div ng-show=\"tournament.is_tournament_open || user.is_staff\">\n" +
    "        <h3>Zápasy</h3>\n" +
    "        <a href=\"#\" class=\"fi-plus\" data-reveal-id=\"newMatch\"> Nový zápas</a>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"columns large-6 panel\" ng-repeat=\"field in tournament.fields\" equalizer=\"'places'\" style=\"height: 10px\">\n" +
    "                <h4>Hřiště {{ field }}</h4>\n" +
    "\n" +
    "                <div ng-repeat=\"match in tournament.matches | filter:{place: field}:strict | orderBy:['pk'] \" class=\"row hoverLight stripes\">\n" +
    "                    <div class=\"columns small-1 one-line\">{{ $index + 1 }}.</div>\n" +
    "                    <div class=\"text-right columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}/edit\"><b>{{ match.team_one.name_pure }}</b></a></div>\n" +
    "                    <div class=\"text-left columns small-3 one-line\"><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}/edit\"><b>{{ match.team_two.name_pure }}</b></a></div>\n" +
    "                    <div class=\"text-left columns small-2 one-line\">({{ match.referee_team.name_pure }})</div>\n" +
    "                    <div class=\"columns small-3 one-line\">\n" +
    "                        <span ng-show=\"match.start\"><b>{{ match.score_one }}:{{ match.score_two }}<span ng-show=\"match.with_shootout\">P</span></b></span>\n" +
    "                        <span ng-show=\"match.start && ! match.end\">hraje se</span>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <hr>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"row\">\n" +
    "        <div ng-show=\"tournament.registration_open\"><a href=\"/turnaj/prihlasovani/{{ tournament.pk }}\">přihlásit se na turnaj</a> - do {{ tournament.registration_to | date : \"d. M. yyyy\"}}</div>\n" +
    "        <h3>Týmy</h3>\n" +
    "        <div class=\"small-6 medium-4 large-3 columns\" ng-repeat=\"team in tournament.teamOnTournaments | orderBy:'name'\"><a href=\"/turnaj/{{ tournament.pk }}/tym/{{ team.pk }}\">{{ team.name }}</a></div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<div id=\"newMatch\" class=\"small reveal-modal\" data-reveal>\n" +
    "    <label>Tým 1\n" +
    "        <select ng-model=\"match.team_one\" ng-change=\"match.saving_error=null\"\n" +
    "                ng-options=\"team as team.name for team in tournament.teamOnTournaments | orderBy:'name'\">\n" +
    "            <option value=\"\">----</option>\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <label>Tým 2\n" +
    "        <select ng-model=\"match.team_two\" ng-change=\"match.saving_error=null\"\n" +
    "                ng-options=\"team as team.name for team in tournament.teamOnTournaments | orderBy:'name'\">\n" +
    "            <option value=\"\">----</option>\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <label>Rozhodčí tým\n" +
    "        <select ng-model=\"match.referee_team\" ng-change=\"match.saving_error=null\"\n" +
    "                ng-options=\"team as team.name for team in tournament.teamOnTournaments | orderBy:'name'\">\n" +
    "            <option value=\"\">----</option>\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <label>Hřiště</label>\n" +
    "    <p>\n" +
    "        <label ng-repeat=\"field in tournament.fields\">\n" +
    "            <input type=\"radio\" name=\"x\" ng-model=\"$parent.match.place\" ng-value=\"field\">\n" +
    "            {{ field }}\n" +
    "        </label>\n" +
    "    </p>\n" +
    "\n" +
    "    <button ng-hide=\"match.saving\" ng-disabled=\"!match.team_one || !match.referee_team || !match.team_two || !match.place \" ng-click=\"addMatch()\">Vytvořit</button>\n" +
    "    <label ng-show=\"match.saving_error\" class=\"red\">{{ match.saving_error }}</label>\n" +
    "    <div class=\"loader\" ng-show=\"match.saving\"></div>\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>\n"
  );


  $templateCache.put('tournament_match.html',
    "<a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "\n" +
    "<hr>\n" +
    "<div class=\"loader\" ng-hide=\"match\"></div>\n" +
    "\n" +
    "<div ng-show=\"match\">\n" +
    "    <div class=\"text-center\">\n" +
    "        <div class=\"small switch text-right right\" style=\"margin-bottom: 0\" ng-show=\"onlyView\">živě<br><input id='refresh' type=\"checkbox\" ng-model=\"refresh\"><label for=\"refresh\"></label></div>\n" +
    "        <span ng-show=\"match.halftime > 0\" ng-click=\"nextHalftime()\">{{ match.halftime }}. poločas</span>\n" +
    "        <span ng-show=\"match.halftime === null\">zápas ukončen &nbsp;&nbsp;&nbsp;&nbsp; <a href back>&lsaquo; zpět na přehled</a></span>\n" +
    "        <span ng-show=\"match.halftime > 0 && !onlyView\" ng-click=\"nextHalftime()\" class=\"clickable fi-arrow-right\"></span>\n" +
    "    </div>\n" +
    "    <div class=\"timer one-line\" ng-show=\"match.halftime !== null\" ng-hide=\"onlyView\">\n" +
    "        <span ng-click=\"timer.addTime(5000)\" class=\"clickable fi-rewind\"></span>\n" +
    "        <span ng-click=\"timer.addTime(1000)\" class=\"clickable line arrow-left\"></span>\n" +
    "        <span><span class=\"hide-for-small\">&nbsp;&nbsp;</span></span>\n" +
    "        <span ng-class=\"{pressbutton: match.halftime === 0}\">\n" +
    "            <span ng-click=\"start();\" ng-show=\"!timer.running\" class=\"clickable fi-play\"></span>\n" +
    "            <span ng-click=\"timer.stop()\" ng-show=\"timer.running\" class=\"clickable fi-pause\"></span>\n" +
    "            <timer ng-click=\"start(true);\" class=\"clickable\" countdown=\"true\" interval=\"200\" interface=\"timer\">\n" +
    "                <b ng-class=\"{red: negative}\">{{ sign }}{{ mminutes }}:{{ sseconds }}.{{ deciseconds }}</b>\n" +
    "            </timer>\n" +
    "        </span>\n" +
    "        <span><span class=\"hide-for-small\">&nbsp;&nbsp;</span></span>\n" +
    "        <span ng-click=\"timer.addTime(-1000)\" class=\"clickable line arrow-right\"></span>\n" +
    "        <span ng-click=\"timer.addTime(-5000)\" class=\"clickable fi-fast-forward\"></span>\n" +
    "    </div>\n" +
    "\n" +
    "    <hr>\n" +
    "    <div class=\"text-center\">\n" +
    "        <span class=\"clickable\" ng-click=\"startChangeReferee()\">píská: {{ match.referee_team.name_pure }} - <b ng-show=\"match.referee\"> {{ match.referee.nickname }}</b></span>\n" +
    "        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\n" +
    "        <span class=\"show-for-small-only\">\n" +
    "            <label style=\"display: inline !important;\"><span style=\"display: inline;\" ng-hide=\"onlyView\"><input type=\"checkbox\" ng-model=\"edit\" ng-hide=\"onlyView\"> úpravy</span></label>\n" +
    "            <label style=\"display: inline !important;\"><span style=\"display: inline;\"><input type=\"checkbox\" ng-model=\"showShots\"> střely</span></label>\n" +
    "            &nbsp;&nbsp;&nbsp;\n" +
    "            <i class=\"fi-loop\" ng-click=\"switchTeamSides();\"></i>\n" +
    "        </span>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns small-6 medium-5 text-right clickable\" ng-class=\"match.team1.color\" ng-click=\"newGoalieChange(match.team1)\">\n" +
    "            <b ng-show=\"match.team1.goalie\">{{ match.team1.goalie.nickname }}</b>\n" +
    "            <span ng-hide=\"match.team1.goalie\">bez brankáře</span>\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-2 show-for-medium-up text-center\">&nbsp;</div>\n" +
    "        <div class=\"columns small-6 medium-5 clickable\" ng-class=\"match.team2.color\" ng-click=\"newGoalieChange(match.team2)\">\n" +
    "            <b ng-show=\"match.team2.goalie\">{{ match.team2.goalie.nickname }}</b>\n" +
    "            <span ng-hide=\"match.team2.goalie\">bez brankáře</span>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns small-6 medium-5 text-right one-line\" style=\"font-size: 2em;\" ng-class=\"match.team1.color\"><b>{{ match.team1.name_pure }}</b></div>\n" +
    "        <div class=\"columns medium-2 show-for-medium-up text-center\"><i class=\"fi-loop\" ng-click=\"switchTeamSides();\"></i></div>\n" +
    "        <div class=\"columns small-6 medium-3 one-line\" style=\"font-size: 2em;\" ng-class=\"match.team2.color\"><b>{{ match.team2.name_pure }}</b></div>\n" +
    "\n" +
    "        <div class=\"columns medium-2 show-for-medium-up\">\n" +
    "            <div class=\"small switch right\" style=\"margin-bottom: 0\" ng-hide=\"onlyView\">úpravy <br><input id='edit' type=\"checkbox\" ng-model=\"edit\"><label for=\"edit\"></label></div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "\n" +
    "    <div class=\"row\" ng-show=\"match.halftime === 1 || match.halftime === 2\">\n" +
    "        <div class=\"columns small-6 medium-5 text-right\">\n" +
    "            <div ng-repeat=\"event in match.events | filter : penaltyTimerFilter(1) | orderBy : '-time'\">\n" +
    "                <div ng-class=\"event.team.color\"><span class=\"fi-alert\"> {{ getRemainingPenaltyTime(event) }} - <b>{{ event.data.player.nickname }}</b></span> </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-2 show-for-medium-up text-center\">&nbsp;</div>\n" +
    "        <div class=\"columns small-6 medium-5\">\n" +
    "            <div ng-repeat=\"event in match.events | filter :penaltyTimerFilter(2) | orderBy : '-time'\">\n" +
    "                <div ng-class=\"event.team.color\"><span class=\"fi-alert\"> {{ getRemainingPenaltyTime(event) }} - <b>{{ event.data.player.nickname }}</b></span> </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns small-6 medium-5 text-right\" ng-class=\"match.team1.color\"\n" +
    "        ng-init=\"\">\n" +
    "            {{ match.team1.counts.goals / (match.team1.counts.goals + match.team1.counts.shots) * 100 | number:0 }}% -\n" +
    "            {{ match.team1.counts.shots + match.team1.counts.goals }}\n" +
    "            &nbsp;&nbsp;&nbsp;\n" +
    "            <span style=\"font-size: 3em;\">{{ match.team1.counts.goals }}</span>\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-2 show-for-medium-up text-center\">&nbsp;</div>\n" +
    "        <div class=\"columns small-6 medium-3\" ng-class=\"match.team2.color\">\n" +
    "            <span style=\"font-size: 3em;\">{{ match.team2.counts.goals }}</span>\n" +
    "            &nbsp;&nbsp;&nbsp;\n" +
    "            {{ match.team2.counts.shots + match.team2.counts.goals }} -\n" +
    "            {{ match.team2.counts.goals / (match.team2.counts.goals + match.team2.counts.shots) * 100 | number:0 }}%\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-2 show-for-medium-up\">\n" +
    "            <div class=\"small switch right\">střely <br><input id='showShots' type=\"checkbox\" ng-model=\"showShots\"><label for=\"showShots\"></label></div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"row\" ng-show=\"!onlyView && (edit || match.halftime !== null)\">\n" +
    "        <div class=\"show-for-small columns small-6 medium-5 text-right\"><h3>\n" +
    "            <span class=\"pressbutton\" ng-click=\"saveShot(match.team1)\">střela</span>\n" +
    "            <br><br>\n" +
    "            <span ng-click=\"newPenalty(match.team1)\" class=\"clickable fi-alert\"></span>\n" +
    "            <span class=\"pressbutton\" ng-click=\"newGoal(match.team1)\">gól</span>\n" +
    "        </h3></div>\n" +
    "        <div class=\"columns small-6 medium-5 show-for-medium-up text-right\"><h3>\n" +
    "            <span ng-click=\"newPenalty(match.team1)\" class=\"clickable fi-alert\"></span>\n" +
    "            <span class=\"pressbutton\" ng-click=\"saveShot(match.team1)\">střela</span>\n" +
    "            <span class=\"pressbutton\" ng-click=\"newGoal(match.team1)\">gól</span>\n" +
    "        </h3></div>\n" +
    "        <div class=\"columns medium-2 show-for-medium-up text-center\">&nbsp;</div>\n" +
    "        <div class=\"show-for-small columns small-6 medium-5\"><h3>\n" +
    "            <span class=\"pressbutton\" ng-click=\"saveShot(match.team2)\">střela</span>\n" +
    "            <br><br>\n" +
    "            <span class=\"pressbutton\" ng-click=\"newGoal(match.team2)\">gól</span>\n" +
    "            <span ng-click=\"newPenalty(match.team2)\" class=\"clickable fi-alert\"></span>\n" +
    "        </h3></div>\n" +
    "        <div class=\"columns small-6 medium-5 show-for-medium-up\"><h3>\n" +
    "            <span class=\"pressbutton\" ng-click=\"newGoal(match.team2)\">gól</span>\n" +
    "            <span class=\"pressbutton\" ng-click=\"saveShot(match.team2)\">střela</span>\n" +
    "            <span ng-click=\"newPenalty(match.team2)\" class=\"clickable fi-alert\"></span>\n" +
    "        </h3></div>\n" +
    "    </div>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <div ng-repeat=\"event in match.events | filter : eventFilter | orderBy : '-time'\" class=\"row hoverLight show-for-small-down stripes\">\n" +
    "        <div class=\"columns small-2 medium-2 text-right\">\n" +
    "            &nbsp;\n" +
    "            <span ng-hide=\"event.saved\" class=\"fi-unlink\"></span>\n" +
    "            <span ng-show=\"edit && (event.type == 'goal' || event.type == 'shot' || event.type == 'penalty')\"\n" +
    "                  ng-click=\"remove(event)\" class=\"fi-x clickable\"></span>\n" +
    "            <span ng-show=\"edit && (event.type == 'goal')\"\n" +
    "                  ng-click=\"startEditGoal(event)\" class=\"fi-pencil clickable\"></span>\n" +
    "            <span ng-show=\"edit && (event.type == 'penalty')\"\n" +
    "                  ng-click=\"startEditPenalty(event)\" class=\"fi-pencil clickable\"></span>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-2 medium-1 text-right\"><hr ng-show=\"event.type == 'halftime'\">{{ event.time | limitTo : -5 }}</div>\n" +
    "        <div class=\"columns small-8 medium-9\">\n" +
    "            <div ng-show=\"event.type == 'goal'\" ng-class=\"event.team.color\">gól: <b>{{ event.data.shooter.nickname }}</b><span ng-show=\"event.data.assistance\"> - {{ event.data.assistance.nickname }}</span></div>\n" +
    "            <div ng-show=\"event.type == 'shot'\" ng-class=\"event.team.color\">střela<span ng-show=\"event.data.shooter\">: {{ event.data.shooter.nickname }}</span></div>\n" +
    "            <div ng-show=\"event.type == 'penalty'\" ng-class=\"event.team.color\"><span class=\"fi-alert\"> {{ event.data.cardText }} karta</span>: <b>{{ event.data.player.nickname }}</b> - {{ event.data.reason }}</div>\n" +
    "            <div ng-show=\"event.type == 'halftime'\"><hr><b>konec poločasu</b> </div>\n" +
    "            <div ng-show=\"event.type == 'end'\"><b>konec zápasu</b></div>\n" +
    "            <div ng-show=\"event.type== 'goalieChange'\" ng-class=\"event.team.color\"><span class=\"fi-loop\"> změna brankáře</span>: <b>{{ event.data.goalie.nickname }}</b></div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-repeat=\"event in match.events | filter : eventFilter | orderBy : '-time'\" class=\"row hoverLight show-for-medium-up\">\n" +
    "        <div class=\"columns medium-1 text-right\">\n" +
    "            &nbsp;\n" +
    "            <span ng-hide=\"event.saved\" class=\"fi-unlink\"></span>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"columns medium-4\" ng-show=\"event.team === match.team2\">&nbsp;</div>\n" +
    "        <div class=\"columns medium-4 text-right\" ng-hide=\"event.team === match.team2\">\n" +
    "            <div ng-show=\"event.type == 'goal'\" ng-class=\"event.team.color\">gól: <b>{{ event.data.shooter.nickname }}</b>\n" +
    "                <span ng-show=\"event.data.assistance\"> - {{ event.data.assistance.nickname }}</span>\n" +
    "                <span ng-show=\"event.data.type == 'shootout'\"> - penaltový rozstřel</span>\n" +
    "                <span ng-show=\"event.data.type == 'penalty'\"> - penalta</span>\n" +
    "            </div>\n" +
    "            <div ng-show=\"event.type == 'shot'\" ng-class=\"event.team.color\">střela<span ng-show=\"event.data.shooter\">: {{ event.data.shooter.nickname }}</span></div>\n" +
    "            <div ng-show=\"event.type == 'penalty'\" ng-class=\"event.team.color\"><span class=\"fi-alert\"> {{ event.data.cardText }} karta</span>: <b>{{ event.data.player.nickname }}</b> - {{ event.data.reason }}</div>\n" +
    "            <div ng-show=\"event.type == 'halftime'\"><hr><b>konec poločasu</b> </div>\n" +
    "            <div ng-show=\"event.type == 'end'\"><b>konec zápasu</b></div>\n" +
    "            <div ng-show=\"event.type== 'goalieChange'\" ng-class=\"event.team.color\"><span class=\"fi-loop\"> změna brankáře</span>: <b>{{ event.data.goalie.nickname }}</b></div>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"columns medium-2 text-center\">\n" +
    "            <span ng-show=\"edit && (event.type == 'goal')\"\n" +
    "                  ng-click=\"startEditGoal(event)\" class=\"fi-pencil clickable\"></span>\n" +
    "            <span ng-show=\"edit && (event.type == 'penalty')\"\n" +
    "                  ng-click=\"startEditPenalty(event)\" class=\"fi-pencil clickable\"></span>\n" +
    "\n" +
    "            <hr ng-show=\"event.type === 'halftime'\">\n" +
    "            {{ event.time | limitTo : -5 }}\n" +
    "\n" +
    "            <span ng-show=\"edit && (event.type == 'goal' || event.type == 'shot' || event.type == 'penalty')\"\n" +
    "                  ng-click=\"remove(event)\" class=\"fi-x clickable\"></span>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"columns medium-5\" ng-show=\"event.team === match.team1\">&nbsp;</div>\n" +
    "        <div class=\"columns medium-5\" ng-hide=\"event.team === match.team1\">\n" +
    "            <div ng-show=\"event.type == 'goal'\" ng-class=\"event.team.color\">gól: <b>{{ event.data.shooter.nickname }}</b>\n" +
    "                <span ng-show=\"event.data.assistance\"> - {{ event.data.assistance.nickname }}</span>\n" +
    "                <span ng-show=\"event.data.type == 'shootout'\"> - penaltový rozstřel</span>\n" +
    "                <span ng-show=\"event.data.type == 'penalty'\"> - penalta</span>\n" +
    "            </div>\n" +
    "            <div ng-show=\"event.type == 'shot'\" ng-class=\"event.team.color\">střela<span ng-show=\"event.data.shooter\">: {{ event.data.shooter.nickname }}</span></div>\n" +
    "            <div ng-show=\"event.type == 'penalty'\" ng-class=\"event.team.color\"><span class=\"fi-alert\"> {{ event.data.cardText }} karta</span>: <b>{{ event.data.player.nickname }}</b> - {{ event.data.reason }}</div>\n" +
    "            <div ng-show=\"event.type == 'halftime'\"><hr><b>konec poločasu</b> </div>\n" +
    "            <div ng-show=\"event.type == 'end'\"><b>konec zápasu</b></div>\n" +
    "            <div ng-show=\"event.type== 'goalieChange'\" ng-class=\"event.team.color\"><span class=\"fi-loop\"> změna brankáře</span>: <b>{{ event.data.goalie.nickname }}</b></div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "</div>\n" +
    "\n" +
    "<div id=\"editGoal\" class=\"medium reveal-modal\" data-reveal>\n" +
    "    <h2 id=\"modalTitle\">Gól - {{ goal.team.name_pure }}</h2>\n" +
    "    <label>Čas\n" +
    "        <input type=\"text\" ng-model=\"goal.time\">\n" +
    "    </label>\n" +
    "    <label>Střelec\n" +
    "        <select\n" +
    "            ng-model=\"goal.shooter\"\n" +
    "            ng-options=\"player as player.nickname for player in goal.team.players\">\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <label>Asistence\n" +
    "        <select\n" +
    "                ng-model=\"goal.assistance\"\n" +
    "                ng-options=\"player as player.nickname for player in goal.team.players\">\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <label>Typ gólu {{ goal.type }}:\n" +
    "        <select ng-model=\"goal.type\">\n" +
    "            <option value=\"normal\">Běžný</option>\n" +
    "            <option value=\"penalty\">Penalta</option>\n" +
    "            <option value=\"shootout\">Penaltový rozstřel</option>\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <button ng-click=\"editGoal()\">Upravit</button>\n" +
    "\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>\n" +
    "\n" +
    "<div id=\"newGoal\" class=\"small reveal-modal\" data-reveal>\n" +
    "    <h2 id=\"modalTitle\">Gól - {{ goal.team.name_pure }} - <span ng-hide=\"goal.shooter\">střelec</span><span ng-show=\"goal.shooter\">asistence</span></h2>\n" +
    "    <div class=\"row\" ng-hide=\"goal.shooter\">\n" +
    "        <div\n" +
    "                class=\"columns medium-6 large-4\"\n" +
    "                ng-repeat=\"player in goal.team.players\"\n" +
    "                ng-click=\"goal.shooter = player\"\n" +
    "        ><div class=\"pressbutton\"><h5>{{ player.nickname }}</h5></div></div>\n" +
    "        <div class=\"columns medium-6 large-4\" >&nbsp;</div>\n" +
    "    </div>\n" +
    "    <div class=\"row\" ng-show=\"goal.shooter\">\n" +
    "        <div\n" +
    "                class=\"columns medium-6 large-4\"\n" +
    "                ng-repeat=\"player in goal.team.players\"\n" +
    "                ng-click=\"saveGoal(player)\"\n" +
    "        >\n" +
    "            <div style=\"padding: 10px 20px; margin: 6px;\" ng-show=\"player == goal.shooter\"><h5>&nbsp;</h5></div>\n" +
    "            <div class=\"pressbutton\" ng-show=\"player != goal.shooter\"><h5>{{ player.nickname }}</h5></div></div>\n" +
    "        <div class=\"columns medium-6 large-4\" ng-click=\"saveGoal(null);\"><div class=\"pressbutton red\"><h5>nikdo</h5></div></div>\n" +
    "        <div class=\"columns medium-6 large-4\" ng-click=\"goal.type = 'penalty'; saveGoal(null);\"><div class=\"pressbutton red\"><h5>penalta</h5></div></div>\n" +
    "        <div class=\"columns medium-6 large-4\" ng-click=\"goal.type = 'shootout'; saveGoal(null);\"><div class=\"pressbutton red\"><h5>rozstřel</h5></div></div>\n" +
    "    </div>\n" +
    "\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>\n" +
    "\n" +
    "<div id=\"editPenalty\" class=\"small reveal-modal\" data-reveal>\n" +
    "    <h2 id=\"modalTitle\">Karta - {{ penalty.team.name_pure }}</h2>\n" +
    "    <label>Čas\n" +
    "        <input type=\"text\" ng-model=\"penalty.time\">\n" +
    "    </label>\n" +
    "    <label>Hráč\n" +
    "        <select\n" +
    "                ng-model=\"penalty.player\"\n" +
    "                ng-options=\"player as player.nickname for player in penalty.team.players\">\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <label>Karta\n" +
    "        <select\n" +
    "                ng-model=\"penalty.card\"\n" +
    "                ng-options=\"card.id as card.text for card in cards\">\n" +
    "        </select>\n" +
    "    </label>\n" +
    "    <label>Odůvodnění\n" +
    "        <textarea ng-model=\"penalty.reason\"></textarea>\n" +
    "    </label>\n" +
    "    <button ng-click=\"editPenalty()\">Upravit</button>\n" +
    "\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<div id=\"newPenalty\" class=\"small reveal-modal\" data-reveal>\n" +
    "    <h2 id=\"modalTitle\">Karta - {{ penalty.team.name_pure }}<span ng-show=\"penalty.player\"> - {{ penalty.player.nickname }}</span></h2>\n" +
    "    <div class=\"row\" ng-hide=\"penalty.player\">\n" +
    "        <div\n" +
    "                class=\"columns medium-6 large-4\"\n" +
    "                ng-repeat=\"player in penalty.team.players\"\n" +
    "                ng-click=\"penalty.player = player\"\n" +
    "        ><div class=\"pressbutton\"><h5>{{ player.nickname }}</h5></div></div>\n" +
    "    </div>\n" +
    "    <div ng-show=\"penalty.player\">\n" +
    "        <label>Karta\n" +
    "            <select\n" +
    "                    ng-model=\"penalty.card\"\n" +
    "                    ng-options=\"card.id as card.text for card in cards\">\n" +
    "            </select>\n" +
    "        </label>\n" +
    "        <label>Odůvodnění\n" +
    "            <select ng-model=\"penalty.reason\">\n" +
    "                <option></option>\n" +
    "                <option>Útočný faul</option>\n" +
    "                <option>Nebezpečná střela</option>\n" +
    "                <option>Obraný faul</option>\n" +
    "                <option>Držení</option>\n" +
    "                <option>Drsná hra</option>\n" +
    "                <option>Nesportovní chování</option>\n" +
    "                <option>Urážení rozhodčího</option>\n" +
    "                <option>Jiné</option>\n" +
    "            </select>\n" +
    "            <input ng-model=\"penalty.reason_extra\" placeholder=\"dodatečné info\">\n" +
    "        </label>\n" +
    "        <button ng-show=\"penalty.reason\" ng-click=\"savePenalty()\">Udělit</button>\n" +
    "    </div>\n" +
    "\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<div id=\"newGoalieChange\" class=\"small reveal-modal\" data-reveal>\n" +
    "    <h2 id=\"modalTitle\">Změna brankáře - {{ goalieChange.team.name_pure }}</h2>\n" +
    "    <div class=\"row\" ng-hide=\"goalieChange.goalie\" >\n" +
    "        <div\n" +
    "                class=\"columns medium-6 large-4\"\n" +
    "                ng-repeat=\"player in goalieChange.team.players\"\n" +
    "                ng-click=\"goalieChange.goalie = player; saveGoalieChange()\"\n" +
    "        ><div class=\"pressbutton\"><h5>{{ player.nickname }}</h5></div></div>\n" +
    "    </div>\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<div id=\"changeReferee\" class=\"small reveal-modal\" data-reveal>\n" +
    "    <h2 id=\"modalTitle\">Volba hlavního rozhodčího</h2>\n" +
    "    <label>\n" +
    "        <select\n" +
    "                ng-model=\"match.referee\"\n" +
    "                ng-change=\"changeReferee()\"\n" +
    "                ng-options=\"player as player.nickname for player in match.referee_team.players\">\n" +
    "        </select>\n" +
    "    </label>\n" +
    "\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>"
  );


  $templateCache.put('tournament_registration.html',
    "<div class=\"loader\" ng-hide=\"tournament\"></div>\n" +
    "\n" +
    "<div class=\"row\"><div ng-show=\"tournament\" class=\"columns medium-6 medium-offset-3\">\n" +
    "\n" +
    "    <div ng-cloak class=\"text-center\" ng-hide=\"tournament.registration_open\">\n" +
    "        Přihlašování na turnaj bylo již uzavřeno.\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-cloak class=\"text-center\" ng-hide=\"user.is_authorized\">\n" +
    "        Přihlaš se prosím účtem, který je spárovaný s nějakým hráčem.\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-show=\"tournament.registration_open && user.is_authorized\">\n" +
    "        <h3>{{ tournament.full_name }}</h3>\n" +
    "        <p ng-show=\"error\" class=\"red\">{{ error }}</p>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"columns medium-6\">\n" +
    "                <label>\n" +
    "                    Tým\n" +
    "                    <select ng-model=\"team\" ng-options=\"team as team.name for team in teams| orderBy:'name'\">\n" +
    "                        <option value=\"\">----</option>\n" +
    "                    </select>\n" +
    "                </label>\n" +
    "            </div>\n" +
    "            <div class=\"columns medium-6\">\n" +
    "                <br>\n" +
    "                <a href=\"#\" data-reveal-id=\"newTeam\">vytvořit nový tým</a>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "        <label>\n" +
    "            Jméno na tomto turnaji (pouze pokud se liší od běžného jména týmu)\n" +
    "            <input type=\"text\" ng-model=\"registration.name\" placeholder=\"{{ team.name }}\">\n" +
    "        </label>\n" +
    "        <label>\n" +
    "            Zkrácené jméno na tomto turnaji (pouze pokud se liší od běžného zkráceného jména týmu)\n" +
    "            <input type=\"text\" ng-model=\"registration.name_short\" placeholder=\"{{ team.name_short }}\">\n" +
    "        </label>\n" +
    "        <label>\n" +
    "            Kontaktní email\n" +
    "            <input type=\"email\" ng-model=\"registration.contact_mail\">\n" +
    "        </label>\n" +
    "        <label>\n" +
    "            Kontaktní telefon\n" +
    "            <input type=\"text\" ng-model=\"registration.contact_phone\">\n" +
    "        </label>\n" +
    "        <label>\n" +
    "            Odhad síly (1 - 4)\n" +
    "            <input type=\"number\" max=\"4\" min=\"1\" ng-model=\"registration.strength\">\n" +
    "        </label>\n" +
    "        <ol style=\"font-size: 0.8em\">\n" +
    "            <li>Budeme na bedně</li>\n" +
    "            <li>Budeme ve finálové skupině (top 8)</li>\n" +
    "            <li>Budeme kolem poloviny</li>\n" +
    "            <li>Přišli jsem si jen zahrát, na nějaké umístění to nevidíme</li>\n" +
    "        </ol>\n" +
    "        <button ng-disabled=\"!registration.team || !registration.contact_mail || !registration.contact_phone || !registration.strength\" ng-click=\"register()\">Přihlásit</button>\n" +
    "    </div>\n" +
    "</div> </div>\n" +
    "\n" +
    "\n" +
    "<div id=\"newTeam\" class=\"small reveal-modal\" data-reveal aria-hidden=\"true\" role=\"dialog\">\n" +
    "    <h2 id=\"modalTitle\">Nový tým</h2>\n" +
    "    <label>\n" +
    "        Jméno\n" +
    "        <input type=\"text\" ng-model=\"newTeam.name\">\n" +
    "    </label>\n" +
    "    <label>\n" +
    "        Zkrácené jméno\n" +
    "        <input type=\"text\" ng-model=\"newTeam.name_short\" placeholder=\"nepovinné, např. (JZM, DIK, DvT, ...)\">\n" +
    "    </label>\n" +
    "    <label>\n" +
    "        Popis (volitelné)\n" +
    "        <textarea name=\"\" id=\"\" cols=\"30\" rows=\"10\" title=\"Popis\" ng-model=\"newTeam.description\"></textarea>\n" +
    "    </label>\n" +
    "    <button ng-hide=\"newTeam.saving\" ng-disabled=\"!newTeam.name\" ng-click=\"addTeam()\">Vytvořit</button>\n" +
    "    <div class=\"loader\" ng-show=\"newTeam.saving\"></div>\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>"
  );


  $templateCache.put('tournament_team.html',
    "<div class=\"loader\" ng-hide=\"team\"></div>\n" +
    "\n" +
    "<div ng-show=\"team\" class=\"row\">\n" +
    "    <a href=\"/turnaj/{{ tournament.pk }}\" class=\"left\">&lsaquo; zpět</a>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <h1>{{ tournament.full_name }} - {{ team.name }}</h1>\n" +
    "\n" +
    "    <div class=\"columns medium-6\">\n" +
    "        <h3>Hráči</h3>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"row collapse\">\n" +
    "                <div class=\"small-9 columns\">\n" +
    "                    <select ng-model=\"player\" ng-options=\"player as player.full_name for player in players| orderBy:'full_name'\">\n" +
    "                        <option value=\"\">----</option>\n" +
    "                    </select>\n" +
    "                </div>\n" +
    "                <div class=\"small-3 columns\">\n" +
    "                    <a href=\"#\" ng-click=\"addAttendance()\" ng-disabled=\"!player\" class=\"button postfix\">Přidat</a>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"text-right\"><a href=\"#\" data-reveal-id=\"newPlayer\">Nový hráč</a></div>\n" +
    "\n" +
    "        <ul>\n" +
    "            <li ng-repeat=\"player in team.players | orderBy: 'full_name'\">\n" +
    "                <i class=\"fi-x\" ng-click=\"removeAttendance(player)\"></i>\n" +
    "                <a href=\"hrac/{{ player.pk }}/{{ player.nickname }}\">{{ player.full_name }}\n" +
    "                </a>\n" +
    "            </li>\n" +
    "        </ul>\n" +
    "\n" +
    "        <hr>\n" +
    "        <h3>Kapitán</h3>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"row collapse\">\n" +
    "                <div class=\"small-9 columns\">\n" +
    "                        <select ng-model=\"team.captain\"\n" +
    "                                ng-change=\"captainMsg = null\"\n" +
    "                                ng-options=\"player as player.full_name for player in team.players| orderBy:'full_name'\">\n" +
    "                            <option value=\"\">----</option>\n" +
    "                        </select>\n" +
    "                </div>\n" +
    "                <div class=\"small-3 columns\">\n" +
    "                    <a href=\"#\" ng-click=\"setCaptain()\" ng-disabled=\"!team.captain\" class=\"button postfix\">Nastavit</a>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <h3>Výchozí brankář</h3>\n" +
    "        <div class=\"row\">\n" +
    "            <div class=\"row collapse\">\n" +
    "                <div class=\"small-9 columns\">\n" +
    "                        <select ng-model=\"team.defaultGoalie\"\n" +
    "                                ng-change=\"captainMsg = null\"\n" +
    "                                ng-options=\"player as player.full_name for player in team.players| orderBy:'full_name'\">\n" +
    "                            <option value=\"\">----</option>\n" +
    "                        </select>\n" +
    "                </div>\n" +
    "                <div class=\"small-3 columns\">\n" +
    "                    <a href=\"#\" ng-click=\"setDefaultGoalie()\" ng-disabled=\"!team.defaultGoalie\" class=\"button postfix\">Nastavit</a>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "        {{ captainMsg }}\n" +
    "\n" +
    "    </div>\n" +
    "    <div class=\"columns medium-6\">\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<div id=\"newPlayer\" class=\"small reveal-modal\" data-reveal>\n" +
    "    Ujisti se prosím, že hráč určitě není v systému.\n" +
    "    <h2 id=\"modalTitle\">Nový hráč</h2>\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns small-6\">\n" +
    "            <label>Přezdívka\n" +
    "                <input type=\"text\" ng-model=\"newPlayer.nickname\" placeholder=\"povinné\"/>\n" +
    "            </label>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-6\">\n" +
    "            <label>Pohlaví\n" +
    "                <select\n" +
    "                    ng-model=\"newPlayer.gender\"\n" +
    "                    ng-options=\"gender.id as gender.text for gender in genders\">\n" +
    "                    <option value=\"\">----</option>\n" +
    "                </select>\n" +
    "            </label>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns small-6\">\n" +
    "            <label>Jméno\n" +
    "                <input type=\"text\" ng-model=\"newPlayer.name\" />\n" +
    "            </label>\n" +
    "        </div>\n" +
    "        <div class=\"columns small-6\">\n" +
    "            <label>Příjmení\n" +
    "                <input type=\"text\" ng-model=\"newPlayer.lastname\" />\n" +
    "            </label>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns small-6\">\n" +
    "            <label>Datum narození\n" +
    "                <input type=\"date\" ng-change=\"computeAge()\" ng-model=\"newPlayer.birthdate\">\n" +
    "            </label>\n" +
    "        </div>\n" +
    "         <div class=\"columns small-6\">\n" +
    "            <label>Věk\n" +
    "                <input disabled type=\"text\" ng-model=\"newPlayer.age\" />\n" +
    "            </label>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <i>Datum narození nebude zveřejňováno (pouze jako věk).</i>\n" +
    "\n" +
    "    <br>\n" +
    "\n" +
    "    <button ng-hide=\"newPlayer.saving\" ng-disabled=\"!newPlayer.nickname\" ng-click=\"addPlayer()\">Vytvořit</button>\n" +
    "    <div class=\"loader\" ng-show=\"newPlayer.saving\"></div>\n" +
    "    <a class=\"close-reveal-modal\" aria-label=\"Close\">&#215;</a>\n" +
    "</div>\n"
  );


  $templateCache.put('tournament.html',
    "<div class=\"loader\" ng-hide=\"tournament\"></div>\n" +
    "\n" +
    "<div ng-cloak ng-show=\"tournament\">\n" +
    "    <a href back class=\"left\">&lsaquo; zpět</a>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <a class=\"right\" href=\"/skupiny/{{ tournament.pk }}\"><button>Skupiny</button></a>\n" +
    "    <a ng-if=\"tournament.is_tournament_open\" class=\"right\" href=\"/turnaj/{{ tournament.pk }}\" style=\"margin-right: 10px;\"><button>Spravovat</button></a>\n" +
    "    <a ng-if=\"!tournament.closed_edit\" class=\"right\" href=\"/hodnoceni_rozhodcich/{{ tournament.pk }}\" style=\"margin-right: 10px;\"><button>Hodnocení rozhodčích</button></a>\n" +
    "\n" +
    "    <h1>{{ tournament.full_name }}</h1>\n" +
    "\n" +
    "    <ul ng-show=\"goalCount\">\n" +
    "        <li>lokace: {{ tournament.location }}</li>\n" +
    "        <li>kategorie: {{ tournament.category }}</li>\n" +
    "        <li><b>{{ tournament.teamOnTournaments.length }}</b> týmů odehrálo <b>{{ tournament.matches.length }}</b> zápasů</li>\n" +
    "        <li>celkem se zúčastnilo <b>{{ playerCount }}</b> hráčů</li>\n" +
    "        <li>bylo vstřeleno <b>{{ goalCount }}</b> branek</li>\n" +
    "    </ul>\n" +
    "\n" +
    "    <hr>\n" +
    "\n" +
    "    <div class=\"row\"><div class=\"medium-6 column large-4 \" class=\"row\">\n" +
    "        <select\n" +
    "            ng-model=\"filterTeam\"\n" +
    "            ng-options=\"team.name as team.name for team in tournament.teamOnTournaments | orderBy:'name'\">\n" +
    "            <option value=\"\">Všechny týmy</option>\n" +
    "        </select>\n" +
    "    </div></div>\n" +
    "\n" +
    "    <div class=\"row\">\n" +
    "        <div class=\"columns medium-7\">\n" +
    "            <h3>Týmy</h3>\n" +
    "            <table>\n" +
    "                <thead>\n" +
    "                    <tr>\n" +
    "                        <td>#</td>\n" +
    "                        <th>Jméno</th>\n" +
    "                        <th>Skóre</th>\n" +
    "                        <th>Hráči</th>\n" +
    "                    </tr>\n" +
    "                </thead>\n" +
    "                <tbody>\n" +
    "                    <tr ng-repeat=\"t in tournament.teamOnTournaments | filter: { name : filterTeam } | orderBy:'rank'\">\n" +
    "                        <th class=\"text-right\">\n" +
    "                            <span ng-show=\"t.rank\">{{ t.rank }}.</span>\n" +
    "                            <span ng-hide=\"t.rank\">-</span>\n" +
    "                        </th>\n" +
    "                        <td>\n" +
    "                            <a ng-href=\"tym/{{ t.team.pk }}/{{ t.name }}\">{{ t.name}}</a>\n" +
    "                        </td>\n" +
    "                        <td>\n" +
    "                            {{ t.goals_scored }}:{{ t.goals_recieved }}\n" +
    "                        </td>\n" +
    "                        <td>\n" +
    "                            <span ng-repeat=\"player in t.players\">\n" +
    "                                <a ng-href=\"hrac/{{ player.pk }}/{{ player.nickname }}\">{{ player.nickname }}</a><span ng-hide=\"$last\">, </span>\n" +
    "                            </span>\n" +
    "                        </td>\n" +
    "                    </tr>\n" +
    "                </tbody>\n" +
    "            </table>\n" +
    "\n" +
    "            <h3 ng-show=\"tournament.matches.length > 1\">Zápasy</h3>\n" +
    "            <table style=\"margin: auto\" ng-show=\"tournament.matches.length\">\n" +
    "                <tbody>\n" +
    "                    <tr class=\"hoverLight\" ng-repeat=\"match in tournament.matches | filter: {length: '', search: filterTeam }| orderBy:'start'\">\n" +
    "                            <td class=\"text-right\"> {{ match.team_one.name_pure }}</td>\n" +
    "                            <td class=\"text-right\"><b>{{ match.score_one }}</b></td>\n" +
    "                            <td><b>{{ match.score_two }}<span ng-show=\"match.with_shootout\">P</span></b></td>\n" +
    "                            <td>{{ match.team_two.name_pure }}</td>\n" +
    "                            <td><a href=\"/turnaj/zapas/{{ tournament.pk }}/{{ match.pk }}\">detail</a></td>\n" +
    "                    </tr>\n" +
    "                </tbody>\n" +
    "            </table>\n" +
    "        </div>\n" +
    "        <div class=\"columns medium-5\">\n" +
    "            <label class=\"man\" style=\"float: right !important; margin-left: 10px;\"> <input type=\"checkbox\" ng-change=\"filterPlayers()\" ng-model=\"man\"> </label>\n" +
    "            <label class=\"woman\" style=\"float: right !important;\"> <input type=\"checkbox\" ng-change=\"filterPlayers()\" ng-model=\"woman\"> </label>\n" +
    "            <h3>Nejlepší hráči</h3>\n" +
    "            <div st-rank st-table=\"rows\" st-safe-src=\"players\" ng-cloak ng-show=\"players\">\n" +
    "                <table class=\"smart-table\">\n" +
    "                    <thead>\n" +
    "                    <tr>\n" +
    "                        <th>#</th>\n" +
    "                        <th st-sort=\"nickname\" class=\"clickable\">Jméno</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"goalsSumFiltered\" st-descending-first=\"true\">góly</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"assistsSumFiltered\" st-descending-first=\"true\">asistence</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"canadaFiltered\" st-descending-first=\"true\">kanada</th>\n" +
    "                    </tr>\n" +
    "                    </thead>\n" +
    "                    <tbody>\n" +
    "                    <tr ng-repeat=\"player in rows\">\n" +
    "                        <th>{{ player.rank }}.</th>\n" +
    "                        <td><a ng-class=\"player.gender\" href=\"\" ng-href=\"hrac/{{ player.pk }}/{{ player.nickname }}\">{{player.nickname}}</a></td>\n" +
    "                        <td class=\"text-right\"> {{ player.goalsSumFiltered }}</td>\n" +
    "                        <td class=\"text-right\">{{ player.assistsSumFiltered }}</td>\n" +
    "                        <td class=\"text-right\">{{ player.canadaFiltered }}</td>\n" +
    "                    </tr>\n" +
    "                    </tbody>\n" +
    "                    <tfoot>\n" +
    "                        <tr>\n" +
    "                            <td colspan=\"5\" class=\"text-center\">\n" +
    "                                <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"5\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                            </td>\n" +
    "                        </tr>\n" +
    "                    </tfoot>\n" +
    "                </table>\n" +
    "            </div>\n" +
    "\n" +
    "            <h3 ng-show=\"goalies\">Nejlepší brankáři</h3>\n" +
    "            <div st-rank st-table=\"rows2\" st-safe-src=\"goalies\" ng-cloak ng-show=\"goalies\">\n" +
    "                <table class=\"smart-table\">\n" +
    "                    <thead>\n" +
    "                    <tr>\n" +
    "                        <th>#</th>\n" +
    "                        <th st-sort=\"player.nickname\" class=\"clickable\">Jméno</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"matches\" st-descending-first=\"true\">zápasů</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"shots\" st-descending-first=\"true\">střel</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"goals\" st-descending-first=\"true\">gólů</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"success\" st-descending-first=\"true\">úspěšnost</th>\n" +
    "                    </tr>\n" +
    "                    </thead>\n" +
    "                    <tbody>\n" +
    "                    <tr ng-repeat=\"goalie in rows2\">\n" +
    "                        <th>{{ goalie.rank }}.</th>\n" +
    "                        <td><a ng-class=\"goalie.player.gender\" href=\"\" ng-href=\"hrac/{{ goalie.player.pk }}/{{ goalie.player.nickname }}\">{{goalie.player.nickname}}</a></td>\n" +
    "                        <td class=\"text-right\"> {{ goalie.matches }}</td>\n" +
    "                        <td class=\"text-right\"> {{ goalie.shots }}</td>\n" +
    "                        <td class=\"text-right\"> {{ goalie.goals }}</td>\n" +
    "                        <td class=\"text-right\"> {{ goalie.success * 100 | number:1 }}%</td>\n" +
    "                    </tr>\n" +
    "                    </tbody>\n" +
    "                    <tfoot>\n" +
    "                        <tr>\n" +
    "                            <td colspan=\"6\" class=\"text-center\">\n" +
    "                                <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"5\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                            </td>\n" +
    "                        </tr>\n" +
    "                    </tfoot>\n" +
    "                </table>\n" +
    "            </div>\n" +
    "\n" +
    "            <h3 ng-show=\"pairs.length\">Nejproduktivnější dvojice</h3>\n" +
    "            <div st-rank st-table=\"rows3\" st-safe-src=\"pairs\" ng-cloak ng-show=\"pairs.length\">\n" +
    "                <table class=\"smart-table\">\n" +
    "                    <thead>\n" +
    "                    <tr>\n" +
    "                        <th>#</th>\n" +
    "                        <th class=\"clickable\">Hráč 1</th>\n" +
    "                        <th class=\"clickable\">Hráč 2</th>\n" +
    "                        <th class=\"text-right clickable\" st-sort=\"points\" st-descending-first=\"true\">body</th>\n" +
    "                    </tr>\n" +
    "                    </thead>\n" +
    "                    <tbody>\n" +
    "                    <tr ng-repeat=\"pair in rows3\">\n" +
    "                        <th>{{ pair.rank }}.</th>\n" +
    "                        <td>\n" +
    "                            <a ng-class=\"pair.player1.gender\" href=\"\" ng-href=\"hrac/{{ pair.player1.pk }}/{{ pair.player1.nickname }}\">\n" +
    "                                {{ pair.player1.nickname }}\n" +
    "                            </a>\n" +
    "                            <span ng-if=\"pair.goals_first\">({{ pair.goals_first }})</span>\n" +
    "                        </td>\n" +
    "                        <td>\n" +
    "                            <a ng-class=\"pair.player2.gender\" href=\"\" ng-href=\"hrac/{{ pair.player2.pk }}/{{ pair.player2.nickname }}\">\n" +
    "                                {{pair.player2.nickname}}\n" +
    "                            </a>\n" +
    "                            <span ng-if=\"pair.goals_second\">({{ pair.goals_second }})</span>\n" +
    "                        </td>\n" +
    "                        <td class=\"text-right\"> {{ pair.points }}</td>\n" +
    "                    </tr>\n" +
    "                    </tbody>\n" +
    "                    <tfoot>\n" +
    "                        <tr>\n" +
    "                            <td colspan=\"6\" class=\"text-center\">\n" +
    "                                <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"5\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                            </td>\n" +
    "                        </tr>\n" +
    "                    </tfoot>\n" +
    "                </table>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "</div>\n"
  );


  $templateCache.put('tournaments.html',
    "<div class=\"loader\" ng-hide=\"tournaments\"></div>\n" +
    "\n" +
    "<div st-persist=\"tournaments\" st-table=\"rows\" st-safe-src=\"tournaments\" ng-cloak ng-show=\"tournaments\">\n" +
    "    <table class=\"smart-table\">\n" +
    "        <thead>\n" +
    "        <tr>\n" +
    "            <th width=\"30%\" st-sort=\"name\">Jméno</th>\n" +
    "            <th width=\"20%\" st-sort=\"date\">Datum</th>\n" +
    "            <th width=\"10%\">Týmů</th>\n" +
    "            <th width=\"10%\">Lokace</th>\n" +
    "            <th width=\"10%\">Kategorie</th>\n" +
    "        </tr>\n" +
    "        </thead>\n" +
    "        <tbody>\n" +
    "        <tr ng-repeat=\"tournament in rows\">\n" +
    "            <td><a ng-href=\"/turnaj/{{ tournament.pk }}/{{ tournament.full_name }}\">{{ tournament.full_name }}</a></td>\n" +
    "            <td>{{ tournament.date }}</td>\n" +
    "            <td>{{ tournament.teamOnTournaments.length }}</td>\n" +
    "            <td>{{ tournament.location }}</td>\n" +
    "            <td>{{ tournament.category }}</td>\n" +
    "        </tr>\n" +
    "        </tbody>\n" +
    "        <tfoot>\n" +
    "            <tr>\n" +
    "                <td colspan=\"5\" class=\"text-center\">\n" +
    "                    <div st-pagination=\"\" st-items-by-page=\"15\" st-displayed-pages=\"10\" st-template=\"utils/st-pagination.html\"></div>\n" +
    "                </td>\n" +
    "            </tr>\n" +
    "        </tfoot>\n" +
    "    </table>\n" +
    "</div>\n"
  );


  $templateCache.put('utils/st-pagination.html',
    "<nav ng-if=\"pages.length >= 2\">\n" +
    "    <div class=\"pagination-centered\">\n" +
    "        <ul class=\"pagination\">\n" +
    "            <li class=\"arrow\" ng-class=\"{unavailable : currentPage == 1}\"><a ng-click=\"selectPage(1)\">&laquo;</a></li>\n" +
    "            <li class=\"arrow\" ng-class=\"{unavailable : currentPage == 1}\"><a ng-click=\"selectPage(currentPage - 1)\">&lsaquo;</a></li>\n" +
    "            <li ng-repeat=\"page in pages\" ng-class=\"{current: page==currentPage}\"><a ng-click=\"selectPage(page)\">{{page}}</a> </li>\n" +
    "            <li class=\"arrow\" ng-class=\"{unavailable : currentPage == numPages}\"><a ng-click=\"selectPage(currentPage + 1)\">&rsaquo;</a></li>\n" +
    "            <li class=\"arrow\" ng-class=\"{unavailable : currentPage == numPages}\"><a ng-click=\"selectPage(numPages)\">&raquo;</a></li>\n" +
    "        </ul>\n" +
    "    </div>\n" +
    "</nav>"
  );

}]);
