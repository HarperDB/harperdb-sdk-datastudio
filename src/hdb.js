// HarperDB Data Studio Connector
// hdb.js: HarperDB operations and helper functions
// Contributor(s): Aubrey Smith

function urlForHDB(cfgp) {
	// takes the configuration parameters for the current GDS operation.
	// returns the URL to use for HarperDB access
	// will add the URL to the UserProperties store if it is not saved there already.
	
	var userp = PropertiesService.getUserProperties();
	var url = userp.getProperty("url");
	
	if(url == null) {
		// url not currently defined; get it from config params
		url = cfgp.url;
		if(url == null) {
			// error
			cc.newUserError()
				.setText("URL not defined, cannot access HarperDB")
				.setDebugText("This message should never appear!")
				.throwException();
		}
		if(typeof url != "string") {
			// error
			cc.newUserError()
				.setText('URL is not of type "string", cannot access HarperDB')
				.setDebugText("This message should never appear!")
				.throwException();
		}
		
		url = url.trim(); // remove whitespace from both ends
		var urlScheme = /^[a-z][a-z+.-]*:/;
		if(url.search(urlScheme)) { // if the URL starts with a scheme
			if(!url.startsWith("http://") && !url.startsWith("https://")) {
				// and that scheme is neither http nor https, error!
				cc.newUserError()
					.setText('URL uses bad protocol, you must use either http or https!')
					.setDebugText('URL used bad scheme "' + url.match(urlScheme)[0] + '"')
					.throwException();
			}
			// otherwise, transform http into https if we want to use only secure mode
			if(cfgp.secure && url.startsWith("http://")) {
				url = "https://" + url.slice(7);
			}
		} else { // if URL is does not contain a scheme,
			if(cfgp.secure) { // if we're in secure connections only
				url = "https://" + url; // add https
			} else {
				url = "http://" + url; // just add http instead
			}
		}
		
		userp.setProperty("url", url); // save our URL for later use.
	}
	// note that if the URL is already defined in config params, then we just use the
	// saved URL instead of going through this whole process.
	
	return url;
}

function authForHDB(cfgp) {
	// takes the configuration parameters for the current GDS operation.
	// returns the Basic Auth token to use for HarperDB access
	// will add the token (including the word "Basic") to the UserProperties store if it
	//  is not saved there already.
	
	var userp = PropertiesService.getUserProperties();
	var auth = userp.getProperty("auth");
	
	if(auth == null) {
		// auth token not currently defined; get it from config params
		auth = cfgp.key;
		if(auth == null) {
			// error
			cc.newUserError()
				.setText("Auth key not defined, cannot access HarperDB")
				.setDebugText("This message should never appear!")
				.throwException();
		}
		if(typeof auth != "string") {
			// error
			cc.newUserError()
				.setText('Auth key is not of type "string", cannot access HarperDB')
				.setDebugText("This message should never appear!")
				.throwException();
		}
		
		auth = auth.trim(); // remove whitespace from both ends
		
		if(!auth.startsWith("Basic ")) {
			// add that word, HarperDB needs it!
			auth = "Basic " + auth;
		}
		
		userp.setProperty("auth", auth); // save our auth token key for later use.
	}
	// note that if the token is already defined in config params, then we just use the
	// saved auth token instead of going through this whole process.
	
	return auth;
}

function hdbHttpRequest(url, auth, body) {
	// takes a URL, Auth Key, and JSON body to send to HarperDB in a POST request.
	// returns the body of the request.
	
	var opt = {
		"method": "post",
		"contentType": "application/json",
		"headers": {
			"Authorization": auth
		},
		"muteHttpExceptions": true, // prevent GDS sending default errors on 400/500
		"payload": JSON.stringify(body)
	}
	if(cfgp.badCert) {
		// user checked the "Allow Bad Certs?" box.
		// need to change this from default "true" to allow self-signed certs etc.
		opt.validateHttpsCertificates = false;
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
	
	if(code == 200) {
		return; // no error, no problem.
	}
	
	// otherwise, we need to handle the error.
	switch (code) {
	 // NOTE: if needed by spec, add more specific responses.
	 //  For now we only have the default!
	 default:
	 	// output the error we received from HarperDB's response.
	 	let j = r.getContentText();
	 	let d = JSON.parse(j);
	 	let e;
	 	if("error" in d) {
	 		e = d.error; // HDB default error codes are text in this key.
	 	} else {
	 		e = r.getContentText(); // just in case a non-standard error appears!
	 	}
		cc.newUserError()
			.setText('HarperDB response ' + code
				+ '; error text "' + '"')
			.throwException();
	}
	return; // this should never be reached.
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
	}
	
	var r = hdbHttpRequest(url, auth, body);
	return JSON.parse(r.getContentText);
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
	}
	
	var r = hdbHttpRequest(url, auth, body);
	return JSON.parse(r.getContentText);
}
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
	}
	
	var r = hdbHttpRequest(url, auth, body);
	return JSON.parse(r.getContentText);
}
