// Подключаем необходимые модули
var request = require("request");
var cheerio = require("cheerio");
var tress = require("tress");
var scorocode = require("scorocode");
// костанты с ключами для работы с BAAS Scorocode
const APP_ID = "88e98d83c5f4edc68589184843ad6904";
const JS_KEY = "2213dc3c13272159af8345764cfd55d2";
const MASTER_KEY = "91d8cf4388e9c32390b49b07aed16e74";
const PARSE_URL = "http://ecomobile.infoeco.ru";

var mapContent;

// Создаем очередь с задержкой выполнения 1 секунда
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

// Получаем страницу с табличеым представлением графика стоянок
// request(PARSE_URL + "/grafik-stoyanok.html", function(error, response, body) {
// 	if (error) {
// 		console.log("error: " + error);
// 	} else {
// 		// Чистим старые данные
// 		removeOldData();

// 		var $ = cheerio.load(body);
// 		$("table.table tr:not(:first-child)").each(function() {
// 			queue.push($(this));
// 			// return false;
// 		});
// 	}
// });

request(PARSE_URL + "/34.html", function(error, response, body) {
	if (error) {
		console.error("error: " + error);
	} else {
		$ = cheerio.load(body);
		mapContent = $("script").text();
		getStatMapPointInfo();
	}
});

function getStatMapPointInfo() {
	// Получаем страницу с табличеым представлением стационарных пунктов сбора
	request(PARSE_URL + "/staczionarnyie-punktyi.html", function(error, response, body) {
		if (error) {
			console.error("error: " + error);
		} else {
			var $ = cheerio.load(body);
			$("div#content dl dt").each(function(index) { 
				var ddItem = $("div#content dl dd").eq(index);
				var arStatPointInfo = ddItem.text().split("\r\n");

				arStatPointInfo.forEach(function(item, i, arr) {
					arStatPointInfo[i] = item.replace(/^\s+|\s+$/g,'');
				});

				var pointInfo = {};

				pointInfo.district = $(this).text().split(" ")[0];
				pointInfo.address = arStatPointInfo[1];
				pointInfo.phone = arStatPointInfo[2].replace(/[^0-9\+-]+/g, '');

				var arTime = arStatPointInfo[3].match(/([0-9\.]*)\s\S{2}\s([0-9\.]*)/);

				pointInfo.time_start = timeToSeconds(arTime[1]);
				pointInfo.time_end = timeToSeconds(arTime[2]);

				var statPointInfoHtml = ddItem.html();
				var result = statPointInfoHtml.match(/<a\shref=".+statPointId=([0-9]+)"/);
				var mapPointId = result[1];


				var pattern = "marks\\['stat'\\]\\[" + mapPointId + "\\]\\s=\\snew\\symaps\\.Placemark\\(\\[([0-9\\.]*,[0-9\\.]*)\\],";
				var result = mapContent.match(pattern);

				if (result) {
					pointInfo.coord = result[1].split(",");
				}

				// Ищем фотограцию места, если она есть в парметре balloonContent
				pattern = "marks\\['stat'\\]\\[" + mapPointId + "\\]\\s=\\snew\\symaps\\.Placemark[\\s\\S]*balloonContent:\\s'<p><a\\shref=\"(.*)\"\\starget";
				// pattern = /accentMark=\snew\symaps\.Placemark[\s\S]*balloonContent:\s'<p><a\shref="(.*)"\starget/;
				result = mapContent.match(pattern);

				if (result) {
					pointInfo.photo = PARSE_URL + "/" + result[1];
				}
				console.log(pointInfo);

				// return false;
			});
		}
	});
}

function timeToSeconds(time) {
	var arTime = time.split(".");
	return (((parseInt(arTime[0]) * 60) + parseInt(arTime[1])) * 60);
}

function parseMainPointInfo(pointInfoLine) {
	var mapPointId = 0;
	var point = {};
	var tdList = pointInfoLine.find("td");

	point.district = tdList.eq(0).text();
	point.address = tdList.eq(1).text();
	point.date = tdList.eq(2).text();

	var timeStartEnd = tdList.eq(3).text().split("-");

	if (timeStartEnd.length == 2) {
		point.time_start = timeToSeconds(timeStartEnd[0]);
		point.time_end = timeToSeconds(timeStartEnd[1]);
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
	var url = PARSE_URL + "/34.html&datePointId=" + mapPointId;
	var coord = [];
	var info = point;

	request(url, function(error, response, body) {
		if (error) {
			console.error("error: " + error);
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
				info.photo = PARSE_URL + "/" + result[1];
			}
		}

		prepareDataForDB(info);
	});
}

function prepareDataForDB(pointInfo) {
	var arDate = pointInfo.date.split(".");
	pointInfo.date = new Date(arDate[2], arDate[1]-1, arDate[0], 9);
	// console.info(arDate);

	var queryItem = new scorocode.Query("points");

	// console.info(pointInfo);

	queryItem
		.equalTo("address", pointInfo.address)
		.equalTo("date", pointInfo.date)
		.equalTo("time_start", pointInfo.time_start)
		.equalTo("time_end", pointInfo.time_end)
		.find().then((result) => {
			if (!result.result || result.result.length == 0) {
				addNewPointToDB(pointInfo);
			}
		}).catch((error) => {
	    	console.error("Что-то пошло не так: \n", error)
		});

	// console.info(pointInfo);
}

function removeOldData() {
	scorocode.Init({
		ApplicationID: APP_ID,
    	JavaScriptKey: JS_KEY,
    	MasterKey: MASTER_KEY
	});

	var queryItems = new scorocode.Query("points");
	var now = new Date();

	queryItems.lessThan("time_end", now)
		.find()
		.then((finded) => {
			// console.info(finded);
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
			console.log("successfully saved");
		}).catch((error) => {
			console.error("facking fail: \n", error);
		});
}