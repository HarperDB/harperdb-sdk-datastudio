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
		.setID("url")
		.setName("Web URL")
		.setHelpText("The URL of your HarperDB instance's API gateway")
	//	.setPlaceholder("this should contain a trailing https url for the HarperDB cloud")
		.setIsDynamic(true);
	var cfgKey = config.newTextInput()
		.setID("key")
		.setName("Basic Auth Key")
		.setHelpText("The Basic Authorization Key for your read access to the DB")
		.setPlaceholder("r9UzYUgX99PRpWcp50t4t8AAFA==") // random data, not a usable key
		.setIsDynamic(true);
	var cfgQueryType = config.newSelectSingle()
		.setID("queryType")
		.setName("Query Type")
		.setHelpText("Either Schema.Table for simple SELECT * on that table, or SQL for freeform")
		.addOption(config.newOptionBuilder()
			.setLabel("SQL")
			.setValue("SQL"))
		.addOption(config.newOptionBuilder()
			.setLabel("Table")
			.setValue("TABLE"));
		.setIsDynamic(true);
	var cfgSecure = config.newCheckbox()
		.setID("secure")
		.setName("Secure Connections Only?")
		.setHelpText("If checked, only HTTPS connections will be made to the server.")
		.setIsDynamic(true);
	var cfgBadCert = config.newCheckbox()
		.setID("badCert")
		.setName("Allow Bad Certs?")
		.setHelpText("If checked, HTTPS connections will work even for unverifiable certificates.")
		.setIsDynamic(true);
	
	if(!('configParams' in request) || !request.configParams.queryType) {
		// first page, nothing more to build.
		// second check above is in case the user changed something that wiped out
		//  the query type.
		config.setIsSteppedConfig(true);
		// reset UserProperties for this data source; they will be set on auth.
		var userp = PropertiesService.getUserProperties();
		userp.deleteAllProperties();
		// send config to the UI.
		return config.build();
	} else {
		// test that user authorization is working!
		var cfgp = request.configParams;
		var schemasJson = hdbSqlQuery("SHOW SCHEMAS",cfgp);
		// if the above function throws an error, the error will flow through to GDS.
		
		// if the authorization works, use the response to queryType to determine which
		//  page we display to the user.
		if(cfgp.queryType == "SQL") {
			// add a field for SQL query
			var cfgSql = config.newTextInput()
				.setID("sql")
				.setName("SQL Query")
				.setHelpText("The SQL Query to HarperDB")
				.setPlaceholder("SELECT ...");
			config.setIsSteppedConfig(false);
			return config.build();
		} else if(cfgp.queryType == "TABLE") {
			// add two fields, one for Schema and one for Table.
			var cfgSchema = config.newTextInput()
				.setID("schema")
				.setName("Schema")
				.setHelpText("The HarperDB Schema (not Data Studio Schema)")
				.setPlaceholder("dev");
			// Q: should we offer a drop-down Schema instead of text entry?
			var cfgTable = config.newTextInput()
				.setID("table")
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
	
	// stub
}

function getSchema(request) {
	// return value gives the basic Schema as generated from the SQL query the connector
	//  needs to perform. Schema will automatically determine which fields are dimensions
	//  and which are metrics from the SQL query itself.
	// Data types are determined using the first 100 rows of data from the query
	//  (automatically reduced using LIMIT)
	// Note that complex data types need to be flattened for the schema, so the rows that
	//  the SQL query produces may not match the names and number of fields in the GDS
	//  version of the schema.
	
	// all non-Number fields are Dimensions.
	// the id (hash) field of any table is a Dimension.
	// any non-id Number field is a Metric, and should be set in Sum mode by default.
	
	// stub
}

function getData(request) {
	// return value produces JSON in a format Data Studio understands.
	// perform the SQL query, and transform the resulting data.
	
	// stub
}
