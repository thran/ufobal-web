
app.directive("timer", function(){
    return {
        restrict: 'EA',
        replace: false,
        scope: {
            interval: '=',
            interface: '=',
            countdown: '='
        },
        controller: ["$scope", "$element", "$compile", "$timeout", function($scope, $element, $compile, $timeout){
            $element.append($compile($element.contents())($scope));
            var timeoutPromise = null;
            var startTime = null;
            var interval = angular.isDefined($scope.interval) ? $scope.interval : 100;
            var millis = 0;

            var calculateTimeUnits = function () {
                millis = Math.round(millis / 10) * 10;
                $scope.negative = millis < 0;
                if ($scope.negative){
                    millis = 999 - millis;
                }

                $scope.sign = $scope.negative ? "-" : "";
                $scope.deciseconds = Math.floor((millis / 100) % 10);
                $scope.seconds = Math.floor((millis / 1000) % 60);
                $scope.minutes = Math.floor(((millis / (60 * 1000)) % 60));
                $scope.hours = Math.floor(((millis / (60 * 60 * 1000)) % 24));
                $scope.days = Math.floor(((millis / (60 * 60 * 1000)) / 24) % 30);
                $scope.months = Math.floor(((millis / (60 * 60 * 1000)) / 24 / 30) % 12);
                $scope.years = Math.floor((millis / (60 * 60 * 1000)) / 24 / 365);

                $scope.secondsTotal = Math.floor(millis / 1000);
                $scope.minutesTotal = Math.floor(millis / (60 * 1000));
                $scope.hoursTotal = Math.floor(millis / (60 * 60 * 1000));
                $scope.daysTotal = Math.floor(millis / (60 * 60 * 1000) / 24);
                $scope.monthsTotal = Math.floor(millis / (60 * 60 * 1000) / 24 / 30);
                $scope.yearsTotal = Math.floor(millis / (60 * 60 * 1000) / 24 / 365);

                $scope.sseconds = $scope.seconds < 10 ? '0' + $scope.seconds : $scope.seconds;
                $scope.mminutes = $scope.minutes < 10 ? '0' + $scope.minutes : $scope.minutes;
                $scope.hhours = $scope.hours < 10 ? '0' + $scope.hours : $scope.hours;
                $scope.ddays = $scope.days < 10 ? '0' + $scope.days : $scope.days;
                $scope.mmonths = $scope.months < 10 ? '0' + $scope.months : $scope.months;
                $scope.yyears = $scope.years < 10 ? '0' + $scope.years : $scope.years;

                if ($scope.negative){
                    millis = 999 - millis;
                }
            };

            var tick = function () {
                millis = moment().diff(startTime) * ($scope.countdown ? -1 : 1);
                var adjustment = millis % interval;

                if ($scope.interface.running) {
                    timeoutPromise = $timeout(tick, interval - adjustment);
                }
                calculateTimeUnits();
            };

            $scope.interface.setTime = function (time) {
                millis = time;
                calculateTimeUnits();
            };

            $scope.interface.start = function () {
                if ($scope.interface.running){
                    return;
                }
                startTime = moment() - millis * ($scope.countdown ? -1 : 1);
                $scope.interface.running = true;
                tick();
            };

            $scope.interface.reset = function () {
                $scope.interface.stop();
                startTime = null;
                millis = 0;
            };

            $scope.interface.stop = function () {
                $scope.interface.running = false;
                if (timeoutPromise){
                    $timeout.cancel(timeoutPromise);
                }
            };

            $scope.interface.switchState = function () {
                if ($scope.interface.running){
                    $scope.interface.stop();
                }else{
                    $scope.interface.start();
                }
            };

            $scope.interface.addTime = function (time) {
                startTime = moment() - millis * ($scope.countdown ? -1 : 1);
                startTime = startTime - time * ($scope.countdown ? -1 : 1);
                millis = moment().diff(startTime) * ($scope.countdown ? -1 : 1);
                calculateTimeUnits();
            };

            $scope.interface.getTime = function () {
                return millis;
            };

            calculateTimeUnits();
            $scope.interface.running = false;
        }]
   };
});
