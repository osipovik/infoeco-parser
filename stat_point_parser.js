// Подключаем необходимые модули
var request = require("request");
var cheerio = require("cheerio");
var baas = require("./scorocode_api.js");
var util = require("./util.js");

var scorocode = baas.get_instance();
var mapContent;

const PARSE_URL = util.get_base_url();

// Чистим старые данные о стационарных пунктах
exports.remove_old_data = function (body) {
	$ = cheerio.load(body);
	mapContent = $("script").text();

	var queryItems = new scorocode.Query("points");

	queryItems
		.doesNotExist("date")
		.equalTo("time_start", 36000)
		.equalTo("time_end", 72000)
		.find()
		.then((finded) => {
			// console.info(finded);
			queryItems.remove(finded)
				.then((removed) => {
					console.log(removed);
					getStatMapPointInfo();
				})
				.catch((error) => {
					console.error("Что-то пошло не так: \n", error);
				});
		})
		.catch((error) => {
            console.error("Что-то пошло не так: \n", error)
        });
}

// Обрабатывает список стационарных пунктов приема
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

				pointInfo.time_start = util.time_to_seconds(arTime[1]);
				pointInfo.time_end = util.time_to_seconds(arTime[2]);

				var statPointInfoHtml = ddItem.html();
				var result = statPointInfoHtml.match(/<a\shref=".+statPointId=([0-9]+)"/);
				var mapPointId = result[1];

				var pattern = "marks\\['stat'\\]\\[" + mapPointId + 
					"\\]\\s=\\snew\\symaps\\.Placemark\\(\\[([0-9\\.]*,[0-9\\.]*)\\],";
				var result = mapContent.match(pattern);

				if (result) {
					pointInfo.coord = result[1].split(",");
				}

				// Ищем фотограцию места, если она есть в парметре balloonContent
				pattern = "marks\\['stat'\\]\\[" + mapPointId + 
					"\\]\\s=\\snew\\symaps\\.Placemark[\\s\\S]*balloonContent:\\s'<p><a\\shref=\"(.*)\"\\starget";
				// pattern = /accentMark=\snew\symaps\.Placemark[\s\S]*balloonContent:\s'<p><a\shref="(.*)"\starget/;
				result = mapContent.match(pattern);

				if (result) {
					pointInfo.photo = PARSE_URL + "/" + result[1];
				}
				console.log(pointInfo);

				baas.add_new_point(pointInfo);

				// return false;
			});
		}
	});
}

