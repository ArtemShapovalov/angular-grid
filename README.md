Angular VMS Grid module
=======================

Модуль `Angular VMS Grid` для AngularJS предоставляет функционал CRUD для различных ресурсов. Целью является генерация
интерфейса и манипуляция с данными ресурса по схеме описывающей этот ресурс, при этом главным условием остается то, что 
изначально модуль не располагает информацией о структуре ресурса, объеме данных, количестве полей и типу данных.

##Using standards

 1. RESTApi
 2. [JsonApi](http://jsonapi.org)
 3. [Json-schema](https://tools.ietf.org/html/draft-zyp-json-schema-04) draft-04 и [Hyper-schema](https://tools.ietf.org/html/draft-luff-json-hyper-schema-00)

##Documentation

You can find [all documentation here](docs/index.md), it covers all the different field types
and their options.

##Basic Usage

Создаем сервис 

```javascript
app.factory('GridSrv', [{
    return {
      /**
       * create - SCHEMA -> /:resource/schema#/definitions/:type
       * list   - DATA   -> /:resource
       * update - DATA   -> /:resource/:id
       * read   - DATA   -> /:resource/:id
       */
       url: 'http://private-c9370-hyperschemavms.apiary-mock.com/jsonary',
       /**
       * {
       *    id:       string | undefined 
       *    type:     create | read | update | delete
       *    resource: users | other
       * }
       */
       params: {}
    };
}]);
```

Добавляем контроллер для передачи сервиса в директиву 

```javascript
app.controller('TestCtrl', ['$scope', '$routeParams', 'GridSrv', function($scope, $routeParams, GridSrv) {
    GridSrv.params = {
      'resource': $routeParams.resource,
      'id': $routeParams.id,
      'type': $routeParams.action
    };
    $scope.gridSrv = GridSrv;
}]);
```

И подключаем директиву

```html
  <vms-grid grid-model="gridSrv"></vms-grid>
```

##Installation

Проще всего установить VMS-Grid через [Bower](http://bower.io/).

```bash
bower install VertaMedia/angular-grid#v0.2.0
```

Это позволит подгрузить все необходимые зависимости. Смотрите [раздел зависимостей](#dependencies)

### Manual

Вы также можете просто загрузить контент с папки `dist/` и добавить вручную все необходимые зависимости.
Смотрите [раздел зависимостей](#dependencies)

### Dependencies

Schema form has a lot of dependencies, most of which are optional. Schema Form depends on:

 1. [AngularJS](https://github.com/angular/angular.js) version 1.3.x
 2. [Angular Schema Form](https://github.com/Textalk/angular-schema-form) version 0.8.2
 3. [Lodash](https://lodash.com) version 3.6.x
 4. [JsonAry](https://github.com/jsonary-js/jsonary-release) version 0.0.18

##Tests

Unit тесты запускаются при помощи [karma](http://karma-runner.github.io) и написаны используя
[jasmine](http://jasmine.github.io/)

Для запуска тестов необходимо:

1. Install all dependencies via NPM.
2. Install dev dependencies with bower.
3. Install the Karma CLI.
4. Run the tests.

```bash
$ npm install
$ bower install
$ sudo npm install -g karma-cli
$ karma start karma.conf.js
```