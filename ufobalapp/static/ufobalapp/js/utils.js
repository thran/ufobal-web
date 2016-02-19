var datetimeFormat = "YYYY-MM-DD HH:mm:ss";
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

app.directive('stRank', [function () {
    return {
        require: '^stTable',
        link: function (scope, element, attr, ctrl) {
            scope.$watch(ctrl.tableState, function () {
                angular.forEach(ctrl.getFilteredCollection(), function(row, index) {
                    row.rank = index + 1;
                });
            }, true);
        }
    };
}]);

var shallow_copy = function(obj, pks){
    var newObj = {};
    angular.forEach(obj, function(value, key){
        if (typeof value !== "object"){
            newObj[key] = value;
        }else if (pks && value && value.pk){
            newObj[key] = value.pk;
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

function unique(arr){
    var newArray = [];
    for(var i=0, j=arr.length; i<j; i++) {
        if (newArray.indexOf(arr[i]) === -1) {
            newArray.push(arr[i]);
        }
    }
    return newArray;
}
