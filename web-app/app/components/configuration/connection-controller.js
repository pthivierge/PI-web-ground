(function(){

var app = angular.module("app");
app.controller('connectionCtrl', function ($scope, $localStorage, $sessionStorage, piWebApiHttpService, $uibModal) {

    // Controller init - when page loads
    function init() {
        
        $scope.alerts = []; // {type:'danger|warning|success',message:''}
        $scope.loading = 0;
        $scope.assetServer = {};
        $scope.dataServer = {};
        $scope.configuration = $localStorage.configuration;
        $scope.userInfo = $scope.$parent.globals.userInfo;

    }

    // Connect to PI Web API and reads the connection information
    $scope.connect = function () {

        console.log("Trying connection ... ");

        $scope.$parent.globals.loading++;
        $scope.alerts.length = 0;

        piWebApiHttpService.SetAPIAuthentication($scope.configuration.authType, $scope.configuration.user, $scope.configuration.password);
        piWebApiHttpService.SetPIWebAPIServiceUrl($scope.configuration.url);

        piWebApiHttpService.UserInfo()
            .then(onSuccess)
            .catch(onError)
            .finally(function () {
                $scope.$parent.globals.loading--;
            });


        function onSuccess(response) {
            $scope.$parent.globals.connectionSuccess = true;
            $scope.$parent.globals.userInfo = response.data;
            $scope.$parent.globals.alerts.push({
                type: 'success', message: "Connection succeeded. (the call to /system/userinfo returned 200 OK) "
            });

            $scope.$storage.configuration=$scope.configuration;
        }

        function onError(err) {
            $scope.$parent.globals.connectionSuccess = false;
            $scope.$parent.globals.userInfo = {};

            try {
                var errMessage = err.status + ' ' + err.statusText + ': ' + err.data.Message;
                $scope.$parent.globals.alerts.push({ type: 'danger', message: errMessage });
            }
            catch (err) {
                $scope.$parent.globals.alerts.push({
                    type: 'danger',
                    message: "There was an error with the PI WEB Call.  Make sure the address is correct or that the service is running.  It may also be useful to look in the browser developer tools console and check for complete error messages. F12 or Ctrl+Shift+i"
                });
            }


        }

    };


    init();
});


}());