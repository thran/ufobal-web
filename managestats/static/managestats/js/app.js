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
}]);

app.directive('datepicker', function () {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function ($scope, element, attrs, ngModelCtrl) {
            $(element).datepicker({
                dateFormat: 'yy-mm-dd',
                changeMonth: true,
                changeYear: true,
                yearRange: "1950:2015",
                onSelect: function (date) {
                    ngModelCtrl.$setViewValue(date);
                    $scope.$apply();
                }
            });
        }
    };
});


app.controller("player-bulk-edit", ["$scope", "$http", 'djangoUrl', function ($scope, $http, djangoUrl) {


    $scope.get_players = function(){
        $http.get(djangoUrl.reverse("api:get_players"))
            .success(function(response){
                $scope.players = response;
            });
    };

    $scope.genders = [
        {id: 'man', text: "muž"},
        {id: 'woman', text: "žena"}
    ];

    $scope.$watch("players", function(n, o){
        if (!n){
            return;
        }
        $scope.changed = false;
        $scope.saving = false;
        angular.forEach(n, function(player, key) {
            $scope.changed = $scope.changed || player.changed;
            $scope.saving = $scope.saving || player.saving;
        });
    },true);


    $scope.save = function(){
        angular.forEach($scope.players, function(player, key) {
            if (player.changed){
                player.saving = true;
                $http.post(djangoUrl.reverse("api:save_player"), player)
                    .success(function(response){
                        player.changed = false;
                        player.saving = false;
                    })
                    .error(function (response) {
                        player.saving = false;
                    });
            }
        });
    };

    $scope.get_players();
}]);