describe('GridEntity testing', function() {

  var domain = 'http://private-c9370-hyperschemavms.apiary-mock.com/jsonary';

  var userModel;
  var Entity;
  var entity;

  beforeEach(function() {
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
    Entity = $injector.get('grid-entity');
    userModel = $injector.get('userModel');
    entity = new Entity();
  }));

  describe('Jsonary extend data', function() {

    var data;

    beforeEach(inject(function($injector) {
      data = Jsonary.create({
        relationships: true,
        attributes: false
      })
    }));

    it('relationships', function() {
      expect(data.relationships()).toEqual(true)
    });

    it('attributes', function() {
      expect(data.attributes()).toEqual(false)
    });
  });

  it('test set entity', function() {
    var paramsUpdate = {
      resource: 'targets',
      type: 'update',
      id: '123'
    };
    var paramsRead = {
      resource: 'targets',
      type: 'read',
      id: '123'
    };
    var paramsCreate = {
      resource: 'targets',
      type: 'create'
    };
    var paramsResource = {
      resource: 'targets'
    };
    expect(entity.getResourceUrl('http://domain.com', paramsUpdate)).toEqual('http://domain.com/targets/update/123');
    expect(entity.getResourceUrl('http://domain.com', paramsRead)).toEqual('http://domain.com/targets/read/123');
    expect(entity.getResourceUrl('http://domain.com', paramsCreate)).toEqual('http://domain.com/targets/schema#/definitions/create');
    expect(entity.getResourceUrl('http://domain.com', paramsResource)).toEqual('http://domain.com/targets');
  });

  it('load data check callback params', function() {
    expect(entity.loadData('http://private-c9370-hyperschemavms.apiary-mock.com/jsonary/targets')).toBe(undefined);
  });

  it('test allOf _replaceFromFull', function() {
    var schema = {
      'users': {
        'allOf': [
          {
            '$ref': '#/definitions/users'
          },
          {
            'readOnly': true
          }
        ]
      }
    };
    var fullSchema = readJSON('test/mock/schemas/targets.json');

    var expectResult = {
      'users': {
        'allOf': [
          {
            'title': 'Users',
            'type': 'array',
            'minItems': 2,
            'uniqueItems': true,
            'additionalItems': true,
            'items': {
              'type': 'string',
              'enum': [
                'de105d54-75b4-431b-adb2-eb6b9e546013',
                'de205d54-75b4-431b-adb2-eb6b9e546014',
                'de305d54-75b4-431b-adb2-eb6b9e546013'
              ]
            }
          },
          {
            'readOnly': true
          }
        ]

      }
    };

    var result = entity._replaceFromFull(schema, fullSchema);

    expect(result.users.allOf[0].title).toEqual(expectResult.users.allOf[0].title);

  });

  it('check create new form', function() {
    var schema = Jsonary.createSchema(readJSON('test/mock/targetSchema.json').definitions.create);
    entity._getEmptyDataRelations(schema)
  })

});