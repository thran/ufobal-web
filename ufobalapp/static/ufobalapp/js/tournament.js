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
