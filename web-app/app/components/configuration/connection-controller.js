(function(){

var app = angular.module("app");
app.controller('mainCtrl', function ($scope, $localStorage, $sessionStorage, piWebApiHttpService, $uibModal) {

    // Controller init - when page loads
    function init() {


        $scope.alerts = []; // {type:'danger|warning|success',message:''}
        $scope.loading = 0;
        $scope.assetServer = {};
        $scope.dataServer = {};
        $scope.configuration = $scope.$storage.configuration;


    }

    // Connect to PI Web API and reads the connection information
    $scope.connect = function () {

        $scope.loading++;
        $scope.alerts.length = 0;

        piWebApiHttpService.SetAPIAuthentication($scope.configuration.authType, $scope.configuration.user, $scope.configuration.password);
        piWebApiHttpService.SetPIWebAPIServiceUrl($scope.configuration.url);

        piWebApiHttpService.UserInfo()
            .then(onSuccess)
            .catch(onError)
            .finally(function () {
                $scope.loading--;
            });


        function onSuccess(response) {
            $scope.connectionSuccess = true;
            $scope.userInfo = response.data;
            $scope.alerts.push({
                type: 'success', message: "Connection succeeded. (the call to /system/userinfo returned 200 OK) "
            });

            $scope.$storage.configuration=$scope.configuration;
        }

        function onError(err) {
            $scope.connectionSuccess = false;
            $scope.userInfo = {};

            try {
                var errMessage = err.status + ' ' + err.statusText + ': ' + err.data.Message;
                $scope.alerts.push({type: 'danger', message: errMessage});
            }
            catch (err) {
                $scope.alerts.push({
                    type: 'danger',
                    message: "There was an error with the PI WEB Call.  Make sure the address is correct or that the service is running.  It may also be useful to look in the browser developer tools console and check for complete error messages. F12 or Ctrl+Shift+i"
                });
            }


        }

    };

    // displays the messages
    $scope.openMessages = function () {

        var modalInstance = $uibModal.open({
            animation: $scope.animationsEnabled,
            templateUrl: 'shared/messages.html',
            controller: 'messagesCtrl',
            //  size: size,
            resolve: {
                messages: function () {
                    return $scope.alerts;
                }
            }
        });
    };

    // temp to be deleted
    $scope.alert = function () {
        $scope.alerts.push({
            type: 'danger',
            message: "There was an error with the PI WEB Call.  Make sure the address is correct or that the service is running."
        });

    };

    init();
});


}());