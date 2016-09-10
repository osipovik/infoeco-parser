var scorocode = require("scorocode");

// костанты с ключами для работы с BAAS Scorocode
const APP_ID = "88e98d83c5f4edc68589184843ad6904";
const JS_KEY = "2213dc3c13272159af8345764cfd55d2";
const MASTER_KEY = "91d8cf4388e9c32390b49b07aed16e74";

// Инициализация подключения к BAAS
exports.get_instance = function () {
	scorocode.Init({
		ApplicationID: APP_ID,
    	JavaScriptKey: JS_KEY,
    	MasterKey: MASTER_KEY
	});

	return scorocode;
}

// Чистим старые данные о пунктах приема
exports.clear_old_data = function() {
	var queryItems = new scorocode.Query("points");
	var yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);

	queryItems.lessThan("updatedAt", yesterday)
		.find()
		.then((finded) => {
			queryItems.remove(finded)
				.then((removed) => {
					console.log(removed);
				})
				.catch((error) => {
					console.error("Что-то пошло не так: \n", error);
				});
		})
		.catch((error) => {
            console.error("Что-то пошло не так: \n", error)
        });
}

exports.add_new_point = function (pointInfo) {
	if (pointInfo.date) {
		var arDate = pointInfo.date.split(".");
		pointInfo.date = new Date(arDate[2], arDate[1]-1, arDate[0], 9);
	}

	var queryItem = new scorocode.Query("points");

	queryItem
		.equalTo("address", pointInfo.address)
		.equalTo("date", pointInfo.date)
		.equalTo("longtitude", pointInfo.longtitude)
		.equalTo("latitude", pointInfo.latitude)
		.find().then((result) => {
			if (!result.result || result.result.length == 0) {
				add_point_to_baas(pointInfo);
			} else {
				console.info('point alredy exists');
				update_point(queryItem, pointInfo);
			}
		}).catch((error) => {
	    	console.error("Что-то пошло не так: \n", error)
		});
}

function update_point (findedItem, pointInfo) {
	var updateItems = new scorocode.UpdateOps("points");

	updateItems.set("address", pointInfo.address);
	findedItem.update(updateItems);

	console.info("update item");
}

//Добавляем новую запись в коолекцию
function add_point_to_baas (pointInfo) {
	// Создадим новый экземпляр объекта коллекции points.
	var pointItem = new scorocode.Object("points");

	for (var key in pointInfo) {
		// Используем метод set() для передачи объекту данных в поля.
		pointItem.set(key, pointInfo[key]);
	}

	// Сохраняем объект в BAAS
	pointItem.save()
		.then((saved) => {
			console.log(pointInfo);
			console.log("successfully saved");
		}).catch((error) => {
			console.error("fucking fail: \n", error);
		});
}