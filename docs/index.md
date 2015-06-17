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

```json
"attributes": {
    "type": "object",
    "properties": {
        "title": {
            "$ref": "#/definitions/title"
        },
        ...
        "relation": {
            "title": "Users",
            "type": "array",
            "minItems": 2,
            "uniqueItems": true,
            "additionalItems": true,
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
    "required": ["title", "relation"],
    "additionalProperties": false
},
```

##Actions
Для описания какого-либо поведения необходимо добавить секцию Links в гиперсхему описывающую ресурс

```json
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
```

`rel` обязательный параметр, относительно которого выбирается действие над ресурсом.

Принцип формирования href: к url адрессу указанному в сервисе, конкотенируется href указанный в link соответствующего
ресурса и производится подмена шаблона {id} на его актуальное значение.

###Create
rel - `create`, создание ресурса методом POST и валидация данных

###Read
rel - `read`, получение данных ресурса методом GET

###Update
rel - `update`, редактирование ресурса согласно RESTApi путем отправки данных методом PATCH на url 
                указанный в аттрибуте href. Валидация данных на основе описанной схемы и обновление интерфейса с учетом измененных данных
###Delete
rel - `delete`, производит удаление ресурса согласно RESTApi путем отправки данных методом DELETE на url 
                указанный в аттрибуте href.
###GoTo...
rel - `goTo`, осуществляет переход на url указанный в href. Href указывает на локальный url

