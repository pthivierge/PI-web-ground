
(function () {

    // todo - inject into controller / to support minification
    var app = angular.module("app");
    app.controller('mainController', function ($scope, $route, $routeParams, $location, $localStorage, $uibModal) {

        function init() {

            console.log('main controller init');

            $scope.$route = $route;
            $scope.$location = $location;
            $scope.$routeParams = $routeParams;


            // in case it is the first time the page loads we set the parameters here
            $scope.$storage = $localStorage.$default({
                currentPage: "/info",
                configuration: {
                    url: 'https://megatron/piwebapi/',
                    authType: 'Kerberos',
                    user: '',
                    password: ''
                }


            });

            $scope.alerts = []; // {type:'danger|warning|success',message:''}
            $scope.loading = 0;
            $scope.assetServer = {};
            $scope.dataServer = {};
            $scope.configuration = $scope.$storage.configuration;

        }

        // displays the messages
        $scope.openMessages = function () {

            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: '/app/shared/topnav/messages.html',
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
                message: "Test alert!"
            });

        };

        init();
    });

}());