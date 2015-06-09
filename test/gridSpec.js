describe('GridEntity testing', function() {

  var domain = 'http://private-c9370-hyperschemavms.apiary-mock.com/jsonary';

  var gridEntity;
  var userModel;
  var $timeout;
  var $interval;

  var TestResponses = {
    users: {
      data: {
        read: {
          success: {
            contentType: 'application/vnd.api+json; profile='+domain+'/users/schema#/definitions/read',
            status: 200,
            responseText: JSON.stringify(readJSON('test/mock/userDataRead.json'))
          }
        }
      },
      schema: {
        success: {
          status: 200,
          contentType: 'application/schema+json',
          responseText: JSON.stringify(readJSON('test/mock/userSchema.json'))
        }
      }
    },
    targets: {
      data: {
        list: {
          success: {
            contentType: 'application/vnd.api+json; profile='+domain+'/targets/schema#/definitions/list',
            status: 200,
            responseText: JSON.stringify(readJSON('test/mock/targetDataList.json'))
          }
        }
      },
      schema: {
        success: {
          status: 200,
          contentType: 'application/schema+json',
          responseText: JSON.stringify(readJSON('test/mock/targetSchema.json'))
        }
      }
    }
  };

  beforeEach(function () {
    module('grid');

    module(function($provide) {
      $provide.factory('userModel', function(){
        return {
          'url': 'http://private-c9370-hyperschemavms.apiary-mock.com/jsonary',
          'params': {
            resource: 'targets',
            type: '',
            id: ''
          }
        }
      });
    });
  });

  beforeEach(function () {
    jasmine.Ajax.install();

    jasmine.Ajax.stubRequest(domain + '/targets', '', 'GET')
      .andReturn(TestResponses.targets.data.list.success);
    jasmine.Ajax.stubRequest(domain + '/targets/schema', '', 'GET')
      .andReturn(TestResponses.targets.schema.success);

    jasmine.Ajax.stubRequest(domain + '/users/read/de105d54-75b4-431b-adb2-eb6b9e546013', '', 'GET')
      .andReturn(TestResponses.users.data.read.success);
    jasmine.Ajax.stubRequest(domain + '/users/read/de205d54-75b4-431b-adb2-eb6b9e546014', '', 'GET')
      .andReturn(TestResponses.users.data.read.success);
    jasmine.Ajax.stubRequest(domain + '/users/read/de305d54-75b4-431b-adb2-eb6b9e546013', '', 'GET')
      .andReturn(TestResponses.users.data.read.success);
    jasmine.Ajax.stubRequest(domain + '/users/schema', '', 'GET')
      .andReturn(TestResponses.users.schema.success);

  });

  beforeEach(inject(function($injector){
    $timeout = $injector.get('$timeout');
    $interval = $injector.get('$interval');
    gridEntity = $injector.get('grid-entity');
    userModel = $injector.get('userModel');

    gridEntity.setModel(userModel);

  }));

  afterEach(function() {
    jasmine.Ajax.uninstall();
  });

  it ('check get table info', function () {
    var table;

    gridEntity.getTableInfo(function(data) {
      table = data;
    });

    $timeout.flush();
    $interval.flush(100);

    expect(Array.isArray(table)).toEqual(false);
    expect(table.rows).toBeDefined();
    expect(table.columns).toBeDefined();
    expect(table.links).toBeDefined();

  });


});