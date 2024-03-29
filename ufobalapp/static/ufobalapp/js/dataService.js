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
