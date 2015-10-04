var app = angular.module("ufobal-manage-stats", ['ng.django.urls']);

app.config(["$httpProvider", function ($httpProvider) {
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}]);

app.controller("player-detail", ["$scope", "$http", "$location", 'djangoUrl',
    function ($scope, $http, $location, djangoUrl) {

    var player_id = parseInt($location.$$absUrl.split("/").slice(-1)[0]);

    var get_player = function(){
        $http.get(djangoUrl.reverse("api:get_player", {pk: player_id}))
            .success(function(response){
                $scope.player = response;
            });
    };

    get_player();

    $scope.test = 42;
}]);