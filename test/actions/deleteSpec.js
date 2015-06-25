describe('GridEntity testing', function() {

  var domain = 'http://private-c9370-hyperschemavms.apiary-mock.com/jsonary';

  var $httpBackend;
  var $rootScope;

  var gridTable;
  var gridForm;
  var userModel;
  var deleteAction;
  var scope;
  var table;
  var form;

  var deleteLink = {
    method: 'DELETE',
    href: domain + '/targets/123'
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

  beforeEach(inject(function($injector) {

    $rootScope = $injector.get('$rootScope');
    $httpBackend = $injector.get('$httpBackend');

    scope = $rootScope.$new();
    scope.alerts = [];

    deleteAction = $injector.get('grid-action-delete');
    gridTable = $injector.get('gridTable');
    gridForm = $injector.get('gridForm');
    userModel = $injector.get('userModel');

    table = new gridTable(userModel);
    form = new gridForm(userModel);
  }));


  it('delete table row', function() {
    table.getTableInfo = jasmine.createSpy('getTableInfo').and.callFake(function(callback) {
      callback(table.getConfig());
    });

    $httpBackend.expectDELETE(domain + '/targets/123').respond(204, '');
    deleteAction(table, deleteLink, scope);
    $httpBackend.flush();

    expect(scope.hideForm).not.toBeDefined();
    expect(scope.alerts[0].type).toEqual('success');
  });

  it('delete form success', function() {
    $httpBackend.expectDELETE(domain + '/targets/123').respond(204, '');
    deleteAction(form, deleteLink, scope);
    $httpBackend.flush();

    expect(scope.hideForm).toBeDefined();
    expect(scope.alerts[0].type).toEqual('success');
  });

  it('form delete error', function() {
    $httpBackend.expectDELETE(domain + '/targets/123').respond(500, '');
    deleteAction(form, deleteLink, scope);
    $httpBackend.flush();

    expect(scope.hideForm).not.toBeDefined();
    expect(scope.alerts[0].type).toEqual('danger');
  });

  it('table delete error', function() {
    $httpBackend.expectDELETE(domain + '/targets/123').respond(500, '');
    deleteAction(table, deleteLink, scope);
    $httpBackend.flush();

    expect(scope.hideForm).not.toBeDefined();
    expect(scope.alerts[0].type).toEqual('danger');
  })

});