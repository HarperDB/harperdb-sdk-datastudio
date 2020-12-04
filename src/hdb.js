// HarperDB Data Studio Connector
// hdb.js: HarperDB operations and helper functions
// Contributor(s): Aubrey Smith

function urlForHDB(cfgp) {
	// takes the configuration parameters for the current GDS operation.
	// returns the URL to use for HarperDB access
	var cc = DataStudioApp.createCommunityConnector();
	var url = cfgp.url;

	if(!url.trim().match(/(https?:\/\/.*):?(\d*)?\/?(.*)/g)) {
		// error
		cc.newUserError()
		.setText('Invalid URL. Please provide a valid URL to a running HarperDB instance.')
		.setDebugText("Please provide a valid URL to a running HarperDB instance.")
		.throwException();
	}

	return url.trim();
}

function authForHDB(cfgp) {
	var cc = DataStudioApp.createCommunityConnector();
	var username = cfgp.username;
	var password = cfgp.password;

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

	var encodedUserPass = Utilities.base64Encode(username + ':'+ password);
	var auth = "Basic " + encodedUserPass;

	return auth;
}

function hdbHttpRequest(cfgp, url, auth, body) {
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
	var cc = DataStudioApp.createCommunityConnector();
	var code = r.getResponseCode();

	if(code === 200) {
		return; // no error, no problem.
	}

	// otherwise, we need to handle the error.
	let j = r.getContentText();
	let d = JSON.parse(j);
	let e;
	if("error" in d) {
		e = d.error; // HDB default error codes are text in this key.
	} else {
		e = r.getContentText(); // just in case a non-standard error appears!
	}
	cc.newUserError()
	.setText(code + ': "' + e + '"')
	.throwException();
}

function hdbSqlQuery(sql, cfgp) {
	// takes an SQL query, and the configParams from the current GDS operation.
	// performs an SQL query on the remote HarperDB instance.
	// returns the JSON output from HarperDB as an object.

	var url = urlForHDB(cfgp);
	var auth = authForHDB(cfgp);

	// form the request
	var body = {
		"operation": "sql",
		"sql": sql
	};

	var r = hdbHttpRequest(cfgp, url, auth, body);
	return JSON.parse(r.getContentText());
}

function hdbDescribeSchema(schema, cfgp) {
	// takes a schema name, and the configParams from the current GDS operation.
	// performs a Describe Schema operation on HarperDB
	// returns the JSON output from HarperDB as an object.

	var url = urlForHDB(cfgp);
	var auth = authForHDB(cfgp);

	// form the request
	var body = {
		"operation": "describe_schema",
		"schema": schema
	};

	var r = hdbHttpRequest(cfgp, url, auth, body);
	return JSON.parse(r.getContentText());
}

function hdbDescribeTable(schema, table, cfgp) {
	// takes a schema name, a table name,
	//  and the configParams from the current GDS operation.
	// performs a Describe Schema operation on HarperDB
	// returns the JSON output from HarperDB as an object.

	var url = urlForHDB(cfgp);
	var auth = authForHDB(cfgp);

	// form the request
	var body = {
		"operation": "describe_table",
		"schema": schema,
		"table": table
	};

	var r = hdbHttpRequest(cfgp, url, auth, body);
	return JSON.parse(r.getContentText());
}

function hdbDescribeAll(cfgp) {
	// takes the configParams from the current GDS operation.
	// performs a Describe All operation on HarperDB
	// returns the JSON output from HarperDB as an object.

	var url = urlForHDB(cfgp);
	var auth = authForHDB(cfgp);

	// form the request
	var body = {
		"operation": "describe_all"
	}

	var r = hdbHttpRequest(cfgp, url, auth, body);
	return JSON.parse(r.getContentText());
}
