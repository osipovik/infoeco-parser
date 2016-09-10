// Подключаем необходимые модули
var shedule = require("./ecomobile_shedule_parser.js");
var stat_point = require("./stat_point_parser.js");
var ecoterm = require("./terminal_parser.js");

// Запускаем парсинг графика стоянок экомобиля
// shedule.start_parse_shedule();

// Запускаем парсинг списка стационарных пунктов
// stat_point.start_parse_stat_point();

// Запускаем парсинг списка экотерминалов
ecoterm.start_terminal_parse();