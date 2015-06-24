describe('GridEntity testing', function() {

  var domain = 'http://private-c9370-hyperschemavms.apiary-mock.com/jsonary';

  var gridEntity;
  var gridTable;
  var userModel;
  var $timeout;
  var $interval;

  var table;

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
          'url': domain,
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

    jasmine.Ajax.stubRequest(domain + '/targets?page[offset]=0&page[limit]=1', '', 'GET')
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
    gridTable = $injector.get('gridTable');
    userModel = $injector.get('userModel');

    table = new gridTable(userModel);
  }));

  afterEach(function() {
    jasmine.Ajax.uninstall();
  });

  it ('check get table info', function () {
    var dataTable;

    table.getTableInfo(function(data) {
      dataTable = data;
    });

    $timeout.flush();
    $interval.flush(100);

    expect(Array.isArray(dataTable)).toEqual(false);
    expect(dataTable.rows).toBeDefined();
    expect(dataTable.columns).toBeDefined();
    expect(dataTable.links).toBeDefined();

  });


  it('check get sorting field relation', function() {
    var dataTable;

    table.getTableInfo(function(data) {
      dataTable = data;
    });

    $timeout.flush();
    $interval.flush(100);

    expect(table.data).toBeDefined('property');

    expect(table.getSortingParamByField('title')).toEqual('title');
    expect(table.getSortingParamByField('user')).toEqual('user.email');
    expect(table.getSortingParamByField('us')).toEqual('us.fullname');

    table.setSorting('user', 'asc');
    expect(table.sorting.field).toEqual('user.email');

  })

});