describe('Action create testing', function() {

  var domain = 'http://private-c9370-hyperschemavms.apiary-mock.com/jsonary';

  var $httpBackend;
  var $rootScope;

  var gridForm;
  var userModel;
  var createAction;
  var scope;
  var form;

  var createLink = {
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

    createAction = $injector.get('grid-action-create');
    gridForm = $injector.get('gridForm');
    userModel = $injector.get('userModel');

    form = new gridForm(userModel);

    form.getFormInfo = jasmine.createSpy('getFormInfo').and.callFake(function(callback) {
      callback(form.getConfig());
    });

  }));

  it('form not validate', function() {
    scope.scopeForm.gridForm.$valid = false;
    expect(createAction(form, createLink, scope)).toEqual(false);
  });

  it('form create success', function() {

    scope.scopeForm.gridForm.$valid = true;

    $httpBackend.expectPOST(domain + '/targets').respond(201, '');
    createAction(form, createLink, scope);
    $httpBackend.flush();

    expect(scope.alerts[0].type).toEqual('success');
  });

  it('form create error', function() {
    scope.scopeForm.gridForm.$valid = true;

    $httpBackend.expectPOST(domain + '/targets').respond(500, '');
    createAction(form, createLink, scope);
    $httpBackend.flush();

    expect(scope.alerts[0].type).toEqual('danger');
  });

});