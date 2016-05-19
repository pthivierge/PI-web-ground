

// demoController
(function () {
    "use strict";
    
    angular.module("app").controller("demoController", demoController);
    demoController.$inject = ["$scope","NgTableParams", "piWebApiHttpService"];

    function demoController($scope,NgTableParams, piWebApiHttpService) {
        var self = this;
        var originalData = {};

        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        self.startTime = yesterday;
        self.endTime = new Date();

        // call to get to the element
        // "\\\\OPTIMUS\\Iberdrola\\Iberdrola Generación\\Ciclos Combinados\\Aceca\\Grupo 2\\Chimenea 2
        // https://optimus.osisoft.int/piwebapi/elements?path=\\OPTIMUS\Iberdrola\Iberdrola%20Generaci%C3%B3n\Ciclos%20Combinados\Aceca\Grupo%202\Chimenea%202
        // from this call, we can get all attributes of type contaminantes
        // and this is what we will use
        // https://optimus.osisoft.int/piwebapi/elements/E0dXWO5Pqh-0Wko7EhH85bdghBtYx8Ud5hGCzvAfrwJo-AT1BUSU1VU1xJQkVSRFJPTEFcSUJFUkRST0xBIEdFTkVSQUNJw5NOXENJQ0xPUyBDT01CSU5BRE9TXEFDRUNBXEdSVVBPIDJcQ0hJTUVORUEgMg/attributes?categoryName=contaminantes
        

       

        

/*        
        var simpleList= [{
                        name: "Pat",
                        age: 50,
                        money: 150
                    }, {
                        name: "Luc",
                        age: 45,
                        money: 99
                    }, {
                        name: "Cesar",
                        age: 15,
                        money: 10
                    }, {
                        name: "John",
                        age: 35,
                        money: 200
                    }, {
                        name: "Joe",
                        age: 66,
                        money: 300
                    } ];
            
*/


        self.cancel = cancel;
        self.del = del;
        self.save = save;
        self.reloadData = reloadData;

        //////////

        function reloadData() {
            //get the data
            piWebApiHttpService.SetAPIAuthentication('Kerberos', '', '');
            piWebApiHttpService.SetPIWebAPIServiceUrl('https://optimus.osisoft.int/piwebapi/');

            // gets all the attributes
            piWebApiHttpService
                .query('https://optimus.osisoft.int/piwebapi/elements/E0dXWO5Pqh-0Wko7EhH85bdghBtYx8Ud5hGCzvAfrwJo-AT1BUSU1VU1xJQkVSRFJPTEFcSUJFUkRST0xBIEdFTkVSQUNJw5NOXENJQ0xPUyBDT01CSU5BRE9TXEFDRUNBXEdSVVBPIDJcQ0hJTUVORUEgMg/attributes?categoryName=contaminantes')
                .then(function (response) {
                    self.attributes = response.data;

                    // from the attributes, we can get our value/flag
                    var attribute = response.data.Items[0];

                    var HourlyAverages = attribute.Links.SummaryData + '?startTime=' + self.startTime.toISOString() + '&endTime=' + self.endTime.toISOString() + '&calculationBasis=TimeWeighted&summaryType=Average&summaryDuration=60m';
                    piWebApiHttpService.query(encodeURI(HourlyAverages)).then(function (response) {
                        self.attribute1 = response.data;

                        originalData = [];
                        angular.forEach(response.data.Items, function (object, key) {


                            originalData.push({
                                time: object.Value.Timestamp.substr(11, 5),
                                //  time: object.Value.Timestamp,
                                value: object.Value.Value,
                                flag: 'T'
                            });
                        });

                        self.tableParams = new NgTableParams({ count: 24 }, {
                            filterDelay: 0,
                            data: angular.copy(originalData)
                        });

                    });


                });
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

        reloadData();
    }
})();


/*
  DIRECTIVES
  The following directives are necessary in order to track dirty state and validity of the rows 
  in the table as the user pages within the grid
*/
// directive TrackedTable
(function () {
    angular.module("app").directive("demoTrackedTable", demoTrackedTable);

    demoTrackedTable.$inject = [];

    function demoTrackedTable() {
        return {
            restrict: "A",
            priority: -1,
            require: "ngForm",
            controller: demoTrackedTableController
        };
    }

    demoTrackedTableController.$inject = ["$scope", "$parse", "$attrs", "$element"];

    function demoTrackedTableController($scope, $parse, $attrs, $element) {
        var self = this;
        var tableForm = $element.controller("form");
        var dirtyCellsByRow = [];
        var invalidCellsByRow = [];

        init();

        ////////

        function init() {
            var setter = $parse($attrs.demoTrackedTable).assign;
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
            return _.find(cellsByRow, function(entry) {
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
    angular.module("app").directive("demoTrackedTableRow", demoTrackedTableRow);

    demoTrackedTableRow.$inject = [];

    function demoTrackedTableRow() {
        return {
            restrict: "A",
            priority: -1,
            require: ["^demoTrackedTable", "ngForm"],
            controller: demoTrackedTableRowController
        };
    }

    demoTrackedTableRowController.$inject = ["$attrs", "$element", "$parse", "$scope"];

    function demoTrackedTableRowController($attrs, $element, $parse, $scope) {
        var self = this;
        var row = $parse($attrs.demoTrackedTableRow)($scope);
        var rowFormCtrl = $element.controller("form");
        var trackedTableCtrl = $element.controller("demoTrackedTable");

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
    angular.module("app").directive("demoTrackedTableCell", demoTrackedTableCell);

    demoTrackedTableCell.$inject = [];

    function demoTrackedTableCell() {
        return {
            restrict: "A",
            priority: -1,
            scope: true,
            require: ["^demoTrackedTableRow", "ngForm"],
            controller: demoTrackedTableCellController
        };
    }

    demoTrackedTableCellController.$inject = ["$attrs", "$element", "$scope"];

    function demoTrackedTableCellController($attrs, $element, $scope) {
        var self = this;
        var cellFormCtrl = $element.controller("form");
        var cellName = cellFormCtrl.$name;
        var trackedTableRowCtrl = $element.controller("demoTrackedTableRow");

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

