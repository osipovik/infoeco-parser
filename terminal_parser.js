// Подключаем необходимые модули
var request = require("request");
var cheerio = require("cheerio");
var tress = require("tress");
var baas = require("./scorocode_api.js");
var util = require("./util.js");

var scorocode = baas.get_instance();
var mapContent;

const PARSE_URL = util.get_base_url();

// Создаем очередь с задержкой выполнения 1 секунда
var queue = tress(function (job, done) {
	parseListPointInfo(job);
	// Функция callback
	done();
}, -1000);

queue.drain = function () {
	console.log("Finished!");
	baas.clear_old_data();
};

queue.error = function (err) {
    console.log('Job ' + this + ' failed with error ' + err);
};

queue.success = function (data) {
    // console.log('Job ' + this + ' successfully finished. Result is ' + data);
}

/**
 * Стартует парсинг экотерминалов
 * Функцию делаем доступной извне модуля
 */
exports.start_terminal_parse = function () {
	// Получаем страницу с картой точек стоянок
	request(PARSE_URL + "/41.html", function(error, response, body) {
		if (error) {
			console.error("error: " + error);
		} else {
			$ = cheerio.load(body);
			mapContent = $("script").text();
			terminalListParse();
		}
	});
}

/**
 * Получает html код страницы с табличным представлением списка терминалов
 * http://ecomobile.infoeco.ru/ekoterminaly.html
 */
function terminalListParse () {
	request(PARSE_URL + "/ekoterminaly.html", function(error, response, body) {
		if (error) {
			console.log("error: " + error);
		} else {
			parseData(body);
		}
	});
}

/**
 * Парсит данные таблицы со списком терминалов
 * body - html текст страницы для разбора
 */
function parseData (body) {
	var $ = cheerio.load(body);
			
	$("table.table tr:not(:first-child)").each(function() {
		// Каждую строку таблицы ставим в очередь на обработку
		queue.push($(this));
		return false;
	});
}

/**
 * Разбирает строку с данными из таблицы списка терминалов
 * http://ecomobile.infoeco.ru/ekoterminaly.html
 * pointInfoLine - jQuery объект, tr строка с данными о терминале
 */
function parseListPointInfo (pointInfoLine) {
	var mapPointId = 0;
	var point = {};
	var tdList = pointInfoLine.find("td");

	point.district = tdList.eq(1).text().trim();
	point.address = tdList.eq(2).text().trim();
	
	var linkTdHtml = tdList.eq(4).html();
	var result = linkTdHtml.match(/<a\s.*href="41.html&amp;ecoboxId=([0-9]+)"/);

	if (result && result[1]) {
		mapPointId = result[1];
		parseMapPointInfo(mapPointId, point);
	} else {
		baas.add_new_point(point);
	}
}

/**
 * Вытаскивает данные о конкретной точке из кода страницы с яднекс картой
 * http://ecomobile.infoeco.ru/41.html&ecoboxId=1
 * mapPointId - идентификатор точки на карте
 * point - объект, содержащий информацию о точке
 */
function parseMapPointInfo (mapPointId, point) {
	// Паттерн регулярки для извлечения координат, изображения из balloonContent, 
	// и описаний из параметров balloonContentHeader и balloonContentFooter
	pattern = "marks\\[" + mapPointId + "\\]\\s=\\snew\\symaps\\." + 
		"Placemark\\(\\[([0-9\\.]*,[0-9\\.]*)\\],[\\s\\S]+?balloonContent:\\s\"" + 
		"<img\\ssrc=\\\\\"(.+?)\\\\\"/>\",\\s+?balloonContentHeader:\\s'(.+?)'," +
		"\\s+?balloonContentFooter:\\s'(.+?)'";
	result = mapContent.match(pattern);

	if (result) {
		if (result[1]) {
			var coord = result[1].split(",");
			point.longtitude = parseFloat(coord[0]);
			point.latitude = parseFloat(coord[1]);
		}

		if (result[2]) {
			point.photo = PARSE_URL + "/" + result[2];
		}

		if (result[3]) {
			point.place_title = result[3].replace(point.address + "<br/>", "").trim();
		}
		
		if (result[4]) {
			point.note = result[4];
		}
	}

	baas.add_new_point(point);
}

