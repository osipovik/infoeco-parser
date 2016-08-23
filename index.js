var request = require("request");
var jsdom = require("jsdom");
var cheerio = require("cheerio");
var mapPageSource = "";

jsdom.env({
	url: "http://ecomobile.infoeco.ru/grafik-stoyanok.html",
	scripts: ["http://code.jquery.com/jquery.js"],
	done: function(err, window) {
		var $ = window.$;

		$("table.table tr:not(:first-child)").each(function() {
			var tdString = "";
			var mapPointId = 0;

			$(this).find("td:not(:last-child)").each(function() {
				tdString += $(this).text() + " | ";
			});

			var link = $(this).find("td:last-child a").attr("href");

			if (link) {
				var arLinkPart = link.split("=");
				mapPointId = arLinkPart[1];
				// console.log(tdString + mapPointId);

				setTimeout(getMapPointInfo(mapPointId), 1000);
			}
		});
	}
});

function getMapPointInfo(mapPointId) {
	var url = "http://ecomobile.infoeco.ru/34.html&datePointId=" + mapPointId;

	request(url, function(error, response, body) {
		if (error) {
			console.log("error: " + error);
		} else {
			var $ = cheerio.load(body);

			var script = $("script").text();
			var pattern =  new RegExp("marks\\['month'\\]\\[" + mapPointId + "\\]\\s=\\snew\\symaps\\.Placemark\\(\\[(.*)\\]");
			var result = script.match(pattern);

			if (result) {
				console.info(mapPointId + " - " + result[1]);
			} else {
				console.info(mapPointId);
			}
		}
	});
}