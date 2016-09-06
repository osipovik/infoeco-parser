// константа - адрес сайта. с которого берем информацию
const PARSE_URL = "http://ecomobile.infoeco.ru";

exports.get_base_url = function () {
	return PARSE_URL;
}

exports.time_to_seconds = function (time) {
	var arTime = time.split(".");
	return (((parseInt(arTime[0]) * 60) + parseInt(arTime[1])) * 60);
}