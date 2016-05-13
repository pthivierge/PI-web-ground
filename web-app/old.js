// MAIN SCRIPT FILE - MUST BE LOADED BEFORE ANY OTHER JS FILE


var app = angular.module("PiWebApiSampleApp", ['ui.bootstrap']);


app.controller('DropdownCtrl', function($scope) {

    $scope.items = [
        "The first choice!",
        "And another choice for you.",
        "but wait! A third!"
    ];
});

app.controller("mainCtrl", function ($scope, piWebApiHttpService) {

    $scope.name = 'World';

    $scope.init = function () {
        views = [];
        views.push({
            name: "Configuration",
            active: true
        });
        views.push({
            name: "Write",
            active: false
        });
        views.push({
            name: "Connection",
            active: false
        });
        $scope.views = views;
        $scope.activeView = views[0];

        $scope.alerts = []; // {type:'danger|warning|success',message:''}

        $scope.loading = 0;

        $scope.assetServer = {};
        $scope.dataServer = {};
        $scope.authType = 'Kerberos';


        $scope.WebAPIurl = "https://megatron/piwebapi/";


    };

    function connect() {

        $scope.loading++;
        $scope.alerts.length = 0;

        piWebApiHttpService.SetPIWebAPIServiceUrl($scope.WebAPIurl);

        piWebApiHttpService.UserInfo().then(onSuccess, onError).finally(function () {
            $scope.loading--;
        });


        function onSuccess(response) {
            $scope.userInfo = response.data;
            $scope.onConnect();
            console.log("Got user info");
        }

        function onError(err) {
            $scope.userInfo = {};
            var errMessage = err.status + ' ' + err.statusText + ': ' + err.data.Message;
            $scope.alerts.push({type: 'danger', message: errMessage});
        }

    }

    $scope.$watch('WebAPIurl', function () {
        connect();
    });

    $scope.$watch('authType', function () {
        piWebApiHttpService.SetAPIAuthentication($scope.authType, $scope.basicAuthUser, $scope.basicAuthPassword);
        connect();
    });

    $scope.$watch('assetServer.WebId', function () {


        if (typeof $scope.assetServer.WebId === "undefined")
            return;

        piWebApiHttpService.GetDatabases($scope.assetServer.WebId).then(function (response) {

            $scope.assetServer.Databases = response.data.Items;
            console.log(response)
        });

    });

    $scope.changeView = function (view) {
        $scope.activeView.active = false;
        view.active = true;
        $scope.activeView = view;
    }

    $scope.writeAFValue = function () {
        console.log("writing value");
        piWebApiHttpService.writeValue($scope.WebId, $scope.AfValue).then(onWriteSuccess, onWriteFailure);
    };

    function onWriteSuccess() {
        console.log("write success");
    }

    function onWriteFailure(response) {
        console.log("write failure", response);
    }


    $scope.onConnect = function () {

        piWebApiHttpService.GetDataServers().then(function (response) {
            $scope.dataServers = response.data.Items;

        });


        piWebApiHttpService.GetAssetServers($scope.assetServerName).then(function (response) {
            $scope.assetServers = response.data.Items;
        });


    };

    $scope.DataServerName = "megatron";
    $scope.AssetServerName = "megatron";
    WebAPIurl = "https://megatron/piwebapi/";

    $scope.init();

});

