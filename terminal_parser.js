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
};

queue.error = function (err) {
    console.log('Job ' + this + ' failed with error ' + err);
};

queue.success = function (data) {
    // console.log('Job ' + this + ' successfully finished. Result is ' + data);
}

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

function terminalListParse () {
	request(PARSE_URL + "/ekoterminaly.html", function(error, response, body) {
		if (error) {
			console.log("error: " + error);
		} else {
			parseData(body);
		}
	});
}

function parseData (body) {
	var $ = cheerio.load(body);
			
	$("table.table tr:not(:first-child)").each(function() {
		queue.push($(this));
		return false;
	});
}

function parseListPointInfo (pointInfoLine) {
	var mapPointId = 0;
	var point = {};
	var tdList = pointInfoLine.find("td");

	point.district = tdList.eq(1).text();
	point.address = tdList.eq(2).text();
	
	var linkTdHtml = tdList.eq(4).html();
	var result = linkTdHtml.match(/<a\s.*href="41.html&amp;ecoboxId=([0-9]+)"/);

	if (result && result[1]) {
		mapPointId = result[1];
		parseMapPointInfo(mapPointId, point);
	} else {
		// baas.add_new_point(point);
	}
}

function parseMapPointInfo (mapPointId, point) {
	// console.info(mapContent);
	// Ищем фотограцию места, если она есть в парметре balloonContent
	//TODO добить регулярку
	pattern = "marks\\[" + mapPointId + "\\]\\s=\\snew\\symaps\\." + 
		"Placemark\\(\\[([0-9\\.]*,[0-9\\.]*)\\],[\\s\\S]*balloonContent:\\s\"<img\\ssrc=\\\"(.*)\\\"\\/>";
	// pattern = /accentMark=\snew\symaps\.Placemark[\s\S]*balloonContent:\s'<p><a\shref="(.*)"\starget/;
	console.info(pattern);
	var regexp = new RegExp(pattern, "m");
	result = mapContent.match(pattern);
	console.info(result[1]);
}
