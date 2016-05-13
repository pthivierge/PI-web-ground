/// <reference path="components/configuration/configuration.html" />
// Routes definitions

(function () {

    var app = angular.module('app');

    var routes = [
        { route: '/', templateUrl: 'app/components/configuration.html' },
        { route: '/configuration', templateUrl: 'app/components/configuration.html' },
        { route: '/info', templateUrl: 'app/components/connection-information.html' }
    ];

    // locationProvider - creates friendly urls in the adress bar
    // configure  routes
    app.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {

        // builds the routes for all our reports
        angular.forEach(routes, function (report) {
            $routeProvider.when(report.route, {
                templateUrl: report.templateUrl,
                reloadOnSearch: false
            });
        });

        // use the HTML5 History API
        $locationProvider.html5Mode(true);
    }
    ]);


    app.run(['$rootScope', function ($rootScope) {
        $rootScope.reportsDefinitions = routes;
    }]);


})();
