app.directive('stPersist', function ($rootScope) {
        return {
            require: '^stTable',
            scope: { stPersist: "=stPersist" },
            link: function (scope, element, attr, ctrl) {
                var nameSpace = attr.stPersist;

                scope.$watch(ctrl.tableState, function (newValue, oldValue) {
                    if (newValue !== oldValue && scope.dataLoaded) {
                        localStorage.setItem(nameSpace, JSON.stringify(newValue));
                    }
                }, true);

                scope.$watch("stPersist", function (newValue, oldValue) {
                    if (newValue) {
                        scope.dataLoaded = true;
                        if (localStorage.getItem(nameSpace)) {
                            var savedState = JSON.parse(localStorage.getItem(nameSpace));
                            var tableState = ctrl.tableState();
                            angular.extend(tableState, savedState);

                            ctrl.pipe();
                        }
                    }
                });

            }
        };
    });

var shallow_copy = function(obj){
    var newObj = {};
    angular.forEach(obj, function(value, key){
        if (typeof value !== "object"){
            newObj[key] = value;
        }
    });
    return newObj;
};
