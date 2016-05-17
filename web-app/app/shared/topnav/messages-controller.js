// this is the controller used to display the messages
(function () {
    var app = angular.module("app");
    app.controller('messagesCtrl', function ($scope, $uibModalInstance, messages) {

        $scope.messages = messages;

        // clears the messages
        $scope.clearMessages = function () {
            $scope.messages.length = 0;
            //    $scope.$parent.alerts.length=0;
        };


        $scope.close = function () {

            $uibModalInstance.close();
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };

    });


}());