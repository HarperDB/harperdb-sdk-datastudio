// HarperDB Data Studio Connector
// main.js: main program components for the Community Connector
// Contributor(s): Aubrey Smith

function getAuthType() {
	// NONE type authentication, because we need to use a custom URL with a
	// Basic Authentication Key, and GDS Authentication methods don't allow for this.
	
	var cc = DataStudioApp.createCommunityConnector();
	return cc.newAuthTypeResponse()
	 .setAuthType(cc.AuthType.NONE)
//	 .setHelpUrl('https://example.org/help-url') // add authentication help URL if needed
	 .build();
}

function isAdminUser() {
	// return true if this is a debug build;
	// return false if this is a release build.
	return true;
}

function getConfig(request) {
	// return value generates a configuration page. this will be in multiple steps.
	// the first step is always to get the user's URL for connecting to the database, and
	//  their Basic Authentication Key. This needs to be checked before proceeding with
	//  the rest of configuration.
	// we may produce multiple versions of this configuration, but for now we're going for
	//  the fewest pages possible. we'll see which method flows best, and go with that one
	//  in the end.
	
	var cc = DataStudioApp.createCommunityConnector();
	var config = cc.getConfig();
	
	// first page info must always be included, because that enables params to be sent
	// to the next step correctly.
	
	// BUILD first page here!
	var cfgUrl = config.newTextInput()
		.setId("url")
		.setName("Web URL")
		.setHelpText("The URL of your HarperDB instance's API gateway")
	//	.setPlaceholder("this should contain a trailing https url for the HarperDB cloud")
	var cfgKey = config.newTextInput()
		.setId("key")
		.setName("Basic Auth Key")
		.setHelpText("The Basic Authorization Key for your read access to the DB")
		.setPlaceholder("dXNlcjpwYXNzd29yZA==") // user:password in base64
	var cfgSecure = config.newCheckbox()
		.setId("secure")
		.setName("Secure Connections Only?")
		.setHelpText("If checked, only HTTPS connections will be made to the server.")
	var cfgBadCert = config.newCheckbox()
		.setId("badCert")
		.setName("Allow Bad Certs?")
		.setHelpText("If checked, HTTPS connections will work even for unverifiable certificates.")
	var cfgQueryType = config.newSelectSingle()
		.setId("queryType")
		.setName("Query Type")
		.setHelpText("Either Schema.Table for simple SELECT * on that table, or SQL for freeform")
		.addOption(config.newOptionBuilder()
			.setLabel("SQL")
			.setValue("SQL"))
		.addOption(config.newOptionBuilder()
			.setLabel("Table")
			.setValue("TABLE"))
		.setIsDynamic(true); // this acts as a cutoff, resetting anything after it
				// and deleting it from the UI until user presses "next" button
	
	if(!('configParams' in request) || !request.configParams.queryType) {
		// first page, nothing more to build.
		// second check above is in case the user changed something that wiped out
		//  the query type.
		config.setIsSteppedConfig(true);
		// reset UserProperties for this data source; they will be set on auth.
		var userp = PropertiesService.getUserProperties();
		userp.deleteAllProperties();
		// also clear the cache, in case anything is left there from previous usage of
		//  this connector instance.
		var cache = CacheService.getUserCache();
		cache.removeAll(["schema", "data", "ldata"])
		// NOTE: if this connector uses new cache keys, add them to the above list!
		
		// send config to the UI.
		return config.build();
	} else {
		// test that user authorization is working!
		var cfgp = request.configParams;
		var schemasJson = hdbDescribeAll(cfgp); // get data on all schemas
		// if the above function throws an error, the error will flow through to GDS.
		
		// if the authorization works, use the response to queryType to determine which
		//  page we display to the user.
		if(cfgp.queryType == "SQL") {
			// add a field for SQL query
			var cfgSql = config.newTextInput()
				.setId("sql")
				.setName("SQL Query")
				.setHelpText("The SQL Query to HarperDB")
				.setPlaceholder("SELECT ...");
			config.setIsSteppedConfig(false);
			return config.build();
		} else if(cfgp.queryType == "TABLE") {
			// add two fields, one for Schema and one for Table.
			var cfgSchema = config.newTextInput()
				.setId("schema")
				.setName("Schema")
				.setHelpText("The HarperDB Schema (not Data Studio Schema)")
				.setPlaceholder("dev");
			// Q: should we offer a drop-down Schema instead of text entry?
			var cfgTable = config.newTextInput()
				.setId("table")
				.setName("Table")
				.setHelpText("The Table to SELECT * from in this Schema");
			// Q: should we make an additional step to configuration here, where Schema
			//  choice determines which one we Describe Schema from.
			//  (this would use the describe_schema operation rather than an SQL query)
			config.setIsSteppedConfig(false);
			return config.build();
		} else {
			// illegal queryType!
			cc.newUserError()
				.setText("Illegal Query Type! Type must be SQL or Schema.Table.")
				.setDebugText("Received queryType = " + cfgp.queryType)
				.throwException();
		}
	}
}

function getSchema(request) {
	// return value gives the basic Schema as generated from the SQL query the connector
	//  needs to perform. Schema will set all fields as dimensions, and set an additional
	//  "Record Count" field as a metric. Users can treat any dimension as a metric in
	//  their reports as of October 2019.
	// Data types are determined using the first 100 rows of data from the query
	//  (automatically reduced using LIMIT)
	
	var schema;
	
	var cache = CacheService.getUserCache();
	var cgfp = request.configParams;
	var userp = PropertiesService.getUserProperties();
	var sql = userp.getProperty("sql");
	
	if(!sql) {
		if(cfgp.sql) {
			sql = sqlStrip(cfgp.sql);
		} else {
			// construct sql from schema and table pair
			sql = "SELECT * FROM `" + cfgp.schema + "`.`" + cfgp.table + "`";
		}
		userp.setProperty("sql", sql);
	}
	
	// set LIMIT clause to 100, if existing clause is greater than 100 or not found.
	if(!userp.getProperty("sqlLimited")) {
		let o = {};
		let lsql = sqlLimit(sql, 100, o);
		if(o.nochange) {
			userp.setProperty("sqlLimited", true);
		} else {
			sql = lsql;
		}
	}
	
	// run the query on HarperDB, or get cached result of previous query,
	//  and search through the resulting data
	var data = cache.get("ldata");
	if(data == null) {
		data = hdbSqlQuery(sql, cfgp);
	}
	var fields = []; // the schema fields, in order, in a simpler format
	var findex = {}; // the schema field indexes, by name
	
	// loop to build fields and index them
	
	for(let i=0; i<data.length; i++) {
		// we can use data.length because HarperDB always returns an array unless there
		//  is an error.
		let r = data[i]; // extract record
		for(k in r) {
			// extract each key from the record
			let t = null;
			if(k in findex) {
				// retrieve currently derived type from fields
				t = fields[findex[k]].type;
			}
			if(t == "string") {
				continue; // string is a catch-all and flattens all other types
			}
			if(r[k] == null) {
				continue; // null values do not affect types
			}
			if(typeof r[k] == "number") {
				if(t && t != "number") {
					t = "string";
				} else {
					t = "number";
				}
			} else if(typeof r[k] == "boolean") {
				if(t && t != "boolean") {
					t = "string";
				} else {
					t = "boolean";
				}
			} else if(typeof r[k] == "string") {
				t == "string"; // we assume AppsScript can autodetect string semantics.
			} else if(typeof r[k] == "object") {
				// non-null object
				if(Array.isArray(r[k])) {
					// array containing multiple records
					// TODO: add a capture for this! effectively this is recursive.
					//  for now, this is an error.
					cc.newUserError()
						.setText('Query returned field "' + k
						  + '" which contains an Array; not yet supported')
						.throwException();
				} else if(r[k].type == "Feature" && r[k].geometry != null
						 && typeof r[k].geometry == "object") {
						if(r[k].geometry.type == "Point") {
							// GeoJSON detected of type "Point"
							if(t && t != "geojson-point") {
								t = "string";
							} else {
								t = "geojson-point";
							}
							// TODO: add other varieties of GeoJSON object capture here
						} else {
							cc.newUserError()
								.setText('Query returned field "' + k
								  + '" which contains an unsupported GeoJSON geometry type "'
								  + r[k].geometry.type + '"')
								.throwException();
						}
					
				} else if(r[k].type == "FeatureCollection" && Array.isArray(r[k].features)) {
					// TODO: support GeoJSON FeatureCollections, using a modified form of
					//  the multiple record handling for Arrays.
					cc.newUserError()
						.setText('Query returned field "' + k
						  + '" which contains a GeoJSON FeatureCollection; not yet supported')
						.throwException();
				} else {
					// TODO: implement support for objects contained in a record.
					//  effectively this is a single record version of the Array capture,
					//  so it requires a recursive function.
					//  for now, this is an error.
					cc.newUserError()
						.setText('Query returned field "' + k
						  + '" which contains a raw object record; not yet supported')
						.throwException();
				}
			}
			// apply type to fields record
			if(k in findex) {
				if(t != null && t != fields[findex[k]].type) {
					fields[findex[k]].type = t;
				}
			} else {
				// add new field
				fields.push({
					name: k,
					type: t,
					path: "/" + k // TODO: use jsonPtrConstruct() for deep keys
				});
				findex[k] = fields.length - 1; // TODO: handle insertions for deep keys
			}
		}
	}
	
	schema = [];
	
	// loop to form schema from fields
	for(let i=0; i<fields.length; i++) {
		let s = {
			name: fields[i].name,
			label: fields[i].name,
			// TODO: define group for data contained inside a field of the JSON response
			semantics: {
				conceptType: "DIMENSION" // all returned fields are dimensions
			}
		};
		switch(fields[i].type) {
		 case null:
			fields[i].type = "string"; // default to string type for all nulls
		 case "string":
		 	s.dataType = "STRING";
		 	break;
		 case "number":
		 	s.dataType = "NUMBER";
		 	break;
		 case "boolean":
		 	s.dataType = "BOOLEAN";
		 	break;
		 case "geojson-point":
		 	// will be converted to a string with "Lat, Long" coordinates.
		 	s.dataType = "STRING";
		 	s.semantics.semanticType = "LATITUDE_LONGITUDE";
		 	break
		 default:
		 	// error
		 	cc.newUserError()
		 		.setText('Schema detection produced illegal type')
		 		.setDebugText('This message should never appear! illegal type was "'
		 			+ fields[i].type + '"')
		 		.throwException();
		}
		schema.push(s);
	}
	// finally, add the field for "Record Count", a metric most users will want.
	schema.push({
		name: "Record Count",
		label: "Record Count",
		dataType: "NUMBER",
		semantics: {
			conceptType: "METRIC",
			semanticType: "NUMBER"
		}
	});
	
	// store simple fields information to pair with the GDS schema
	userp.setProperty("fields", fields);
	userp.setProperty("findex", findex);
	
	// insert schema into properties field; more stable than cache.
	userp.setProperty("schema", schema);
	
	// cache data from our query; getData can re-use it for semantic type detection.
	cache.put("ldata", data, 300);
	
	// return the schema to the requester
	return { "schema": schema };
}

function getData(request) {
	// return value produces JSON in a format Data Studio understands.
	// perform the SQL query, and transform the resulting data.
	
	// Make sure to check for a cached result, because GDS has a 20 field limit,
	//  and we may produce far more fields than we can actually provide.
	// Also note that the max records returned by this function to GDS is 1 million.
	
	var cache = CacheService.getUserCache();
	
	var cgfp = request.configParams;
	var userp = PropertiesService.getUserProperties();
	var sql = userp.getProperty("sql");
	
	var data; // data to receive from cache or from a new HarperDB query
	if(request.scriptParams.sampleExtraction) {
		// this is semantic type detection, so we only need 100 records
		data = cache.get("ldata");
		if(data == null) {
			// ensure sql contains limit 100
			if(!userp.getProperty("sqlLimited")) {
				sql = sqlLimit(sql, 100);
			}
		}
	} else {
		data = cache.get("data");
	}
	if(data == null) {
		// fetch data from HarperDB
		data = hdbSqlQuery(sql, cfgp);
	}
	
	// fetch the schema properties we need
	var fields = userp.getProperty("fields");
	var findex = userp.getProperty("findex");
	var schema = userp.getProperty("schema");
	// and retrieve the set of fields the request wants.
	var fetch = request.fields;
	var gdata = [];
	var gschema = [];
	
	// produce GDS schema for only the requested fields.
	for(let i=0; i<fetch.length; i++) {
		if(fetch[i].name == "Record Count") {
			// fetch the Record Count metric, which is always at the end.
			gschema.push(schema[schema.length-1]);
		} else {
			// get the name from the requested field, then get the index in the schema
			//  list for that name. use that to retrieve the field data from the schema.
			gschema.push(schema[findex[fetch[i].name]]);
		}
	}
	
	// loop through data records, and transform data for each field in the request.
	let rmax = 1000000; // GDS maximum records returnable is 1 million
	if(data.length < rmax) {
		rmax = data.length;
	}
	for(let i=0; i<rmax; i++) {
		let values = [];
		gdata.push({"values": values});
		for(let j=0; j<fetch.length; j++) {
			// transform data in each field
			let f;
			if(fetch[j].name == "Record Count") {
				// Record Count is always 1 for every row (sum it!)
				values.push(1);
				continue;
			} else {
				f = fields[findex[fetch[j].name]];
			}
			let val = jsonPtrQuery(data[i], f.path);
			if(f.type == "geojson-point" || (f.type == "string" && val != null
			  && typeof val == "object" && val.type == "Feature"
			  && val.geometry != null && typeof val.geometry == "object"
			  && val.geometry.type == "Point")) {
				// detected a Point;
				// extract Lat,Long from Point and join
				let coord = val.geometry.coordinates;
				val = coord.join(', ');
			}
			values.push(val);
		}
		// TODO: add method for handling multi-row values
	}
	
	// cache data.
	if(request.scriptParams.sampleExtraction) {
		cache.put("ldata", data);
	} else {
		cache.put("data", data);
	}
	
	// return result to requester
	return {
		"schema": gschema,
		"rows": gdata
	};
}
