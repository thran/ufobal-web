app.service("userService", ["$http", "djangoUrl", function($http, djangoUrl){
    var self = this;
    self.status = {
        "logged": false,
        "loading": false
    };
    self.user = {};
    self.error = {};

    // called on create
    self.init = function (){
        self.processUser(user);
    };

    // get user profile from backend
    self.loadUser = function(){
        self.status.loading = true;
        return $http.get(djangoUrl.reverse("api:user_profile"))
            .success(function(response){
                _processUser(response);
            })
            .finally(function(response){
                self.status.loading = false;
            });
    };

    self.processUser = function(data){
        _processUser(angular.copy(data));
    };

    // process user data
    var _processUser = function(data){
        if (!data) {
            self.status.logged = false;
            return;
        }
        self.status.logged = true;
        angular.extend(self.user, data);
    };

    self.logout = function(){
        self.status.loading = true;
        $http.get(djangoUrl.reverse("logout"))
            .success(function(response){
                clearObj(self.user);
                self.status.logged = false;
            })
            .finally(function(response){
                self.status.loading = false;
            });
    };

    self.pairUser = function (token) {
        return $http.post(djangoUrl.reverse("api:pair_user", {pairing_token: token}), {})
            .success(function(player){
                self.user.player = player;
            })
            .error(function(response){
            });
    };

    var _resetError = function(){
        clearObj(self.error);
    };

    var clearObj = function(obj){
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)){ delete obj[prop]; }
        }
    };

    self.loadUserFromJS = function (scope) {
        scope.$apply(self.loadUser());
    };

    self.loginGoogle = function() {
        _openPopup("/login/google-oauth2/", "/close_login_popup/");
    };

    self.loginFacebook = function() {
        _openPopup("/login/facebook/", "/close_login_popup/");
    };

    var _openPopup = function(url, next){
        var settings = 'height=700,width=700,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=yes,directories=no,status=yes';
        url += "?next=" + next;
        window.open(url, "popup", settings);
    };

    self.init();

}]);

app.controller("auth", ["$scope", "userService", "$location", function($scope, userService, $location){
    $scope.userService = userService;
    $scope.user = userService.user;

    $scope.openProfile = function () {
        if (userService.user.player){
            $location.path("/hrac/" + userService.user.player.pk + "/" + userService.user.player.nickname);
        }else{
            $location.path("/sparovat_ucet");
        }
    };

    $scope.pairUser = function (token) {
        userService.pairUser(token).success(function(){
            $scope.openProfile();
        })
        .error(function(response){
            $scope.error = "Spárování se nezdařilo  - " + response;
        });
    };
}]);


var social_auth_callback = function(){
    var element = angular.element($("body"));
    element.injector().get("userService").loadUserFromJS(element.scope());
};