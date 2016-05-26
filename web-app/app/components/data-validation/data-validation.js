// demoController
// dependencies:
// moment.js
//lodash.js
(function () {
    "use strict";

    angular.module("app").controller("dataValidationCtrl", dataValidationCtrl);
    dataValidationCtrl.$inject = ["$scope", "NgTableParams", "piWebApiHttpService", "uibDateParser", "$localStorage", "$q"];

    function dataValidationCtrl($scope, NgTableParams, piWebApiHttpService, uibDateParser, $localStorage, $q) {

        // this controller is making use of "this" instead of $scope.  this is another style with angularJS, it works almost same as $scope as long as 
        // the controller in the html is declared like : ng-controller="myCtrl as ctrl"  and then using ctrl.save()... woulde be same as calling save() that would
        // be defined on the $scope variable.
        var self = this;

        // initialize variables
        self.selectedTime = moment(0, "HH").format('YYYY-MM-DD'); // today 00:00

        var originalData = [];
        self.data = [];

        self.selectedAttributes = [];   // selected attributes, driven by the checkboxes
        self.attributes = [];           // contains attributes objects
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
            return str.indexOf(suffix, str.length - suffix.length) !== -1;
        }

        // retrieves the data for all the attributes
        function getAttributesData() {

            self.attributesData.length = 0;
            var promises = [];


            if (self.selectedAttributes.length < 0) {
                console.log("no attribute selected.  Cannot update data table");
                $scope.$parent.globals.alerts.push({
                    type: 'warning',
                    message: "There was no attribute selected, thus no data will be queried."
                });
                return;
            }

            // get all selected attributes: 
            var selectedAttr = Enumerable.From(self.attributes).Where("$.selected===true").ToArray();;

            self.attributesCount = selectedAttr.length;

            angular.forEach(selectedAttr, function (attribute) {

                var deferred = $q.defer();

                if (endsWith(attribute.Name, "_Flag")) {
                    getInterpolated(attribute)
                       .then(function (data) {
                           deferred.resolve(data);
                       }).catch(function (error) {
                           deferred.reject();
                       });
                }
                else {
                    getHourlyAverage(attribute)
                        .then(function (data) {
                            deferred.resolve(data);
                        }).catch(function (error) {
                            deferred.reject();
                        });
                }


                promises.push(deferred);
            });

            return $q.all(promises);

        }

        function getInterpolated(attribute) {

            var et = moment(self.selectedTime).add(moment.duration("24:00:00"));
            console.log("%s gathering interpolated data from %s to %s", attribute.Name, moment(self.selectedTime).toISOString(), et.toISOString());

            var interpolatedData = attribute.Links.InterpolatedData + '?startTime=' + moment(self.selectedTime).toISOString() + '&endTime=' + et.toISOString() + '&interval=60m';

            console.log(encodeURI(interpolatedData));
            return piWebApiHttpService.query(encodeURI(interpolatedData)).then(function (response) {
                response.Name = attribute.Name;
                self.attributesData.push(response);
                self.attApiCount++;
                if (self.attributesCount === self.attApiCount) {
                    updateDataTableAndUI();
                    self.attApiCount = 0;
                }

            });
        }


        function getHourlyAverage(attribute) {

            var et = moment(self.selectedTime).add(moment.duration("24:00:00"));
            console.log("%s gathering data from %s to %s", attribute.Name, moment(self.selectedTime).toISOString(), et.toISOString());

            var HourlyAverages = attribute.Links.SummaryData + '?startTime=' + moment(self.selectedTime).toISOString() + '&endTime=' + et.toISOString() + '&calculationBasis=TimeWeighted&summaryType=Average&summaryDuration=60m';

            console.log(encodeURI(HourlyAverages));
            return piWebApiHttpService.query(encodeURI(HourlyAverages)).then(function (response) {
                response.Name = attribute.Name;
                self.attributesData.push(response);
                self.attApiCount++;
                if (self.attributesCount === self.attApiCount) {
                    updateDataTableAndUI();
                    self.attApiCount = 0;
                }

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


            // create dataset for the data
            var row = {}

            // goes over each value of the first attribute data set ( we want to loop 24 hours, one hour = 1 row)
            var i;
            var k;
            var value;
            for (k = 0; k < self.attributesData[0].data.Items.length; k++) {

                var row = {}; // reset the serie data

                // goes over each dataset, and pick the corresponding value for the row
                for (i = 0; i < self.attributesData.length; i++) {

                    var rawVal = self.attributesData[i].data.Items[k];

                    // timestamp - only once
                    if (i === 0) {
                        var date = moment.tz(rawVal.Value.Timestamp, "Europe/Paris");
                        row.time = date.format('HH:mm');
                    }
                    
                    // other values
                    value = "";
                    if (rawVal.Value.IsSystem === true)
                        value = rawVal.Value.Name;
                    else
                        value = (isNaN(rawVal.Value.Value)) ? rawVal.Value.Value : formatter.format(rawVal.Value.Value);

                    // stores the value
                    row[self.attributesData[i].Name] = value;
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

            // goes over each data set we have - it corresponds to each attribute
            for (k = 0; k < self.attributesData.length; k++) {

                self.chartSeries.push(self.attributesData[k].Name);
                var serieData = []; // reset the serie data

                // goes over each value of each data set
                for (i = 0; i < self.attributesData[k].data.Items.length; i++) {

                    // X axis, only once
                    if (k === 0) {
                        // chart
                        var date = moment.tz(self.attributesData[k].data.Items[i].Value.Timestamp, "Europe/Paris");
                        var time = date.format('HH:mm');
                        self.chartLabels.push(time);
                    }

                    value = self.attributesData[k].data.Items[i];
                    if (value.Value.IsSystem === true || value.Value.Value.Errors !== undefined)
                        value = 0;
                    else
                        value = value.Value.Value;

                    serieData.push(value);
                }

                self.chartData.push(serieData);
            }

            console.log(self.chartSeries);

            originalData.length = 0;
            originalData = angular.copy(self.data);
            self.tableParams.total(self.data.length);
            self.tableParams.reload();


        }

        function init() {
            $scope.$parent.globals.loading++;
            console.log($scope.$parent.loading);

            // it is not required to set the piWebAPIHttpService settings if there were set in the configuration already and iitialized.
            // however, if one enters the application with the direct url to this page, we need to initialize if.
            // in such situation the configuration stored in the localStorage is used
            //
            var conf = $scope.$parent.globals.configuration;
            piWebApiHttpService.SetAPIAuthentication(conf.authType, conf.user, conf.password);
            piWebApiHttpService.SetPIWebAPIServiceUrl(conf.url);

            loadAttributes();
        }


        //function toggleSelectedAttribute=function() {
        //    // toggle selection for a given fruit by name
        //    $scope.toggleSelection = function toggleSelection(fruitName) {
        //        var idx = $scope.selection.indexOf(fruitName);

        //        // is currently selected
        //        if (idx > -1) {
        //            $scope.selection.splice(idx, 1);
        //        }

        //            // is newly selected
        //        else {
        //            $scope.selection.push(fruitName);
        //        }
        //}

        function loadAttributes() {

            console.log("Loading attributes");

            self.attributes.length = 0;

            piWebApiHttpService
              .GetElementsByPath(encodeURI($localStorage.dataValidation.elementPath)) // get element
              .then(getAttributes) // get attributes
              .then(function (response) {
                  self.attributes = response.data.Items;
                  self.attributesCount = self.attributes.length;
                  self.selectedAttributes.push(self.attributes[0]);
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

            getAttributesData()
                .catch(onError)
                .finally(function () { // cleanup - this always executes
                    $scope.$parent.globals.loading--;
                    console.log($scope.$parent.globals.loading);

                });


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
        }

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


