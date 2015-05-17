var dtReminderApp = angular.module('dtReminderApp', ['ionic']);

dtReminderApp.config(function($stateProvider, $urlRouterProvider) {
	$stateProvider
		.state('home', {
			url: '/home',
			templateUrl: 'home.html',
			controller: 'HomeController',
		})
		.state('item-create', {
			url: '/items/create',
			templateUrl: 'item/create.html',
			controller: 'ItemCreateController',
		})
		.state('item-edit', {
			url: '/items/:itemId',
			templateUrl: 'item/edit.html',
			controller: 'ItemEditController',
		});

		$urlRouterProvider.otherwise('/home');
});

dtReminderApp.controller('ItemCreateController', function($scope, $stateParams, $ionicHistory, ItemService) {
	$scope.item = {};

	$scope.save = function() {
		ItemService.push($scope.item);
		$ionicHistory.goBack();
	};
});

dtReminderApp.controller('ItemEditController', function($scope, $stateParams, $ionicHistory, ItemService) {
	var id = $stateParams.itemId;
	console.log('Editing ' + id);

	$scope.item = ItemService.get(id);

	console.log($scope.item);

	$scope.save = function() {
		ItemService.set(id, $scope.item);
		$ionicHistory.goBack();
	};
});

dtReminderApp.controller('HomeController', function($scope, ItemService) {
	$scope.items = ItemService.all();

	ItemService.$on('itemsUpdated', function() {
		console.log('item list updated!');
		$scope.items = ItemService.all();
	});
});

dtReminderApp.service('ItemService', function($rootScope) {
	var $scope = $rootScope.$new();
	var items = [];

	if (localStorage['items']) {
		items = JSON.parse(localStorage['items']);
	}

	this.all = function() {
		return items;
	};

	this.get = function(id) {
		return angular.copy(items[id]);
	};

	this.set = function(id, data) {
		items[id] = data;
		persist();
	};

	this.push = function(data) {
		items.push(data);
		persist();
	};

	this.pop = function() {
		return items.pop();
		persist();
	};

	var persist = function() {
		console.log('Persisting ...');
		console.log(items);
		// TODO: Make it save less frequently using setTimeout or lodash debounce
		localStorage['items'] = angular.toJson(items);
		$scope.$broadcast('itemsUpdated');
	}

	this.$on = function(id, callback) {
		$scope.$on(id, callback);
	};
});