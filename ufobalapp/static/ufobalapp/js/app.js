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

app.run(['$route', '$rootScope', '$location', function ($route, $rootScope, $location) {
    var original = $location.path;
    $location.path = function (path, reload) {
        if (reload === false) {
            var lastRoute = $route.current;
            var un = $rootScope.$on('$locationChangeSuccess', function () {
                $route.current = lastRoute;
                un();
            });
        }
        return original.apply($location, [path]);
    };
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
            otherwise({
                redirectTo: '/'
            });

        $locationProvider.html5Mode(true);
    }]);


app.controller("home", ["$scope", function ($scope) {

}]);


app.controller("teams", ["$scope", "dataService", function ($scope, dataService) {
    dataService.getTeams().then(function(teams){
        $scope.teams = teams;
    });
}]);

app.controller("team", ["$scope", "dataService", "$routeParams", function ($scope, dataService, $routeParams) {
    var id = parseInt($routeParams.id);
    $scope.getTeamNames = dataService.getTeamNames;

    dataService.getTeams().then(function(teams){
        $scope.teams = teams;
        $scope.team = dataService.getObject("teams", id);
    });
}]);


app.controller("players", ["$scope", "dataService", function ($scope, dataService) {
    $scope.getPlayerTeams = dataService.getPlayerTeams;

    dataService.getPlayers().then(function(players){
        $scope.players = players;
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
        $scope.players = players;
        $scope.player = dataService.getObject("players", id);
    });

    dataService.getTournaments().then(function(tournaments){
        $scope.tournaments = tournaments;
    });
}]);


var shallow_copy = function(obj){
    var newObj = {};
    angular.forEach(obj, function(value, key){
        if (typeof value !== "object"){
            newObj[key] = value;
        }
    });
    return newObj;
};