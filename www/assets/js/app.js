var dtReminderApp = angular.module('dtReminderApp', ['ionic']);

dtReminderApp.config(function($stateProvider, $urlRouterProvider) {
	$stateProvider
		.state('home', {
			url: '/home',
			templateUrl: 'item/index.html',
			controller: 'ItemIndexController',
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

dtReminderApp.controller('ItemIndexController', function($scope, ItemService) {
	$scope.shouldShowDelete = false;
	$scope.shouldShowReorder = false;
	$scope.items = ItemService.all();

	$scope.removeItem = function(index) {
		ItemService.delete(index);
		$scope.items = ItemService.all();
	};

	$scope.reorderItem = function(fromIndex, toIndex) {
		ItemService.move(fromIndex, toIndex);
		$scope.items = ItemService.all();
	};

	ItemService.$on('itemsUpdated', function() {
		console.log('item list updated!');
		$scope.items = ItemService.all();
	});
});

dtReminderApp.controller('ItemFormController', function($scope) {
	$scope.item = {
		name: null,
		metrics: [],
	};

	$scope.addMetric = function() {
		var metric = {
			name: null,
			when: 'now',
		};

		$scope.item.metrics.push(metric);
	};
});

dtReminderApp.controller('ItemCreateController', function($controller, $scope, $stateParams, $ionicHistory, ItemService) {
	$controller('ItemFormController', {
		$scope: $scope,
	});

	$scope.addMetric();

	$scope.save = function() {
		ItemService.push($scope.item);
		$ionicHistory.goBack();
	};
});

dtReminderApp.controller('ItemEditController', function($controller, $scope, $stateParams, $ionicHistory, ItemService) {
	$controller('ItemFormController', {
		$scope: $scope,
	});

	var id = $stateParams.itemId;
	console.log('Editing ' + id);

	$scope.item = ItemService.get(id);

	console.log($scope.item);

	$scope.save = function() {
		ItemService.set(id, $scope.item);
		$ionicHistory.goBack();
	};
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

	this.get = function(index) {
		return angular.copy(items[index]);
	};

	this.set = function(index, data) {
		items[index] = data;
		persist();
	};

	this.insert = function(index, data) {
		items.splice(index, 0, data);
		persist();
	}

	this.delete = function(index) {
		var item = items.splice(index, 1);
		persist();
		return item;
	};

	this.push = function(data) {
		items.push(data);
		persist();
	};

	this.pop = function() {
		return items.pop();
		persist();
	};

	this.move = function(fromIndex, toIndex) {
		var item = items[fromIndex];
		items.splice(toIndex, 0, item);
		items.splice(fromIndex, 1);
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