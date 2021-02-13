# HarperDB Data Studio Connector

This is a community connector for Google Data Studio, allowing a connection to any HarperDB instance that Google's servers can reach.
As long as your database can be accessed from the internet, this connector can reach it and pull data from it.

## Usage

1. Log in to https://datastudio.google.com/
2. Create a new Data Source using the HarperDB connector. You can search for HarperDB, and it will show up under Partner Connectors.
3. Authorize the connector to access other servers on your behalf (this allows the connector to contact your database)
4. Enter the Web URL to access your database (preferably with https!), as well as the Username and Password you use to access the database.
5. Choose your Query Type. This determines what information the configuration will ask for after pressing the Next button.
   * Table will ask you for a Schema and a Table to return all fields of using `SELECT *`.
   * SQL will ask you for the SQL query you're using to retrieve fields from the database. You may `join` multiple tables together, and
     use HarperDB specific SQL functions, along with the usual power SQL grants.
6. When all information is entered correctly, press the Connect button in the top right of the new Data Source view to generate the Schema.
   You may also want to name the data source at this point. If the connector encounters any errors, a dialog box will tell you what went
   wrong so you can correct the issue.
7. If there are no errors, you now have a data source you can use in your reports! You may change the types of the generated fields in the
   Schema view if you need to (for instance, changing a Number field to a specific currency), as well as creating new fields from the report
   fiew that do calculations on other fields.

## Things to Keep in Mind

* It's highly recommended that you create a read-only user role in HarperDB Studio, and create a user with that role for your data sources to
  use. This prevents that authorization pair from being used to alter your database, should someone else ever get ahold of it.
* The RecordCount field is intended for use as a metric, for counting how many instances of a given set of values appear in a report's data set.
* *Do not attempt to create fields with spaces in their names* for any data sources! Google Data Studio will crash when attempting to retrieve
  a field with such a name, producing a System Error instead of a useful chart on your reports. Using CamelCase or snake_case gets around this.
