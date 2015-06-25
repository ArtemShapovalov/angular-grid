describe('Form testing', function() {

  var domain = 'http://private-c9370-hyperschemavms.apiary-mock.com/jsonary';

  var gridForm;
  var userModel;
  var $timeout;
  var $interval;
  var form;

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
        read: {
          success: {
            contentType: 'application/vnd.api+json; profile='+domain+'/targets/schema#/definitions/read',
            status: 200,
            responseText: JSON.stringify(readJSON('test/mock/targetDataRead.json'))
          }
        },
        update: {
          success: {
            contentType: 'application/vnd.api+json; profile='+domain+'/targets/schema#/definitions/update',
            status: 200,
            responseText: JSON.stringify(readJSON('test/mock/targetDataUpdate.json'))
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

    jasmine.Ajax.stubRequest(domain + '/targets/update/de205d54-75b4-431b-adb2-eb6b9e546013', '', 'GET')
      .andReturn(TestResponses.targets.data.update.success);
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
    gridForm = $injector.get('gridForm');
    userModel = $injector.get('userModel');

    form = new gridForm(userModel);
  }));

  afterEach(function() {
    jasmine.Ajax.uninstall();
  });

  it('check create title map for checkbox list by full schema', function() {
    var resource = {};
    var titleMap = {};
    var titleMapUsers = [
      { value: "de105d54-75b4-431b-adb2-eb6b9e546013", name: "John3 Doe" },
      { value: "de205d54-75b4-431b-adb2-eb6b9e546014", name: "John3 Doe" },
      { value: "de305d54-75b4-431b-adb2-eb6b9e546013", name: "John3 Doe" }
    ];
    var titleMapUser = [
      { value: "de105d54-75b4-431b-adb2-eb6b9e546013", name: "dimon3@gmail.com" },
      { value: "de205d54-75b4-431b-adb2-eb6b9e546014", name: "dimon3@gmail.com" },
      { value: "de305d54-75b4-431b-adb2-eb6b9e546013", name: "dimon3@gmail.com" }
    ];
    var formConfigUsers = {
      key: "users",
      titleMap: titleMapUsers
    };
    var formConfigUser = {
      key: "user",
      titleMap: titleMapUser
    };

    form.loadData(domain + '/targets/update/de205d54-75b4-431b-adb2-eb6b9e546013', function(data, schema) {
      resource.data = data;
      resource.schema = schema;
    });

    form._createTitleMap(resource.data.property('data'), function(responce) {
        titleMap = responce;
    });

    $interval.flush(100);

    expect(titleMap.users).toEqual(titleMapUsers);
    expect(titleMap.user).toEqual(titleMapUser);
    expect(resource.schema).toBeDefined();

    form._getFormConfig(resource.data, function(formConfig) {
      expect(formConfig).toContain(formConfigUsers);
      expect(formConfig).toContain(formConfigUser);
    });

    $timeout.flush();
    $interval.flush(100);
    $interval.flush(100);
    $timeout.flush();
  });

  it ('check get form info', function () {

    userModel.params.id = 'de205d54-75b4-431b-adb2-eb6b9e546013';
    userModel.params.type = 'update';

    var formData;

    var form = new gridForm(userModel);
    form.getFormInfo(function(data) {
      formData = data;
    });

    $timeout.flush();
    $interval.flush(100);
    $interval.flush(100);
    $timeout.flush();

    expect(formData.links).toBeDefined();
  });


});