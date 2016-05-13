(function(){

    var app = angular.module("app");

    app.controller('PICtrl', function($scope, $aside) {

        $scope.openAside = function(position) {
            $aside.open({
                templateUrl: 'aside.html',
                placement: position,
                backdrop: true,
                controller: function($scope, $modalInstance) {
                    $scope.ok = function(e) {
                        $modalInstance.close();
                        e.stopPropagation();
                    };
                    $scope.cancel = function(e) {
                        $modalInstance.dismiss();
                        e.stopPropagation();
                    };
                }
            })
        }

    });


}());