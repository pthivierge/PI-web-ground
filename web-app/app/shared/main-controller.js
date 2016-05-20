(function () {
    // creates the angular controller and injects modules it will be using
    // injecting makes sure that if the js code is minified later on then the code will still be working
    angular.module("app").controller("mainController", mainController);
    mainController.$inject = ["$scope", "$route", "$routeParams", "$location", "$localStorage", "$uibModal"];

    function mainController($scope, $route, $routeParams, $location, $localStorage, $uibModal) {

        // initialization - it is no required that is it wrapped into a function, but it makes things clearer
        function init() {

            console.log('main controller initializes');

            // makes routes information visible to the view by creating scope variables with the modules
            $scope.$route = $route;
            $scope.$location = $location;
            $scope.$routeParams = $routeParams;


            // in case it is the first time the page loads we set the parameters here
            $scope.$storage = $localStorage.$default({
                currentPage: "/configuration",
                configuration: {
                    url: 'https://server/piwebapi/',
                    authType: 'Kerberos',
                    user: '',
                    password: ''
                }


            });

            // $scope.globals contains variables that can also be updated or read by child controllers
            $scope.globals = {};

            // keeps informations about the connection
            $scope.globals.userInfo = {IdentityType:"N/A",Name:"N/A", IsAuthenticated:"N/A",SID:"N/A",ImpersonationLevel:"N/A"};
            // contains alerts that can be pushed from child controllers
            $scope.globals.alerts = []; // {type:'danger|warning|success',message:'hello !'}

            $scope.globals.$localStorage = $scope.$storage;

            // when turned on - displays the loader - can be used by child containers: $scope.$parent.loading++;  $scope.$parent.loading--; 
            $scope.globals.loading = 0;
            $scope.globals.assetServer = {};
            $scope.globals.dataServer = {};
            $scope.globals.configuration = $scope.$storage.configuration;

        }

        // ----------------------------------------
        // FUNCTIONS DEFINITIONS
        // ----------------------------------------

        // displays the messages
        $scope.openMessages = function () {

            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: '/app/shared/topnav/messages.html',
                controller: 'messagesCtrl',
                //  size: size,
                resolve: {
                    messages: function () {
                        return $scope.globals.alerts;
                    }
                }
            });
        };

        init();
    };

})();