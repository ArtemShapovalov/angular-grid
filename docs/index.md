#Documentation

###Global Options

`grid-model` объект содержащий следующие доступные аттрибуты.

| Attribute     | Description             |
|:--------------|:------------------------|
| url | `string` Url домена где расположены ресурсы |
| params | `object` [параметры](#attribute-params) для получения конкретного ресурса |

####Attribute Params

| Attribute     | Description             |
|:--------------|:------------------------|
| resource | `string` название ресурса |
| type     | `string`, поведение для ресурса (`create`, `read`, `update`, `delete`, `list`) по умолчанию устанавливается `list` |
| id       | `string` `id` ресурса |

```html
<div ng-controller="SomeController">
    <vms-grid grid-model="userGrid"></vms-grid>
</div>
```

##Relationships

Данный ресурса
```json
{
    "data": {
        "type": "foo",
        "id": "de305d54-75b4-431b-adb2-eb6b9e546013",
        "attributes": {
            "title": "My foo resource title field",
        },
        "relationships": {
            "barRelation": {
                "links": {
                  "self": "http://path/to/resource",
                  "related": "http://path/to/relationships/resource"
                },
                "data": [
                    { "type": "bar", "id": "de105d54-75b4-431b-adb2-eb6b9e546013" }
                ]
            }
        }
    }
}   
```
Возвращая данные с сервера по стандарту jsonapi модуль `Grid` автоматически подгрузит все описанные в блоке `relationships`
ресурсы и отрисует их в интерфейсе. Для определения какое именно поле ресурса необходимо отобразить, требуется при описании
этой связи в схеме, добавить атрибут `name` соответствующий имени поля зависимого русурса. В случае отсутствия `name`
по умолчанию будет отображено поле `id`.

Схема рсурса
```json
"attributes": {
},
"relationships": {
    "type": "object",
    "additionalProperties": true,
    "properties": {
        "barRelation": {
            "type": "object",
            "title": "Bar relation title",
            "name": "someFieldForVisible",  <-- require for visible field
            "additionalProperties": true,
            "properties": {
                "links": {
                    "type": "object",
                    "additionalProperties": true,
                    "properties": {
                        "self": {
                          "title": "Self",
                          "type": "string"
                        },
                        "related": {
                          "title": "Related",
                          "type": "string"
                        }
                    }
                },
                "data": {
                   "type": "array",
                   "items": {
                       "type": "object",
                       "additionalProperties": true,
                       "properties": {
                           "id": {
                               "$ref": "#/definitions/id"
                           },
                           "type": {
                               "$ref": "#/definitions/type"
                           }
                       }
                   }
                }
            }
        }
    }
}
```

Для отобраюения связей в форме редактирования, необходимо их описать в блоке `attributes` например:

```json
"attributes": {
    "type": "object",
    "properties": {
        ...
        "barRelation": {
            "title": "Title some relation",
            "type": "array",
            "items": {
                "type": "string",
                "enum": [
                    "de105d54-75b4-431b-adb2-eb6b9e546013",
                    "de205d54-75b4-431b-adb2-eb6b9e546014",
                    "de305d54-75b4-431b-adb2-eb6b9e546013"
                ]
            }
        }
    },
    "required": ["barRelation"]
},
"relationships": {
}
```

##Actions
Для описания какого-либо поведения с ресурсом необходимо добавить атрибут Links в гиперсхему описывающую данный ресурс
на пример:

```json
{
    "type": "object",
    "properties": {
        "id": {
            "title": "Id",
            "type": "string"
        },
        "type": {
            "title": "Type",
            "type": "string"
        },
        "attributes": {
            "type": "object",
            "properties": {
                "name": {
                    "title": "Name",
                    "type": "string"
                }
            },
            "required": ["name"],
            "additionalProperties": false
        },
        "relationships": {
            "$ref": "#/definitions/relationships"
        }
    },
    "required": ["type", "id", "attributes"],
    "additionalProperties": false,
    "links": [
        {
            "title": "Update",
            "description": "Edit Resource",
            "href": "/resource/{id}",
            "rel": "update",
            "method": "PATCH",
            "encType": "application/vnd.api+json"
        }
    ]
}
```

`rel` - обязательный параметр, относительно которого выбирается действие над ресурсом.

`href` преобразуется по следующему правилу: к `url` указанному в сервисе, конкотенируется href указанный в link соответствующего
ресурса и производится подмена шаблона {id} на его актуальное значение.

####Create
rel - `create`, создание ресурса методом POST не url указанный в href и валидация данных перед отправкой по схеме

####Read
rel - `read`, получение данных ресурса методом GET и их тображение в интерфейсе

####Update
rel - `update`, редактирование ресурса методом PATCH по url указанному в аттрибуте href. Валидация данных на основе
описанной схемы, обновление интерфейса с учетом измененных данных и отображение статуса операции.

####Delete
rel - `delete`, производит удаление ресурса согласно RESTApi путем отправки данных методом DELETE на url 
                указанный в аттрибуте href.
####GoTo...
rel - `goTo`, осуществляет переход на url указанный в href. Href указывает на локальный url сайта

