// Подключаем необходимые модули
var request = require("request");
var cheerio = require("cheerio");
var tress = require("tress");
var baas = require("./scorocode_api.js");
var util = require("./util.js");

var scorocode = baas.get_instance();
const PARSE_URL = util.get_base_url();

// Создаем очередь с задержкой выполнения 1 секунда
var queue = tress(function(job, done) {
	parseMainPointInfo(job);
	// Функция callback
	done();
}, -1000);

queue.drain = function() {
	console.log("Finished!");
	baas.clear_old_data();
};

queue.error = function(err) {
    console.log('Job ' + this + ' failed with error ' + err);
};

queue.success = function(data) {
    // console.log('Job ' + this + ' successfully finished. Result is ' + data);
}

exports.start_parse_shedule = function () {
	// Получаем страницу с табличеым представлением графика стоянок
	request(PARSE_URL + "/grafik-stoyanok.html", function(error, response, body) {
		if (error) {
			console.log("error: " + error);
		} else {
			var $ = cheerio.load(body);
			
			$("table.table tr:not(:first-child)").each(function() {
				queue.push($(this));
				// return false;
			});
		}
	});
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
		point.time_start = util.time_to_seconds(timeStartEnd[0]);
		point.time_end = util.time_to_seconds(timeStartEnd[1]);
	}

	var link = pointInfoLine.find("td:last-child a").attr("href");

	if (link) {
		var arLinkPart = link.split("=");
		mapPointId = arLinkPart[1];
		parseMapPointInfo(mapPointId, point);
	} else {
		baas.add_new_point(point);
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

			if (result && result[1]) {
				var coord = result[1].split(",");
				info.longtitude = parseFloat(coord[0]);
				info.latitude = parseFloat(coord[1]);
			}

			//Ищем фотограцию места, если она есть в парметре balloonContent
			pattern = /accentMark=\snew\symaps\.Placemark[\s\S]*balloonContent:\s'<p><a\shref="(.*)"\starget/;
			result = script.match(pattern);

			if (result) {
				info.photo = PARSE_URL + "/" + result[1];
			}
		}

		baas.add_new_point(info);
	});
}


