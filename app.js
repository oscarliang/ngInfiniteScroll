var app = angular.module('oscarUI', ['ui.router', 'ui.bootstrap', 'ngResource', 'angularSpinner','infinite-scroll']);
app.run(['$state', '$rootScope', '$timeout', function ($state, $rootScope, $timeout) {
    this.init = function () {
    };
    this.init();
}]);

/**
 * Router
 */
app.config(function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise("dashboard/overview");
    // Now set up the states
    $stateProvider.state('main', {
        url: "",
        templateUrl: "main-view.html",
        abstract: true,
        activetab: 'main'
    });
    $stateProvider.state('main.dashboard', {
        url: "/dashboard",
        templateUrl: "dashboard.html",
        abstract: true,
        activetab: 'dashboard'
    });
    $stateProvider.state('main.dashboard.overview', {
        url: "/overview",
        templateUrl: "dashboard-overview.html",
        controller: 'OverviewController',
        activetab: 'dashboard'
    });
});

/**
 * Overview Page
 */
angular.module('oscarUI').controller('OverviewController', function ($rootScope, $scope, OverviewModel, usSpinnerService, $timeout) {
    Overview = new OverviewModel();

    OverviewController = function () {
        $scope.model = Overview;
        $scope.imageList = [];
        $scope.currentPage = 1;
        $scope.busy = false;
    };

    //Watch the search bar status
    $scope.$watch('filtertext', function (newVal, oldVal) {
        if (newVal) {
            if (newVal.length > 3) {
                $timeout(function () {
                    $scope.filterRequest(newVal);
                }, 500);
            } else {
                if (oldVal && newVal.length < oldVal.length && newVal.length === 3) {
                    usSpinnerService.stop('spinner');
                    $scope.imageList = [];
                }
            }
        }
    }, true);


    //This filter is to make sure call the API only after finishing input the search term 
    $scope.filterRequest = function (newValue) {
        if ($scope.filtertext === newValue) {
            usSpinnerService.spin('spinner');
            $scope.imageList = [];
            $scope.onLoadPage();
        }
    };

    $scope.onLoadPage = function () {
        if ($scope.busy) return;
        $scope.busy = true;
        Overview.getImageList($scope.filtertext, $scope.currentPage).then(function (results) {
            if (angular.isDefined(results) && results !== null) {
                if (angular.isDefined(results.photos) && results.photos.total > 0) {
                    // $scope.imageList.splice.apply($scope.imageList, [$scope.currentPage*$scope.pageSize, 0].concat(results.photos.photo));
                    $scope.imageList = $scope.imageList.concat(results.photos.photo);
                    $scope.totalPage = results.photos.total;
                    $scope.currentPage = $scope.currentPage + 1;
                    $scope.busy = false;
                    angular.forEach($scope.imageList, function (image) {
                        image.author = "Awaiting";
                        image.tags = "Awaiting";
                        //Call API to get image author and tags
                        Overview.getAuthorAndTagsByPhotoId(image.id).then(function (results) {
                            if (angular.isDefined(results.photo.tags.tag) && results.photo.tags.tag.length > 0) {
                                image.author = results.photo.tags.tag[0].authorname;
                                var tagLable = "";
                                angular.forEach(results.photo.tags.tag, function (tag) {
                                    tagLable = tagLable + " " + tag.raw;
                                });
                                image.tags = tagLable;
                            } else {
                                image.author = "Unknow";
                                image.tags = "No Tags";
                            }
                        });
                    });

                }
            } else {
                //log the remote connection issue
                console.log("Remote connection is failed");
            }
            //stop the loading animation
            usSpinnerService.stop('spinner');
        });
    };

    //Pagination trigger
    $scope.changePage = function () {
        if (angular.isDefined($scope.filtertext) && $scope.filtertext.length > 3) {;
            usSpinnerService.spin('spinner');
            $scope.onLoadPage();
        }
    }
    OverviewController();
});

//Overview Factory
app.factory('OverviewModel', function (imageApi) {
    // Define the constructor function.

    function OverviewModel() {
        _self = this;
    }
    // Define the "instance" methods using the prototype
    // and standard prototypal inheritance.
    OverviewModel.prototype = {
        getImageList: function (text, currentPage) {
            return imageApi.getImageList(text, currentPage);
        },
        getAuthorAndTagsByPhotoId: function (imageId) {
            return imageApi.getAuthorAndTagsByPhotoId(imageId);
        }
    };
    return OverviewModel;
});

/**
 * Global Utils libary
 */
var isNotNullObject = function (obj) {
    if (!angular.isUndefined(obj) && obj !== null) {
        return true;
    } else {
        return false;
    }
};

/**
 * Filters
 */
app.filter('startFrom', function () {
    return function (input, start) {
        if (!angular.isDefined(input))
            return;
        start = (start < 0) ? 0 : start;
        return input.slice(start);
    };
});

/**
 * API to get the data
 */
app.service('imageApi', function ($window, $resource, $q) {
    //APi - get image list
    this.getImageList = function (text, currentPage) {
        var requestUrl = "https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=e1d06107e96b8f1b0de3ce05fc873f16&text=" + text + "&per_page=10&page=" + currentPage + "&format=json&nojsoncallback=1";
        var defObj = $q.defer();
        $resource(requestUrl, null, {
            'get': {
                method: 'GET',
                isArray: false
            }
        }).get().$promise.then(function (data) {
            defObj.resolve(data);
        }, function (error) {
            defObj.resolve(null);
        });
        return defObj.promise;
    };

    //API - get author and tags of the image
    this.getAuthorAndTagsByPhotoId = function (imageId) {
        var requestUrl = "https://api.flickr.com/services/rest/?method=flickr.tags.getListPhoto&api_key=e1d06107e96b8f1b0de3ce05fc873f16&photo_id=" + imageId + "&format=json&nojsoncallback=1";
        return $resource(requestUrl, null, {
            'get': {
                method: 'GET',
                isArray: false
            }
        }).get().$promise;
    }
});