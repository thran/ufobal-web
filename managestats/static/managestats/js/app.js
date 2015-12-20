var app = angular.module("ufobal-manage-stats", ['ng.django.urls', 'ui.sortable']);

app.config(["$httpProvider", function ($httpProvider) {
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}]);

var genders = [
        {id: 'man', text: "muž"},
        {id: 'woman', text: "žena"}
    ];

app.service("backend", ["$http", 'djangoUrl', '$filter', function($http, djangoUrl, $filter){
    var prepare_player = function(player){
        player.birthdate = player.birthdate ? new Date(player.birthdate) : null;
    };

    this.get_players = function(){
        return $http.get(djangoUrl.reverse("api:get_players"))
            .success(function(response){
                angular.forEach(response, function(player) {
                    prepare_player(player);
                });
            });
    };

    this.get_player = function(id){
        return $http.get(djangoUrl.reverse("api:get_player", [id]));
    };

    this.get_tournaments = function(){
        return $http.get(djangoUrl.reverse("api:get_tournaments"));
    };

    this.addAttendance = function(player, team){
        return $http.post(djangoUrl.reverse("api:add_attendance"), { player: player, team: team});
    };

    this.removeAttendance = function(player, team){
        return $http.delete(djangoUrl.reverse("api:remove_attendance", [player, team]));
    };

    this.save_player = function(player){
        player.saving = true;
        var player_to_save = angular.copy(player);
        player_to_save.birthdate = $filter('date')(player_to_save.birthdate, "yyyy-MM-dd");
        return $http.post(djangoUrl.reverse("api:save_player"), player_to_save)
            .success(function(response){
                player.saving = false;
            })
            .error(function (response) {
                player.saving = false;
            });
    };

    this.save_team_ranks = function(teams){
        var teams_to_save = angular.copy(teams);
        return $http.post(djangoUrl.reverse("managestats:set_tournament_ranking"), teams_to_save);
    };

}]);


app.controller("sortableController", ["$scope", "$window", "backend", function($scope, $window, backend){
    $scope.teams = $window.teams;
    /*
  $scope.sortableOptions = {
    stop: function(e, ui) {
      backend.save_team_ranks($scope.teams);
    }
  };
  */
    $scope.save_team_ranks = backend.save_team_ranks;
}]);


app.controller("player-detail", ["$scope", "backend", "$location", function($scope, backend, $location){
    var player_id = parseInt($location.$$absUrl.split("/").slice(-1)[0]);

    var getPlayer = function(){
        $scope.loading = true;
        backend.get_player(player_id)
            .success(function(response){
                $scope.player = response;
                $scope.loading = false;
        });
    };

    $scope.genders = genders;

    $scope.compute_age = function(){
        if ($scope.player.birthdate){
            var ageDifMs = Date.now() - Date.parse($scope.player.birthdate);
            var ageDate = new Date(ageDifMs);
            $scope.player.age = Math.abs(ageDate.getUTCFullYear() - 1970);
        }
    };

    $scope.save = function(){
        backend.save_player($scope.player)
            .success(function(){
                $scope.edit = false;
            });
    };

    $scope.addAttendance = function(){
        backend.addAttendance($scope.player.pk, $scope.selectedTeam).success(getPlayer);
    };

    $scope.removeAttendance = function(team, index){
        backend.removeAttendance($scope.player.pk, team).success(getPlayer);
    };

    getPlayer();

    backend.get_tournaments()
        .success(function(response){
            $scope.tournaments = response;
        });
}]);


app.controller("player-bulk-edit", ["$scope", "backend", function ($scope, backend) {

    $scope.genders = genders;

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
                backend.save_player(player)
                    .success(function(){
                        player.changed = false;
                    });
            }
        });
    };

    backend.get_players()
        .success(function(response){
            $scope.players = response;
        });
}]);