# Test Data

This folder contains four CSV files for testing the Data Studio connector. The data was chosen both to allow a complex join between
three different tables, and to demonstrate poorly formatted data fields with mixed types, which will cause errors in code that is
not prepared to deal with such cases.

To use this test data, create a HarperDB schema for testing on any instance you have available, then create four tables, named
`grocers`, `products`, `listings`, and `grocers-mixloc`.

Add the data via CSV file to each of these tables, from the file that shares its name. (Using a URL to connect directly to github's
raw .csv files will not work here, as github does not recognize CSV files as anything but text/plain, and HarperDB will refuse to load
CSV files with the wrong MIME type.)

You can now test the connector using Table queries for each of the four tables, and use SQL query data sources to test the following
three-table joins:

**Standard join,** with properly formatted `location` field:

```
SELECT grocers.location AS `location`, grocers.name AS `store`, products.name AS `product`, listings.price AS `price`,
products.bread AS `bread`, products.dairy AS `dairy`, products.half_gallon AS `halfGallon`, products.upc AS `upc`
FROM test.grocers JOIN test.listings ON grocers.id = listings.grocer_id
JOIN test.products ON products.id = listings.product_id
```

**Mixed-location join,** where the `location` field contains both GeoJSON Points and Lat,Long strings:
```
SELECT grocers.location AS `location`, grocers.name AS `store`, products.name AS `product`, listings.price AS `price`,
products.bread AS `bread`, products.dairy AS `dairy`, products.half_gallon AS `halfGallon`, products.upc AS `upc`
FROM test.`grocers-mixloc` AS grocers JOIN test.listings ON grocers.id = listings.grocer_id
JOIN test.products ON products.id = listings.product_id
```

## What this tests

Currently, the cases being tested here are as follows:
* Performing a SELECT * on an entire table
* Performing a JOIN across multiple tables at once
* Properly parsing fields with inconsistent information:
  * Fields with both boolean and string information should become strings
  * Fields with both numbers and strings should become strings
  * Fields with both booleans and numbers should also become strings
  * Fields with Lat,Long strings, GeoJSON, or a mix of both should all be treated as Lat,Long geographic data
* Queries resulting in more than 100 records

If any errors are encountered while testing any of the above, the code needs to be adjusted to deal with them properly
Any release version should correctly handle this entire data set without errors, as long as no other errors are introduced.

When new types of information are allowed (such as more complex GeoJSON types, or JSON objects or arrays contained in fields),
the test data should expand to include such data, so their parsing can be tested as well.
