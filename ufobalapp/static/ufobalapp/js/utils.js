app.directive('stPersist', [function () {
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
}]);

 app.directive("stResetSearch", function() {
     return {
        restrict: 'EA',
        require: '^stTable',
        link: function(scope, element, attrs, ctrl) {
          return element.bind('click', function() {
            return scope.$apply(function() {
              var tableState;
              tableState = ctrl.tableState();
              tableState.search.predicateObject = {};
              tableState.pagination.start = 0;
              return ctrl.pipe();
            });
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

app.directive('back', function(){
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element.bind('click', goBack);
            function goBack() {
                history.back();
                scope.$apply();
            }
        }
    };
});
