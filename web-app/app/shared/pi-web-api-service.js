"use strict";
(function(){
var app = angular.module("app");
app.factory('piWebApiHttpService', ['$http', '$q', function($http, $q) {

  var service = {};

  //
  // Service configuration and initialization methods
  //

  var baseUrl = '';
  var authenticationType = 'Kerberos';

  service.initAuthHeaders=function (authDetails) {
    $http.defaults.headers.common.Authorization = authDetails;
    $http.defaults.withCredentials = true;
    $http.defaults.timeout=3000;
  }

  service.SetPIWebAPIServiceUrl = function(url) {
    baseUrl = url;
  };

  service.SetAPIAuthentication = function(authType, userName, password) {
    authenticationType = authType;

    switch (authType) {
      case "Basic":
        
        var authInfo = userName + ":" + password;
        var base64string = btoa(authInfo); // encode to base 64 IE10+
        initAuthHeaders('Basic ' + base64string);
        console.log("Authentication set to Basic")
        break;
      
      case "Kerberos":
         if("Authorization" in $http.defaults.headers.common)
          delete $http.defaults.headers.common.Authorization;
          $http.defaults.withCredentials = true;
          //initAuthHeaders('Negociate');
          console.log("Authentication set to Kerberos");
        break;
    }

    
  };


  //
  // Data calls
  //

  service.GetDataServer = function(piServerName) {
    return $http.get(baseUrl + "dataservers?name=" + piServerName);
  };

  service.GetDataServers = function() {
    return $http.get(baseUrl + "dataservers");
  };

  service.GetAssetServers = function() {
    return $http.get(baseUrl + "assetservers");
  };

  service.GetAssetServer = function(assetServerName) {
    return $http.get(baseUrl + "assetservers?name=" + assetServerName);
  };

  service.GetDatabases = function(assetServerWebId) {
    return $http.get(baseUrl + 'assetservers/' + assetServerWebId + '/assetdatabases');
  };

  service.GetElementsByPath = function (path) {
      return $http.get(baseUrl + 'elements?path=' + path);
  };

  service.UserInfo = function() {
    return $http.get(baseUrl + 'system/userinfo')
  }


  service.validPIPointName = function(piServerName, piPointName) {
    return $http.get(baseUrl + "points?path=\\\\" + piServerName + "\\" + piPointName).then(function(response) {
      return response;
    });
  };


  service.getSnapshotValue = function(webId) {
    return $http.get(baseUrl + 'streams/' + webId + '/value').then(function(response) {
      return response;
    });
  };


  service.writeValue = function(webId,time, value) {

    var data = {};
    data.Timestamp = time;
    data.Value = value;
    //  data.UnitsAbbreviation="m";
    data.Good = true;
    data.Questionable = false;
    return $http.post(baseUrl + 'streams/' + webId + '/value', data);

  };


  service.getRecordedValues = function(webId, startTime, endTime) {
    return $http.get(baseUrl + 'streams/' + webId + '/recorded?starttime=' + startTime + '&endtime=' + endTime).then(function(response) {
      return response;
    });
  };


  service.getInterpolatedValues = function(webId, startTime, endTime, interval) {
    return $http.get(baseUrl + 'streams/' + webId + '/interpolated?starttime=' + startTime + '&endtime=' + endTime + "&interval=" + interval).then(function(response) {
      return response;
    });
  };

  // executes a query against the API - can be anything you specify
  service.query=function(url) {
      return $http.get(url).then(function (response) {
       //   console.log(response);
          return response;
      });
  }


  return service;
}]);


}());