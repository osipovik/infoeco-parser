// Подключаем необходимые модули
var request = require("request");
var cheerio = require("cheerio");
var baas = require("./scorocode_api.js");
var shedule = require("./ecomobile_shedule_parser.js");
var stat_point = require("./stat_point_parser.js");
var ecoterm = require("./terminal_parser.js");
var util = require("./util.js");

var scorocode = baas.get_instance();

// константа - адрес сайта. с которого берем информацию
const PARSE_URL = util.get_base_url();

// // Получаем страницу с табличеым представлением графика стоянок
// request(PARSE_URL + "/grafik-stoyanok.html", function(error, response, body) {
// 	if (error) {
// 		console.log("error: " + error);
// 	} else {
// 		// Чистим старые данные
// 		shedule.remove_old_data(body);
// 	}
// });

// // Получаем страницу с картой точек стоянок
// request(PARSE_URL + "/34.html", function(error, response, body) {
// 	if (error) {
// 		console.error("error: " + error);
// 	} else {
// 		stat_point.remove_old_data(body);
// 	}
// });

ecoterm.start_terminal_parse();