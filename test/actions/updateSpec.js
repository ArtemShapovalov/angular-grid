describe('Action update testing', function() {

  var domain = 'http://private-c9370-hyperschemavms.apiary-mock.com/jsonary';

  var $httpBackend;
  var $rootScope;

  var gridForm;
  var userModel;
  var updateAction;
  var scope;
  var form;

  var updateLink = {
    method: 'POST',
    href: domain + '/targets'
  };

  beforeEach(function () {
    module('grid');

    module(function($provide) {
      $provide.factory('userModel', function() {
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

  beforeEach(inject(function($injector) {

    $rootScope = $injector.get('$rootScope');
    $httpBackend = $injector.get('$httpBackend');

    scope = $rootScope.$new();
    scope.scopeForm = {};
    scope.scopeForm.gridForm = {};
    scope.alerts = [];

    updateAction = $injector.get('grid-action-update');
    gridForm = $injector.get('gridForm');
    userModel = $injector.get('userModel');

    form = new gridForm(userModel);

    form.getFormInfo = jasmine.createSpy('getFormInfo').and.callFake(function(callback) {
      callback(form.getConfig());
    });

  }));

  it('form not validate', function() {
    scope.scopeForm.gridForm.$valid = false;
    expect(updateAction(form, updateLink, scope)).toEqual(false);
  });

  it('form update success', function() {

    scope.scopeForm.gridForm.$valid = true;

    $httpBackend.expectPOST(domain + '/targets').respond(201, '');
    updateAction(form, updateLink, scope);
    $httpBackend.flush();

    expect(scope.schema).toBeDefined();
    expect(scope.form).toBeDefined();
    expect(scope.model).toBeDefined();
    expect(scope.alerts[0].type).toEqual('success');
  });

  it('form update error', function() {
    scope.scopeForm.gridForm.$valid = true;

    $httpBackend.expectPOST(domain + '/targets').respond(500, '');
    updateAction(form, updateLink, scope);
    $httpBackend.flush();

    expect(scope.alerts[0].type).toEqual('danger');
  });

});