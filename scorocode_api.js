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

exports.add_new_point = function (pointInfo) {
	if (pointInfo.date) {
		var arDate = pointInfo.date.split(".");
		pointInfo.date = new Date(arDate[2], arDate[1]-1, arDate[0], 9);
	}

	var queryItem = new scorocode.Query("points");

	// console.info(pointInfo);

	queryItem
		.equalTo("address", pointInfo.address)
		.equalTo("location", pointInfo.coord)
		.equalTo("date", pointInfo.date)
		.find().then((result) => {
			if (!result.result || result.result.length == 0) {
				add_point_to_baas(pointInfo);
			} else {
				console.info('point alredy exists');
			}
		}).catch((error) => {
	    	console.error("Что-то пошло не так: \n", error)
		});
}

// Чистим старые данные о пунктах приема
exports.clear_old_data = function() {
	var queryItems = new scorocode.Query("points");

	var range1 = new scorocode.Query("points");
	var range2 = new scorocode.Query("points");	

	range1.lessThan("date", new Date());
	range2.doesNotExist("date")
		.equalTo("time_start", 36000)
		.equalTo("time_end", 72000);

	queryItems.or(range1).or(range2)
		.find()
		.then((finded) => {
			queryItems.remove(finded)
				.then((removed) => {
					console.log(removed);
					startParseShedule(body);
				})
				.catch((error) => {
					console.error("Что-то пошло не так: \n", error);
				});
		})
		.catch((error) => {
            console.error("Что-то пошло не так: \n", error)
        });
}

//Добавляем новую запись в коолекцию
function add_point_to_baas (pointInfo) {
	// Создадим новый экземпляр объекта коллекции points.
	var pointItem = new scorocode.Object("points");
	// Используем метод set() для передачи объекту данных в поля.
	pointItem
		.set("district", pointInfo.district)
		.set("address", pointInfo.address)
		.set("date", pointInfo.date)
		.set("time_start", pointInfo.time_start)
		.set("time_end", pointInfo.time_end);
	// Если есть координаты, передаем их
	if (pointInfo.coord) {
		pointItem.set("location", pointInfo.coord);
	}
	// Если есть изображение, сохраняем ссылку на него
	if (pointInfo.photo) {
		pointItem.set("photo", pointInfo.photo);
	}
	// Если есть телефон, сохраняем его
	if (pointInfo.phone) {
		pointItem.set("phone", pointInfo.phone);
	}
	// Сохраняем объект
	pointItem.save()
		.then((saved) => {
			console.log(pointInfo);
			console.log("successfully saved");
		}).catch((error) => {
			console.error("facking fail: \n", error);
		});
}