// HarperDB Data Studio Connector
// hdb.js: HarperDB operations and helper functions
// Contributor(s): Aubrey Smith

function urlForHDB(userp) {
	// takes the configuration parameters for the current GDS operation.
	// returns the URL to use for HarperDB access
	var cc = DataStudioApp.createCommunityConnector();
	var url = userp.getProperty('dscc.path');

	if(!url.trim().match(/(https?:\/\/.*):?(\d*)?\/?(.*)/g)) {
		// error
		cc.newUserError()
		.setText('Invalid URL. Please provide a valid URL to a running HarperDB instance.')
		.setDebugText("Please provide a valid URL to a running HarperDB instance.")
		.throwException();
	}

	return url.trim();
}

function authForHDB(userp) {
	var cc = DataStudioApp.createCommunityConnector();
	var username = userp.getProperty('dscc.username');
	var password = userp.getProperty('dscc.password');

	if(!username) {
		// error
		cc.newUserError()
		.setText("Please provide a valid HarperDB user")
		.throwException();
	}

	if (!password) {
		// error
		cc.newUserError()
		.setText("Please provide a valid HarperDB password")
		.throwException();
	}

	var encodedUserPass = Utilities.base64Encode(username + ':' + password);
	var auth = "Basic " + encodedUserPass;

	return auth;
}

function hdbHttpRequest(url, auth, body) {
	// takes the config params for the connector, the URL, Auth Key,
	// and JSON body to send to HarperDB in a POST request.
	// returns the body of the request.

	var opt = {
		"method": "post",
		"contentType": "application/json",
		"headers": {
			"Authorization": auth
		},
		"muteHttpExceptions": true, // prevent GDS sending default errors on 400/500
		"payload": JSON.stringify(body),
		"validateHttpsCertificates": false
	}

	// perform the request
	var r = UrlFetchApp.fetch(url, opt);
	hdbHandleError(r);

	return r;
}

function hdbHandleError(r) {
	// takes r, a response from UrlFetchApp (in HTTPResponse form)
	// returns nothing
	// will throw a user error to GDS if the response code is not 200.
	var code = r.getResponseCode();

	if(code === 200) {
		return; // no error, no problem.
	}

	// otherwise, we need to handle the error.
	let j = r.getContentText();
	let d;
	try {
		d = JSON.parse(j);
	} catch (e) {
		// contents are not valid JSON; we'll grab the entire text instead.
		d = {};
	}
	let e;
	if("error" in d) {
		e = d.error; // HDB default error codes are text in this key.
	} else {
		e = r.getContentText(); // just in case a non-standard error appears!
	}
	throw new Error(code + ': "' + e + '"')
}

function hdbSqlQuery(sql, userp) {
	// takes an SQL query, and the configParams from the current GDS operation.
	// performs an SQL query on the remote HarperDB instance.
	// returns the JSON output from HarperDB as an object.

	var url = urlForHDB(userp);
	var auth = authForHDB(userp);

	// form the request
	var body = {
		"operation": "sql",
		"sql": sql
	};

	var r = hdbHttpRequest(url, auth, body);
	return JSON.parse(r.getContentText());
}

function hdbDescribeSchema(schema, userp) {
	// takes a schema name, and the configParams from the current GDS operation.
	// performs a Describe Schema operation on HarperDB
	// returns the JSON output from HarperDB as an object.

	var url = urlForHDB(userp);
	var auth = authForHDB(userp);

	// form the request
	var body = {
		"operation": "describe_schema",
		"schema": schema
	};

	var r = hdbHttpRequest(url, auth, body);
	return JSON.parse(r.getContentText());
}

function hdbDescribeTable(schema, table, userp) {
	// takes a schema name, a table name,
	//  and the configParams from the current GDS operation.
	// performs a Describe Schema operation on HarperDB
	// returns the JSON output from HarperDB as an object.

	var url = urlForHDB(userp);
	var auth = authForHDB(userp);

	// form the request
	var body = {
		"operation": "describe_table",
		"schema": schema,
		"table": table
	};

	var r = hdbHttpRequest(url, auth, body);
	return JSON.parse(r.getContentText());
}

function hdbDescribeAll(userp) {
	// takes the configParams from the current GDS operation.
	// performs a Describe All operation on HarperDB
	// returns the JSON output from HarperDB as an object.

	var url = urlForHDB(userp);
	var auth = authForHDB(userp);

	// form the request
	var body = {
		"operation": "describe_all"
	}

	var r = hdbHttpRequest(url, auth, body);
	return JSON.parse(r.getContentText());
}
