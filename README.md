# HarperDB Data Studio Connector

This is a community connector for Google Data Studio, allowing a connection to any HarperDB instance that Google's servers can reach.
As long as your database can be accessed from the internet, this connector can reach it and pull data from it.

## Usage

1. Log in to https://datastudio.google.com/
2. Add a new Data Source using the HarperDB connector. The current release version can be added as a data source by following this link:
[Current Release](https://datastudio.google.com/datasources/create?connectorId=AKfycbxBKgF8FI5R42WVxO-QCOq7dmUys0HJrUJMkBQRoGnCasY60_VJeO3BhHJPvdd20-S76g)
3. Authorize the connector to access other servers on your behalf (this allows the connector to contact your database)
4. Enter the Web URL to access your database (preferably with https!), as well as the Basic Auth key you use to access the database.
Just include the key, not the word "Basic" at the start of it.
5. Check the box for "Secure Connections Only" if you want to always use https connections for this data source; entering a Web URL that
starts with https:// will do the same thing, if you prefer.
6. Check the box for "Allow Bad Certs" if your HarperDB instance does not have a valid SSL certificate. HarperDB Cloud always has valid
certificates, and so will never require this to be checked. Instances you set up yourself may require this, if you are using self-signed
certs. If you are using HarperDB Cloud or another instance you know should *always* have valid SSL certificates, do not check this box.
7. Choose your Query Type. This determines what information the configuration will ask for after pressing the Next button.
   * Table will ask you for a Schema and a Table to return all fields of using `SELECT *`.
   * SQL will ask you for the SQL query you're using to retrieve fields from the database. You may `join` multiple tables together, and
     use HarperDB specific SQL functions, along with the usual power SQL grants.
8. When all information is entered correctly, press the Connect button in the top right of the new Data Source view to generate the Schema.
   You may also want to name the data source at this point. If the connector encounters any errors, a dialog box will tell you what went
   wrong so you can correct the issue.
9. If there are no errors, you now have a data source you can use in your reports! You may change the types of the generated fields in the
   Schema view if you need to (for instance, changing a Number field to a specific currency), as well as creating new fields from the report
   fiew that do calculations on other fields.

## Things to Keep in Mind

* Both Postman and the HarperDB Studio app have ways to convert a user:password pair to a Basic Auth token. Use either to create the token for
  the connector's user.
  * You may sign out of your current user by going to the instances tab in HarperDB Studio, then clicking on the lock icon at the top-right
  of a given instance's box. Click the lock again to sign in as any user. The Basic Auth token will be visible in the Authorization header
  portion of any code created in the Sample Code tab.
* It's highly recommended that you create a read-only user role in HarperDB Studio, and create a user with that role for your data sources to
  use. This prevents that authorization token from being used to alter your database, should someone else ever get ahold of it.
* The RecordCount field is intended for use as a metric, for counting how many instances of a given set of values appear in a report's data set.
* *Do not attempt to create fields with spaces in their names* for any data sources! Google Data Studio will crash when attempting to retrieve
  a field with such a name, producing a System Error instead of a useful chart on your reports. Using CamelCase or snake_case gets around this.
