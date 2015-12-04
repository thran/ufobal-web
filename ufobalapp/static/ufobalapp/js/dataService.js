app.service("dataService", ["$http", "$q", "djangoUrl", function($http, $q, djangoUrl){
    var self = this;
    self.players = null;
    self.playersPromise = null;

    var preparePlayer = function(player){
        player.birthdate = player.birthdate ? new Date(player.birthdate) : null;
    };

    var getPlayers = function(){
        $http.get(djangoUrl.reverse("api:get_players"))
            .success(function(response){
                angular.forEach(response, function(player) {
                    preparePlayer(player);
                });
                self.players = response;
                self.playersPromise.resolve(response);
                self.playersPromise = null;
            })
            .error(function (response, status, headers, config) {
                self.playersPromise.reject("Error: request returned status " + status + " and message " + response);
                self.playersPromise = null;
            });
    };

    var getTournaments = function(){
        return $http.get(djangoUrl.reverse("api:get_tournaments"));
    };

    self.getPlayers = function(){
        if (self.playersPromise !== null){
            return self.playersPromise.promise;
        }
        var promise = $q.defer();
        if (self.players !== null){
            promise.resolve(self.players);
            return promise.promise;
        }
        self.playersPromise = promise;
        getPlayers();
        return promise.promise;
    };

    self.addAttendance = function(player, team){
        return $http.post(djangoUrl.reverse("api:add_attendance"), { player: player, team: team});
    };

    self.removeAttendance = function(player, team){
        return $http.delete(djangoUrl.reverse("api:remove_attendance", [player, team]));
    };

    self.savePlayer = function(player){
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
}]);