// HarperDB Data Studio Connector
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
	// two versions of configuration will exist, one with everything past authentication
	//  on one page, and one that instead uses two more pages: the first for choosing
	//  whether to use a Schema.Table pair or to take a raw SQL SELECT query, and the
	//  second to get that table or query from the user.
	// The URL where the HarperDB instance resides should be given with port information,
	//  and must be given such a port if that instance usesa non-standard port. If no port
	//  is provided, the connector should test these ports in order:
	//    31283 (HarperDB HTTPS),
	//    443 (HTTPS),
	//    9925 (HarperDB HTTP),
	//    80 (HTTP).
	
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
	
	// stub
}

function getData(request) {
	// return value produces JSON in a format Data Studio understands.
	// perform the SQL query, and transform the resulting data.
	
	// stub
}
