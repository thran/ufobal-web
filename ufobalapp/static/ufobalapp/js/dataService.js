app.service("dataService", ["$http", "$q", "djangoUrl", "$filter", function($http, $q, djangoUrl, $filter){
    var self = this;
    var data = {};
    var dataMaps = {};
    var deferredTmp = {};
    var dataProcessors = {
        players: function(player){
            player.birthdate = player.birthdate ? new Date(player.birthdate) : null;
            player.tournaments = [];
            player.goals = {};
            player.assists = {};
            player.goalsSum = 0;
            player.assistsSum = 0;
            player.canada = 0;
        },
        teamontournaments: function(teamOnTournament){
            // create and link teams
            if (!dataMaps.teams[teamOnTournament.team.pk]){
                dataMaps.teams[teamOnTournament.team.pk] = teamOnTournament.team;
                data.teams.push(teamOnTournament.team);
                teamOnTournament.team.teamOnTournaments = [];
                teamOnTournament.team.medals = [0, 0, 0, 0, 0];
            }
            dataMaps.teams[teamOnTournament.team.pk].teamOnTournaments.push(teamOnTournament);
            if (teamOnTournament.rank < 6) {
                dataMaps.teams[teamOnTournament.team.pk].medals[teamOnTournament.rank - 1] += 1;
            }

            // create and link tournaments
            if (!dataMaps.tournaments[teamOnTournament.tournament.pk]){
                dataMaps.tournaments[teamOnTournament.tournament.pk] = teamOnTournament.tournament;
                data.tournaments.push(teamOnTournament.tournament);
                teamOnTournament.tournament.teamOnTournaments = [];
            }
            dataMaps.tournaments[teamOnTournament.tournament.pk].teamOnTournaments.push(teamOnTournament);

            // link players
            teamOnTournament.players = [];
            angular.forEach(teamOnTournament.player_pks, function(playerPk){
                var player = dataMaps.players[playerPk];
                player.tournaments.push(teamOnTournament);
                teamOnTournament.players.push(player);
            });
        }
    };

    var getData = function(object){
        if (deferredTmp[object]){
            return deferredTmp[object].promise;
        }
        var deferred = $q.defer();
        if (data[object]){
            deferred.resolve(data[object]);
            return deferred.promise;
        }
        deferredTmp[object] = deferred;
        if (object === "teams" || object === "tournaments"){
            getData("teamontournaments");
        } else if(object === "goals") {
            getGoals();
        } else {
            getDataFromServer(object, deferred);
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

    var getDataFromServer = function(object){
        $http.get(djangoUrl.reverse("api:get_" + object))
            .success(function(response){
                data[object] = response;
                dataMaps[object] = {};
                if (object === "teamontournaments") {
                    data.teams = [];
                    dataMaps.teams = {};
                    data.tournaments = [];
                    dataMaps.tournaments = {};
                    getData("players").then(function(){
                        angular.forEach(response, function(obj) {
                            dataMaps[object][obj.pk] = obj;
                            dataProcessors[object](obj);
                        });
                        angular.forEach(data.teams, function(team) {
                            self.getTeamNames(team);
                        });
                        angular.forEach(data.players, function(player) {
                            self.getPlayerTeams(player);
                        });
                    });
                }else{
                    angular.forEach(response, function(obj) {
                        dataMaps[object][obj.pk] = obj;
                        dataProcessors[object](obj);
                    });
                }
                if (object === "teamontournaments"){
                    resolvePromise("teams");
                    resolvePromise("tournaments");
                }
                resolvePromise(object);
            })
            .error(function (response, status, headers, config) {
                rejectPromise(object, response, status);
                if (object === "teamontournaments"){
                    rejectPromise("teams", response, status);
                    rejectPromise("tournaments", response, status);
                }
            });
    };

    var getGoals = function(){
        $http.get(djangoUrl.reverse("api:get_goals"))
            .success(function(response) {
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
            })
            .error(function (response, status, headers, config) {
                rejectPromise("goals", response, status);
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
        return getData("tournaments");
    };
    self.getGoals = function(){
        getData("players");
        return getData("goals");
    };

    self.getObject = function(object, id){
        if (!dataMaps[object]){
            return null;
        }
        return dataMaps[object][id];
    };

    self.addAttendance = function(player, team){
        player.saving = true;
        return $http.post(djangoUrl.reverse("api:add_attendance"), { player: player.pk, team: team.pk})
            .success(function(){
                if (player.tournaments.indexOf(team) === -1){
                    player.tournaments.push(team);
                }
                player.saving = false;
            })
            .error(function(){
                player.saving = false;
            });
    };

    self.removeAttendance = function(player, team){
        player.saving = true;
        return $http.delete(djangoUrl.reverse("api:remove_attendance", [player.pk, team.pk]))
            .success(function(){
                player.tournaments.splice(player.tournaments.indexOf(team), 1);
                player.saving = false;
            })
            .error(function(){
                player.saving = false;
            });
    };

    self.savePlayer = function(player){
        player.saving = true;
        var player_to_save = shallow_copy(player);
        player_to_save.birthdate = $filter('date')(player.birthdate, "yyyy-MM-dd");
        return $http.post(djangoUrl.reverse("api:save_player"), player_to_save)
            .success(function(response){
                player.saving = false;
            })
            .error(function (response) {
                player.saving = false;
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
                teamsSearch += teamOnTournament.team.name + "###";
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
                namesSearch += teamOnTournament.name_pure + "###";
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
        var assists = unique($.merge(withGoal, withAssists));
        var tournaments = $.map(player.tournaments, function(x){return x.tournament.pk; });
        angular.forEach(tournaments, function(pk){
            var index = assists.indexOf(pk);
            if (index > -1) {
                assists.splice(index, 1);
            }
        });
        if (player.scoreWithoutTeam && player.scoreWithoutTeam.length === assists.length){
            return player.scoreWithoutTeam;
        }
        tournaments = $.map(assists, function(x) { return self.getObject("tournaments", x); });
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
            .success(function (response) {
                stats = response;
                deferred.resolve(response);
            });
        return deferred.promise;
    };
}]);

var genders = [
    {id: 'man', text: "muž"},
    {id: 'woman', text: "žena"}
];