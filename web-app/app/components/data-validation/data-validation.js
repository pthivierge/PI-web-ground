﻿// demoController
// dependencies:
// moment.js
//lodash.js
(function () {
    "use strict";

    angular.module("app").controller("dataValidationCtrl", dataValidationCtrl);
    dataValidationCtrl.$inject = ["$scope", "NgTableParams", "piWebApiHttpService", "uibDateParser", "$localStorage", "$q", "$uibModal"];

    function dataValidationCtrl($scope, NgTableParams, piWebApiHttpService, uibDateParser, $localStorage, $q, $uibModal) {

        // this controller is making use of "this" instead of $scope.  this is another style with angularJS, it works almost same as $scope as long as 
        // the controller in the html is declared like : ng-controller="myCtrl as ctrl"  and then using ctrl.save()... woulde be same as calling save() that would
        // be defined on the $scope variable.
        var self = this;

        // in case it is the first time the page loads we set the parameters here
        $scope.$storage = $localStorage.$default({
            attributes: []
        });

        // initialize variables
        self.selectedTime = moment(0, "HH").format('YYYY-MM-DD'); // today 00:00

        var originalData = [];
        self.data = [];


        self.selectedAttributes = [];                   // selected attributes, driven by the checkboxes
        self.attributes = $scope.$storage.attributes;  // contains attributes objects, attributes are stored in local storage to avoid making the attribute call every time.




        self.attributesData = [];       // contains hourly averages coming from each attribute.

        self.attApiCount = 0;           // obsolete? tbd , keeps the number of attributes loaded 
        self.dataEntryFlags = ["V", "O", "T", "R", "D", "C", "F", "N", "A", "P", "M", "Z"]; // this could be replaced with a call to get DS

        // chart
        self.chartData = [];
        self.chartLabels = [];
        self.chartLegend = [];
        self.chartLegend = [];
        self.chartOptions = [];
        self.chartSeries = [];

        self.editedValues = [];
        // editedValues={webid, timestamp,value}

        /**
            chart-data: series data
            chart-labels: x axis labels
            chart-legend (default: false): show legend below the chart
            chart-options (default: {}): Chart.js options
            chart-series (default: []): series labels
            chart-click (optional): onclick event handler
            chart-hover (optional): onmousemove event handler
            chart-colours (default to global colours): colours for the chart
         */







        // table settings
        self.tableParams = new NgTableParams({ count: 24 }, {
            filterDelay: 0,
            data: self.data
        });

        // defining functions (attaching local functions to "this")
        self.cancel = cancel;
        self.del = del;
        self.save = save;
        self.reloadData = getData;
        self.reloadAttributes = loadAttributes;
        self.$localStorage = $localStorage;
        self.saveChanges = saveChanges;

        if ($localStorage.dataValidation === undefined) {
            $localStorage.dataValidation = {};
            $localStorage.dataValidation.elementPath = "\\afserver\database\element1";
        }


        function getAttributes(response) {

            var categoryFilter = $localStorage.dataValidation.attributeCategory;

            var filter = "";
            if (categoryFilter !== undefined && categoryFilter !== '')
                filter = "?searchFullHierarchy=true&categoryName=" + categoryFilter;

            console.log("Getting attributes:", response.data.Links.Attributes + filter);

            return piWebApiHttpService.query(response.data.Links.Attributes + filter);
        }


        function endsWith(str, suffix) {
            return str.toLowerCase().indexOf(suffix.toLowerCase(), str.length - suffix.length) !== -1;
        }

        // retrieves the data for all the attributes
        function getAttributesData() {


            self.attributesData.length = 0;
            var promises = [];

            self.selectedAttributes = Enumerable.From(self.attributes).Where("$.selected===true").ToArray();;


            if (self.selectedAttributes.length < 1) {
                console.log("no attribute selected.  Cannot update data table");
                $scope.$parent.globals.alerts.push({
                    type: 'warning',
                    message: "There was no attribute selected, thus no data will be queried."
                });

                // returns an empty promise for the rest of the code to continue correctly
                var deferred = $q.defer();
                promises.push(deferred);
                return $q.all(promises);
            }

            // get all selected attributes: 


            self.attributesCount = self.selectedAttributes.length;

            angular.forEach(self.selectedAttributes, function (attribute, index) {

                var deferred = $q.defer();

                if (endsWith(attribute.Name, "Flag")) {
                    getInterpolated(attribute, index)
                       .then(function (data) {
                           deferred.resolve(data);
                       }).catch(function (err) {


                           var errMessage = err.status + ' ' + err.statusText + ': ' + err.data.Errors.toString();
                           $scope.$parent.globals.alerts.push({ type: 'danger', message: errMessage });


                           deferred.reject();
                       });
                }
                else {
                    getHourlyAverage(attribute, index)
                        .then(function (data) {
                            deferred.resolve(data);
                        }).catch(function (err) {

                            var errMessage = err.status + ' ' + err.statusText + ': ' + err.data.Errors.toString();
                            $scope.$parent.globals.alerts.push({ type: 'danger', message: errMessage });

                            deferred.reject();
                        });
                }


                promises.push(deferred);
            });

            return $q.all(promises);

        }



        function cleanAttributeName(attributeName) {
            // removes all characters except underscores (\w) ) 
            return attributeName.replace(/[^\w]/gi, '');
        }


        function getInterpolated(attribute, index) {

            var et = moment(self.selectedTime.toString()).add(moment.duration("24:00:00"));
            console.log("%s gathering interpolated data from %s to %s", attribute.Name, moment(self.selectedTime.toString()).toISOString(), et.toISOString());

            var interpolatedData = attribute.Links.InterpolatedData + '?startTime=' + moment(self.selectedTime.toString()).toISOString() + '&endTime=' + et.toISOString() + '&interval=60m';

            console.log(encodeURI(interpolatedData));
            return piWebApiHttpService.query(encodeURI(interpolatedData)).then(function (response) {
                response.Index = index;
                response.Attribute = attribute;
                self.attributesData.push(response);


            }).finally(function () {
                self.attApiCount++;

                if (self.attributesCount === self.attApiCount) {
                    updateDataTableAndUI();
                }

            }).catch(function (error) {
                var response = {};
                response.Attribute = attribute;
                response.Index = index;
                self.attributesData.push(response);
            });
        }


        function getHourlyAverage(attribute, index) {

            var et = moment(self.selectedTime.toString()).add(moment.duration("24:00:00"));
            console.log("%s gathering hourly average data from %s to %s", attribute.Name, moment(self.selectedTime.toString()).toISOString(), et.toISOString());


            console.log(self.selectedTime.toString());
            var HourlyAverages = attribute.Links.SummaryData + '?startTime=' + moment(self.selectedTime.toString()).toISOString() + '&endTime=' + et.toISOString() + '&calculationBasis=TimeWeighted&summaryType=Average&summaryDuration=60m';

            console.log(encodeURI(HourlyAverages));
            return piWebApiHttpService.query(encodeURI(HourlyAverages)).then(function (response) {
                response.Attribute = attribute;
                response.Index = index;
                self.attributesData.push(response);

            }).finally(function () {
                self.attApiCount++;

                if (self.attributesCount === self.attApiCount) {
                    updateDataTableAndUI();
                }

            }).catch(function (error) {
                var response = {};
                response.Attribute = attribute;
                self.attributesData.push(response);
            });
        }

        // Updates the data table
        function updateDataTableAndUI() {

            console.log("updating table");
            self.data.length = 0; // empties the data array


            var formatter = new Intl.NumberFormat("en-US", { style: "decimal", maximumFractionDigits: 2 });

            if (self.selectedAttributes.length < 0) {
                console.log("no attribute selected.  Cannot update data table");
                return;
            }


            self.attributesData.sort(function (a, b) {
                return a.Attribute.Name.toLowerCase().localeCompare(b.Attribute.Name.toLowerCase());
            });


            // create dataset for the data
            var row = {}

            // goes over each value of the first attribute data set ( we want to loop 24 hours, one hour = 1 row)
            var i;
            var k;
            var value;
            // for (k = 0; k < self.attributesData[0].data.Items.length; k++) {
            // we got 24hours to display
            for (k = 0; k < 24; k++) {

                var row = {}; // reset the serie data
                row.values = {};

                // goes over each dataset, and pick the corresponding value for the row
                for (i = 0; i < self.attributesData.length; i++) {

                    var rawVal = self.attributesData[i].data.Items[k];

                    // hack
                    // fixes the object - interpolated call has not same format as summary call
                    if (rawVal.Timestamp !== undefined && rawVal.Value.Timestamp === undefined)
                        rawVal.Value.Timestamp = rawVal.Timestamp;

                    // timestamp - only once
                    if (row.time === undefined && rawVal.Value.Timestamp !== undefined) {

                        var date = moment.tz(rawVal.Value.Timestamp, "Europe/Paris");
                        //var date = moment(rawVal.Value.Timestamp.toString());
                        row.time = date.local().format('HH:mm');
                    }



                    // other values
                    value = "";
                    if (rawVal.Value.IsSystem === true || self.attributesData[i].Attribute.Type === 'EnumerationValue')
                        value = rawVal.Value.Name;
                    else
                        value = (isNaN(rawVal.Value.Value)) ? rawVal.Value.Value : formatter.format(rawVal.Value.Value);

                    // stores the value
                    var selectedAttIndex = self.attributesData[i].Index;
                    row.values['id' + selectedAttIndex] = {};
                    row.values['id' + selectedAttIndex].name = self.attributesData[i].Attribute.Name;
                    row.values['id' + selectedAttIndex].webId = self.selectedAttributes[selectedAttIndex].WebId;
                    row.values['id' + selectedAttIndex].value = value;
                    row.values['id' + selectedAttIndex].type = endsWith(self.attributesData[i].Attribute.Name, "flag") ? 'flag' : 'values';

                }

                self.data.push(row);

            }


            console.log(self.data);


            // CHART
            // building data for the chart
            self.chartData = [];

            // chart
            self.chartLabels = [];
            self.chartSeries = [];

            // retain only the attributes who are not flags


            // goes over each data set we have - it corresponds to each attribute
            for (k = 0; k < self.attributesData.length; k++) {

                if (self.attributesData[k].Attribute.Type !== 'EnumerationValue') {
                    self.chartSeries.push(self.attributesData[k].Attribute.Name);
                    var serieData = []; // reset the serie data

                    // goes over each value of each data set
                    for (i = 0; i < self.attributesData[k].data.Items.length; i++) {

                        // X axis, only once
                        if (k === 0) {
                            // chart
                            var date = moment.tz(self.attributesData[k].data.Items[i].Value.Timestamp.toString(), "Europe/Paris");
                            var time = date.format('HH:mm');
                            self.chartLabels.push(time);
                        }

                        value = self.attributesData[k].data.Items[i];
                        if (value.Value.IsSystem === true)
                            value = 0;
                        else
                            value = isNaN(value.Value.Value) ? 0 : value.Value.Value;

                        serieData.push(value);
                    }

                    self.chartData.push(serieData);
                }

            }

            console.log(self.chartSeries);

            originalData.length = 0;
            originalData = angular.copy(self.data);
            self.tableParams.total(self.data.length);
            self.tableParams.reload();
            self.attApiCount = 0;


        }

        function init() {


            // it is not required to set the piWebAPIHttpService settings if there were set in the configuration already and iitialized.
            // however, if one enters the application with the direct url to this page, we need to initialize if.
            // in such situation the configuration stored in the localStorage is used
            //

            var conf = $scope.$parent.globals.configuration;
            piWebApiHttpService.SetAPIAuthentication(conf.authType, conf.user, conf.password);
            piWebApiHttpService.SetPIWebAPIServiceUrl(conf.url);

            if (self.attributes.length === 0) {

                loadAttributes();
            }
            else {
                getData();
            }

            self.inititialized = true;

        }



        function loadAttributes() {
            $scope.$parent.globals.loading++;
            console.log("Loading attributes");

            self.attributes.length = 0;

            piWebApiHttpService
              .GetElementsByPath(encodeURI($localStorage.dataValidation.elementPath)) // get element
              .then(getAttributes) // get attributes
              .then(function (response) {
                  self.attributes = response.data.Items;
                  $scope.$storage.attributes = self.attributes;
                  self.attributesCount = self.attributes.length;
              })
              .catch(onError)
              .finally(function () { // cleanup - this always executes
                  $scope.$parent.globals.loading--;
                  console.log($scope.$parent.globals.loading);

              });
        }


        function getData() {

            $scope.$parent.globals.loading++;
            console.log($scope.$parent.loading);

            self.selectedTime = moment(self.selectedTime.toString()).format("YYYY-MM-DD");
            

            getAttributesData()
                .catch(onError)
                .finally(function () { // cleanup - this always executes
                    $scope.$parent.globals.loading--;
                    console.log($scope.$parent.globals.loading);

                });


        }

        function saveChanges() {

            for (var i = 0; i < self.editedValues.length; i++) {

                var webId = self.editedValues[i].webId;
                var timeStamp = self.editedValues[i].timeStamp;
                var value = self.editedValues[i].value;


                console.log("Writing changes for %s : %s, %s", webId, timeStamp, value);
                piWebApiHttpService.writeValue(webId, timeStamp, value)
                    .catch(function (err) {
                        var errMessage = err.status + ' ' + err.statusText + ': ' + err.data.Errors.toString();
                        $scope.$parent.globals.alerts.push({ type: 'danger', message: errMessage });
                    });


            }

            self.editedValues.length = 0;

            getData();

        }

        function onError(err) {
            try {
                var errMessage = err.status + ' ' + err.statusText + ': ' + err.data.Message;
                errMessage += "\n  Make sure the configuration is correct and initialized or that the service is running.  It may also be useful to look in the browser developer tools console and check for complete error messages. F12 or Ctrl+Shift+i";
                $scope.$parent.globals.alerts.push({ type: 'danger', message: errMessage });
            }
            catch (err) {
                $scope.$parent.globals.alerts.push({
                    type: 'danger',
                    message: "There was an error with the PI WEB Call.  Make sure the configuration is correct and initialized or that the service is running.  It may also be useful to look in the browser developer tools console and check for complete error messages. F12 or Ctrl+Shift+i"
                });
            }
        }

        function cancel(row, rowForm) {
            var originalRow = resetRow(row, rowForm);
            angular.extend(row, originalRow);
        }

        function del(row) {
            _.remove(self.tableParams.settings().data, function (item) {
                return row === item;
            });
            self.tableParams.reload().then(function (data) {
                if (data.length === 0 && self.tableParams.total() > 0) {
                    self.tableParams.page(self.tableParams.page() - 1);
                    self.tableParams.reload();
                }
            });
        }

        function resetRow(row, rowForm) {
            row.isEditing = false;
            rowForm.$setPristine();
            self.tableTracker.untrack(row);
            return _.findWhere(originalData, function (r) {
                return r.id === row.id;
            });
        }

        function save(row, rowForm) {
            var originalRow = resetRow(row, rowForm);
            angular.extend(originalRow, row);

            for (var key in row.values) {
                if (row.values[key].type === "flag") {
                    var editedValue = {};
                    editedValue.timeStamp = moment(self.selectedTime.toString()).add(moment.duration(row.time));
                    editedValue.value = row.values[key].value;
                    editedValue.webId = row.values[key].webId;
                    self.editedValues.push(editedValue);
                }
            }

            console.log(self.editedValues);
        }



        // displays the messages
        self.openConfiguration = function () {

            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: '/app/components/data-validation/configuration.html',
                scope: $scope.$new()
            });

            modalInstance.result.then(function () { getData(); });


        };




        init();
    }
})();


/*
  DIRECTIVES
  The following directives are necessary in order to track dirty state and validity of the rows 
  in the table as the user pages within the grid
*/
// directive TrackedTable
(function () {
    angular.module("app").directive("trackedTable", trackedTable);

    trackedTable.$inject = [];

    function trackedTable() {
        return {
            restrict: "A",
            priority: -1,
            require: "ngForm",
            controller: trackedTableController
        };
    }

    trackedTableController.$inject = ["$scope", "$parse", "$attrs", "$element"];

    function trackedTableController($scope, $parse, $attrs, $element) {
        var self = this;
        var tableForm = $element.controller("form");
        var dirtyCellsByRow = [];
        var invalidCellsByRow = [];

        init();

        ////////

        function init() {
            var setter = $parse($attrs.trackedTable).assign;
            setter($scope, self);
            $scope.$on("$destroy", function () {
                setter(null);
            });

            self.reset = reset;
            self.isCellDirty = isCellDirty;
            self.setCellDirty = setCellDirty;
            self.setCellInvalid = setCellInvalid;
            self.untrack = untrack;
        }

        function getCellsForRow(row, cellsByRow) {
            return _.find(cellsByRow, function (entry) {
                return entry.row === row;
            });
        }

        function isCellDirty(row, cell) {
            var rowCells = getCellsForRow(row, dirtyCellsByRow);
            return rowCells && rowCells.cells.indexOf(cell) !== -1;
        }

        function reset() {
            dirtyCellsByRow = [];
            invalidCellsByRow = [];
            setInvalid(false);
        }

        function setCellDirty(row, cell, isDirty) {
            setCellStatus(row, cell, isDirty, dirtyCellsByRow);
        }

        function setCellInvalid(row, cell, isInvalid) {
            setCellStatus(row, cell, isInvalid, invalidCellsByRow);
            setInvalid(invalidCellsByRow.length > 0);
        }

        function setCellStatus(row, cell, value, cellsByRow) {
            var rowCells = getCellsForRow(row, cellsByRow);
            if (!rowCells && !value) {
                return;
            }

            if (value) {
                if (!rowCells) {
                    rowCells = {
                        row: row,
                        cells: []
                    };
                    cellsByRow.push(rowCells);
                }
                if (rowCells.cells.indexOf(cell) === -1) {
                    rowCells.cells.push(cell);
                }
            } else {
                _.remove(rowCells.cells, function (item) {
                    return cell === item;
                });
                if (rowCells.cells.length === 0) {
                    _.remove(cellsByRow, function (item) {
                        return rowCells === item;
                    });
                }
            }
        }

        function setInvalid(isInvalid) {
            self.$invalid = isInvalid;
            self.$valid = !isInvalid;
        }

        function untrack(row) {
            _.remove(invalidCellsByRow, function (item) {
                return item.row === row;
            });
            _.remove(dirtyCellsByRow, function (item) {
                return item.row === row;
            });
            setInvalid(invalidCellsByRow.length > 0);
        }
    }
})();

// directive TrackedTableRow
(function () {
    angular.module("app").directive("trackedTableRow", trackedTableRow);

    trackedTableRow.$inject = [];

    function trackedTableRow() {
        return {
            restrict: "A",
            priority: -1,
            require: ["trackedTable", "ngForm"],
            controller: trackedTableRowController
        };
    }

    trackedTableRowController.$inject = ["$attrs", "$element", "$parse", "$scope"];

    function trackedTableRowController($attrs, $element, $parse, $scope) {
        var self = this;
        var row = $parse($attrs.trackedTableRow)($scope);
        var rowFormCtrl = $element.controller("form");
        var trackedTableCtrl = $element.controller("trackedTable");

        self.isCellDirty = isCellDirty;
        self.setCellDirty = setCellDirty;
        self.setCellInvalid = setCellInvalid;

        function isCellDirty(cell) {
            return trackedTableCtrl.isCellDirty(row, cell);
        }

        function setCellDirty(cell, isDirty) {
            trackedTableCtrl.setCellDirty(row, cell, isDirty)
        }

        function setCellInvalid(cell, isInvalid) {
            trackedTableCtrl.setCellInvalid(row, cell, isInvalid)
        }
    }
})();


// directive TrackedTableCell
(function () {
    angular.module("app").directive("trackedTableCell", trackedTableCell);

    trackedTableCell.$inject = [];

    function trackedTableCell() {
        return {
            restrict: "A",
            priority: -1,
            scope: true,
            require: ["trackedTableRow", "ngForm"],
            controller: trackedTableCellController
        };
    }

    trackedTableCellController.$inject = ["$attrs", "$element", "$scope"];

    function trackedTableCellController($attrs, $element, $scope) {
        var self = this;
        var cellFormCtrl = $element.controller("form");
        var cellName = cellFormCtrl.$name;
        var trackedTableRowCtrl = $element.controller("trackedTableRow");

        if (trackedTableRowCtrl.isCellDirty(cellName)) {
            cellFormCtrl.$setDirty();
        } else {
            cellFormCtrl.$setPristine();
        }
        // note: we don't have to force setting validaty as angular will run validations
        // when we page back to a row that contains invalid data

        $scope.$watch(function () {
            return cellFormCtrl.$dirty;
        }, function (newValue, oldValue) {
            if (newValue === oldValue) return;

            trackedTableRowCtrl.setCellDirty(cellName, newValue);
        });

        $scope.$watch(function () {
            return cellFormCtrl.$invalid;
        }, function (newValue, oldValue) {
            if (newValue === oldValue) return;

            trackedTableRowCtrl.setCellInvalid(cellName, newValue);
        });
    }
})();


