var request = require("request");
var cheerio = require("cheerio");
var tress = require("tress");

//Создаем очередь с задержкой выполнения 1 секунда
var queue = tress(function(pointId, callback) {
	console.log('id = ' + pointId);
	getMapPointInfo(pointId);
}, -100);

queue.drain = function(){
    console.log('Finished');
};

queue.error = function(err) {
    console.log('Job ' + this + ' failed with error ' + err);
};

queue.success = function(data) {
    console.log('Job ' + this + ' successfully finished. Result is ' + data);
}

//Получаем страницу с табличеым представлением графика стоянок
request("http://ecomobile.infoeco.ru/grafik-stoyanok.html", function(error, response, body) {
	if (error) {
		console.log("error: " + error);
	} else {
		var $ = cheerio.load(body);

		$("table.table tr:not(:first-child)").each(function() {
			var tdString = "";
			var mapPointId = 0;
			var point = {};

			// $(this).find("td:not(:last-child)").each(function(index) {
			// 	tdString += $(this).text() + " | ";
			// });

			var tdList = $(this).find("td");
			tdString += tdList.eq(0).text() + " | ";
			tdString += tdList.eq(1).text() + " | ";
			tdString += tdList.eq(2).text() + " | ";
			tdString += tdList.eq(3).text() + " | ";

			var link = $(this).find("td:last-child a").attr("href");

			if (link) {
				var arLinkPart = link.split("=");
				mapPointId = arLinkPart[1];
				tdString += mapPointId;
				//TODO реализовать очередь, с паузой при выполнении
				// setTimeout(getMapPointInfo(mapPointId), 1000);
			}

			console.log(tdString);

			// return false;
		});

		// console.log(queue.waiting);
	}
});

function getMapPointInfo(mapPointId) {
	var url = "http://ecomobile.infoeco.ru/34.html&datePointId=" + mapPointId;
	var coord = [];

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
				coord = result[1].split(",");
				console.info(mapPointId + " - " + result[1]);
				console.info(coord);
			} else {
				console.info(mapPointId);
			}

			//Ищем фотограцию места, если она есть в парметре balloonContent
			pattern = /accentMark=\snew\symaps\.Placemark[\s\S]*balloonContent:\s'<p><a\shref="(.*)"\starget/;
			result = script.match(pattern);

			if (result) {
				console.info(result[1]);
			}
		}
	});
}