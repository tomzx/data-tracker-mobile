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
		})
		.state('item-data-create', {
			url: '/items/:itemId/data/create',
			templateUrl: 'item/data/create.html',
			controller: 'ItemDataCreateController',
		})
		.state('settings', {
			url: '/settings',
			templateUrl: 'settings.html',
			controller: 'SettingsController',
		});

		$urlRouterProvider.otherwise('/home');
});

dtReminderApp.controller('ItemIndexController', function($scope, ItemService, ReminderService) {
	$scope.shouldShowDelete = false;
	$scope.shouldShowReorder = false;
	$scope.items = _.values(ItemService.all());

	$scope.removeItem = function(item) {
		ReminderService.cancelReminder(item);
		ItemService.delete(item);
		$scope.items = getItemsList();
	};

	ItemService.$on('itemsUpdated', function() {
		console.log('item list updated!');
		$scope.items = getItemsList();
	});

	var getItemsList = function() {
		return _.values(ItemService.all());
	};
});

dtReminderApp.controller('ItemFormController', function($scope) {
	$scope.item = {
		id: uuidv4(),
		name: null,
		reminder: {
			id: null,
			frequency: null,
			startAt: new Date(),
		},
		metrics: [],
	};

	$scope.addMetric = function() {
		var metric = {
			name: null,
			when: 'now',
		};

		$scope.item.metrics.push(metric);
	};

	$scope.removeMetric = function(index) {
		$scope.item.metrics.splice(index, 1);
	};
});

dtReminderApp.controller('ItemCreateController', function($controller, $scope, $stateParams, $ionicHistory, ItemService, ReminderService) {
	$controller('ItemFormController', {
		$scope: $scope,
	});

	$scope.addMetric();

	$scope.save = function() {
		ReminderService.configureReminder($scope.item);
		ItemService.add($scope.item);
		$ionicHistory.goBack();
	};
});

dtReminderApp.controller('ItemEditController', function($controller, $scope, $stateParams, $ionicHistory, ItemService, ReminderService) {
	$controller('ItemFormController', {
		$scope: $scope,
	});

	var id = $stateParams.itemId;
	console.log('Editing ' + id);

	angular.extend($scope.item, ItemService.get(id) || {});

	// When we deserialize the object for display, the startAt field is stored as a string and must be converted to a Date object for angular to properly manage it.
	$scope.item.reminder.startAt = $scope.item.reminder.startAt ? new Date($scope.item.reminder.startAt) : null;

	console.log($scope.item);

	$scope.save = function() {
		ReminderService.configureReminder($scope.item);
		ItemService.set(id, $scope.item);
		$ionicHistory.goBack();
	};
});

dtReminderApp.controller('ItemDataCreateController', function($controller, $scope, $stateParams, $ionicHistory, ItemService, DataTrackerService) {
	var id = $stateParams.itemId;

	$scope.item = ItemService.get(id);
	$scope.data = [];

	angular.forEach($scope.item.metrics, function(metric) {
		var data = {
			timestamp: metric.when,
			name: metric.name,
			value: null, // TODO: Fetch/Get the last value that was used for this metric
		};

		$scope.data.push(data);
	});

	$scope.push = function() {
		for (var index in $scope.data) {
			var data = $scope.data[index];
			if (data.value === null) {
				showToast('Missing data.');
				return;
			}
		}

		DataTrackerService.push($scope.data)
		.then(function() {
			showToast('Data pushed for item "' + $scope.item.name + '"!');
		});

		$ionicHistory.goBack();
	};
});

dtReminderApp.controller('SettingsController', function($scope, $ionicHistory, SettingService) {
	$scope.settings = SettingService.all();

	$scope.save = function() {
		// TODO: Test that the service_url is valid and responds
		SettingService.setMany($scope.settings);
		SettingService.save();
		$ionicHistory.goBack();
	};
});

dtReminderApp.service('ItemService', function($rootScope) {
	var $scope = $rootScope.$new();
	var items = JSON.parse(localStorage['items'] || "{}");

	this.all = function() {
		return angular.copy(items);
	};

	this.get = function(id) {
		return angular.copy(items[id]);
	};

	this.set = function(id, data) {
		items[id] = data;
		persist();
	};

	this.add = function(data) {
		items[data.id] = data;
		persist();
	};

	this.delete = function(item) {
		delete items[item.id];
		persist();
		return item;
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

dtReminderApp.service('DataTrackerService', function($q, $http, SettingService) {
	this.push = function(data) {
		var deferred = $q.defer();

		var sentData = [];
		angular.forEach(data, function(datum) {
			var formattedData = {};
			formattedData['_timestamp'] = datum.timestamp;
			formattedData[datum.name] = datum.value;
			sentData.push(formattedData);
		});

		var serviceUrl = SettingService.get('service_url') || 'http://dev-tracker.dev';
		$http.post(serviceUrl + '/logs/bulk', sentData)
		.success(function() {
			deferred.resolve();
		})
		.error(function() {
			deferred.reject();
		});

		return deferred.promise;
	};
});

cordova = typeof cordova !== 'undefined' ? cordova : {};
cordova.plugins = cordova.plugins || {};

dtReminderApp.service('ReminderService', function($state) {
	var self = this;

	// TODO: Queue function calls until device is ready?
	var notification = {
		local: {
			schedule: function() { console.log('ReminderService.schedule'); },
			update: function() { console.log('ReminderService.update'); },
			cancel: function() { console.log('ReminderService.cancel'); },
			on: function() { console.log('ReminderService.on'); },
		},
	};

	document.addEventListener('deviceready', function() {
		notification = cordova.plugins.notification;

		notification.local.on('click', function(message) {
			var data = JSON.parse(message.data);
			$state.go('item-data-create', { itemId: data.itemId });
		});
	});

	this.configureReminder = function(item) {
		var data = {
			id: item.reminder.id,
			text: item.name,
			every: item.reminder.frequency,
			at: item.reminder.startAt,
			data: { itemId: item.id },
		};

		if (item.reminder.id && ! item.reminder.frequency) {
			self.cancelReminder(item);
		} else if (item.reminder.id) {
			self.updateReminder(item, data);
		} else if (item.reminder.frequency) {
			self.scheduleReminder(item, data);
		}
	};

	this.getNewReminderId = function() {
		var redminderId = parseInt(localStorage['reminderId'] || 1, 10);
		localStorage['reminderId'] = redminderId + 1;
		return redminderId;
	};

	this.cancelReminder = function(item) {
		if ( ! item.reminder.id) {
			return;
		}

		console.log('Cancelling redminder id = ' + item.reminder.id);
		notification.local.cancel(item.reminder.id);
		item.reminder.id = null;
	};

	this.updateReminder = function(item, data) {
		if ( ! item.reminder.id) {
			return;
		}

		// TODO: Verify if notification still exists... If not, call scheduleReminder

		console.log('Updating redminder id = ' + item.reminder.id);
		notification.local.update(data);
	};

	this.scheduleReminder = function(item, data) {
		item.reminder.id = self.getNewReminderId();
		data.id = item.reminder.id;
		console.log('Scheduling redminder id = ' + item.reminder.id);
		notification.local.schedule(data);
	};
});

dtReminderApp.service('SettingService', function() {
	var settings = JSON.parse(localStorage['settings'] || "{}");

	this.load = function() {
		settings = JSON.parse(localStorage['settings'] || "{}");
	};

	this.save = function() {
		localStorage['settings'] = JSON.stringify(settings);
	};

	this.get = function(key) {
		return angular.copy(settings[key]);
	};

	this.all = function() {
		return angular.copy(settings);
	}

	this.set = function(key, value) {
		settings[key] = value;
	};

	this.setMany = function(values) {
		angular.extend(settings, values);
	};
});

window.plugins = window.plugins || {};

var showToast = function(message, duration, position) {
	duration = duration || 'short';
	position = position || 'bottom';

	var toast = window.plugins.toast || {show: function() { console.log(message); }};
	toast.show(message, duration, position);
};

// Source: https://gist.github.com/jed/982883
function uuidv4(
  a                  // placeholder
){
  return a           // if the placeholder was passed, return
    ? (              // a random number from 0 to 15
      a ^            // unless b is 8,
      Math.random()  // in which case
      * 16           // a random number from
      >> a/4         // 8 to 11
      ).toString(16) // in hexadecimal
    : (              // or otherwise a concatenated string:
      [1e7] +        // 10000000 +
      -1e3 +         // -1000 +
      -4e3 +         // -4000 +
      -8e3 +         // -80000000 +
      -1e11          // -100000000000,
      ).replace(     // replacing
        /[018]/g,    // zeroes, ones, and eights with
        uuidv4            // random hex digits
      )
}