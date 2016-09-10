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

// Запускаем парсинг графика стоянок экомобиля
shedule.start_parse_shedule();

// Запускаем парсинг списка стационарных пунктов
stat_point.start_parse_stat_point();

// Запускаем парсинг списка экотерминалов
ecoterm.start_terminal_parse();