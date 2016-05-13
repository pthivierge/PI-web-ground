
(function () {

    var app = angular.module("app");
    app.controller('mainCtrl', function ($scope, $localStorage) {

        // getting the local storage object - this object persists all the settings
        // even if the page reloads or if the browser is closed
        $scope.$storage = $localStorage;


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

    });

}());