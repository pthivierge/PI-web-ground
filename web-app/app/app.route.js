/// <reference path="components/configuration/configuration.html" />
// Routes definitions

(function () {

    var app = angular.module('app');

    var routes = [
        { route: '/', templateUrl: 'app/components/configuration/configuration.html' },
        { route: '/configuration', templateUrl: '/app/components/configuration/configuration.html' },
        { route: '/data-validation', templateUrl: '/app/components/data-validation/data-validation.html' },
        { route: '/oops', templateUrl: '/app/shared/NotImplemented.html' }
    ];

    // locationProvider - creates friendly urls in the adress bar
    // configure  routes
    app.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {

        // builds the routes for all our reports
        angular.forEach(routes, function (route) {
            $routeProvider.when(route.route,
                {
                    templateUrl: route.templateUrl,
                    reloadOnSearch: false
                });

            console.log('Configured route', route.route);
        });

        // use the HTML5 History API
        $locationProvider.html5Mode(true);
    }
    ]);


    app.run([
      '$rootScope',
      function ($rootScope) {
          // see what's going on when the route tries to change
          $rootScope.$on('$routeChangeStart', function (event, next, current) {

              if (!current)
                  return;

              // next is an object that is the route that we are starting to go to
              // current is an object that is the route where we are currently
              var currentPath = current.originalPath;
              var nextPath = next.originalPath;

              console.log('Starting to leave %s to go to %s', currentPath, nextPath);
          });

          $rootScope.$on('$routeChangeError', function (angularEvent, current, previous, rejection) {

              console.log('error with %s', angularEvent);

          });

          $rootScope.$on('$routeChangeSuccess', function (angularEvent, current, previous) {
              console.log('success with %s', angularEvent);
          });
      }
    ]);


})();
