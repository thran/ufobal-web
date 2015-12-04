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
            otherwise({
                redirectTo: '/'
            });

        $locationProvider.html5Mode(true);
    }]);


app.controller("home", ["$scope", function ($scope) {

}]);



app.controller("players", ["$scope", "dataService", function ($scope, dataService) {
    dataService.getPlayers().then(function(players){
        $scope.players = players;
    });

    $scope.selectPlayer = function(player){
        $scope.player = player;
    };
}]);
