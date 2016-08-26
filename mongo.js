var mongoClient = require("mongodb").MongoClient;
var assert = require("assert");

var url = "mongodb://localhost:27017/myproject";

mongoClient.connect(url, function(err,db) {
	assert.equal(null, err);
	console.log("Connnected successfully to server!");

	findDocuments(db, function() {
		db.close();
	});

	// insertDocuments(db, function() {
		
	// });
});

var insertDocuments = function(db, callback) {
	//Get the "dosuments" collection
	var  collection = db.collection("documents");
	//Insert some documents
	collection.insertMany([
		{a: 1}, {a: 2}, {a: 3}
	], function(err, result) {
		assert.equal(err, null);
		assert.equal(3, result.result.n);
		assert.equal(3, result.ops.length);
		console.log("Insertes 3 documents intothe collection");

		callback(result);
	});
};

var findDocuments = function(db, callback) {
	//Get the "dosuments" collection
	var collection = db.collection("documents");
	//Find some documents
	collection.find().toArray(function(err, docs) {
		assert.equal(err, null);

		console.log("Found the following records");
		console.log(docs);

		callback(docs);
	});
};