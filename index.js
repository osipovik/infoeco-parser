var request = require("request");
var cheerio = require("cheerio");
var tress = require("tress");
var scorocode = require("scorocode");

// //Создаем очередь с задержкой выполнения 1 секунда
var queue = tress(function(job, done) {
	parseMainPointInfo(job);
	// Функция callback
	done();
}, -1000);

queue.drain = function() {
	console.log("Finished!");
};

queue.error = function(err) {
    console.log('Job ' + this + ' failed with error ' + err);
};

queue.success = function(data) {
    // console.log('Job ' + this + ' successfully finished. Result is ' + data);
}

//Получаем страницу с табличеым представлением графика стоянок
request("http://ecomobile.infoeco.ru/grafik-stoyanok.html", function(error, response, body) {
	if (error) {
		console.log("error: " + error);
	} else {
		// Чистим старые данные
		removeOldData();

		var $ = cheerio.load(body);
		$("table.table tr:not(:first-child)").each(function() {
			queue.push($(this));
			// return false;
		});
	}
});

function parseMainPointInfo(pointInfoLine) {
	var mapPointId = 0;
	var point = {};

	var tdList = pointInfoLine.find("td");

	point.district = tdList.eq(0).text();
	point.address = tdList.eq(1).text();
	point.date = tdList.eq(2).text();

	var timeStartEnd = tdList.eq(3).text().split("-");

	if (timeStartEnd.length == 2) {
		point.time_start = timeStartEnd[0];
		point.time_end = timeStartEnd[1];
	}

	var link = pointInfoLine.find("td:last-child a").attr("href");

	if (link) {
		var arLinkPart = link.split("=");
		mapPointId = arLinkPart[1];
		parseMapPointInfo(mapPointId, point);
	} else {
		prepareDataForDB(point);
	}
}

function parseMapPointInfo(mapPointId, point) {
	var url = "http://ecomobile.infoeco.ru/34.html&datePointId=" + mapPointId;
	var coord = [];
	var info = point;

	request(url, function(error, response, body) {
		if (error) {
			console.log("error: " + error);
		} else {
			var $ = cheerio.load(body);

			var script = $("script").text();
			//Ищем координнаты точки на карте
			var pattern =  /accentMark=\snew\symaps\.Placemark\(\[([0-9\.]*,[0-9\.]*)\],/;
			var result = script.match(pattern);

			if (result) {
				info.coord = result[1].split(",");
			} else {
				
			}

			//Ищем фотограцию места, если она есть в парметре balloonContent
			pattern = /accentMark=\snew\symaps\.Placemark[\s\S]*balloonContent:\s'<p><a\shref="(.*)"\starget/;
			result = script.match(pattern);

			if (result) {
				info.photo = "http://ecomobile.infoeco.ru/" + result[1];
			}
		}

		prepareDataForDB(info);
	});
}

function prepareDataForDB(pointInfo) {
	var arDate = pointInfo.date.split(".");
	pointInfo.date = new Date(arDate[2], arDate[1]-1, arDate[0]);
	// console.info(date);

	var arTimeStart = pointInfo.time_start.split(".");
	pointInfo.time_start = new Date(arDate[2], arDate[1]-1, arDate[0], arTimeStart[0], arTimeStart[1]);
	// console.info(timeStart);

	var arTimeEnd = pointInfo.time_end.split(".");
	pointInfo.time_end = new Date(arDate[2], arDate[1]-1, arDate[0], arTimeEnd[0], arTimeEnd[1]);
	// console.info(timeEnd);

	var queryItem = new scorocode.Query("points");

	// console.info(pointInfo);

	queryItem
		.equalTo("address", pointInfo.address)
		.equalTo("time_start", pointInfo.time_start)
		.equalTo("time_end", pointInfo.time_end)
		.find().then((result) => {
			if (!result.result || result.result.length == 0) {
				addNewPointToDB(pointInfo);
			}
		}).catch((error) => {
	    	console.log("Что-то пошло не так: \n", error)
		});

	// console.info(pointInfo);
}

function removeOldData() {
	scorocode.Init({
		ApplicationID: "88e98d83c5f4edc68589184843ad6904",
    	JavaScriptKey: "2213dc3c13272159af8345764cfd55d2",
    	MasterKey: "91d8cf4388e9c32390b49b07aed16e74"
	});

	var queryItems = new scorocode.Query("points");
	var now = new Date();

	queryItems.lessThan("time_end", now)
		.find()
		.then((finded) => {
			// console.info(finded);
			queryItems.remove(finded)
				.then((removed) => {
					console.info(removed);
				})
				.catch((error) => {
					console.info("Что-то пошло не так: \n", error);
				});
		})
		.catch((error) => {
            console.log("Что-то пошло не так: \n", error)
        });
}

function addNewPointToDB(pointInfo) {
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
	// Сохраняем объект
	pointItem.save()
		.then((saved) => {
			console.info("successfully saved");
		}).catch((error) => {
			console.info("facking fail: \n", error);
		});
}