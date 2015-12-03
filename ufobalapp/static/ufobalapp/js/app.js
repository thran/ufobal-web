var app = angular.module('ufoIS', ["ngCookies", "ngRoute", "mm.foundation"]);

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
                templateUrl: 'static/ufobalapp/ng-parts/home.html',
                controller: "home"
            }).
            otherwise({
                redirectTo: '/'
            });

        $locationProvider.html5Mode(true);
    }]);


app.controller("home", ["$scope", function ($scope) {

}]);
