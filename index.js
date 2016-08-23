var request = require("request");
var jsdom = require("jsdom");
var cheerio = require("cheerio");
var mapPageSource = "";

//TODO перевести на использование request+cheerio
jsdom.env({
	url: "http://ecomobile.infoeco.ru/grafik-stoyanok.html",
	scripts: ["http://code.jquery.com/jquery.js"],
	done: function(err, window) {
		var $ = window.$;

		$("table.table tr:not(:first-child)").each(function() {
			var tdString = "";
			var mapPointId = 0;
			var exit = false;

			$(this).find("td:not(:last-child)").each(function() {
				tdString += $(this).text() + " | ";
			});

			var link = $(this).find("td:last-child a").attr("href");

			if (link) {
				var arLinkPart = link.split("=");
				mapPointId = arLinkPart[1];
				// console.log(tdString + mapPointId);
				//TODO реализовать очередь, с паузой при выполнении
				setTimeout(getMapPointInfo(mapPointId), 1000);
			}

			return false;
		});
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
			// var pattern =  new RegExp("marks\\['month'\\]\\[" + mapPointId + "\\]\\s=\\snew\\symaps\\.Placemark\\(\\[(.*)\\]");
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
				return true;
			}
		}
	});
}