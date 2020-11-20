// HarperDB Data Studio Connector
// sqlutil.js: SQL parsing and utility functions.
// Contributor(s): Aubrey Smith

function sqlStrip(s, t) {
	// takes an SQL string and an empty object.
	// the SQL will be checked for any comments and have them stripped out of the
	// return value. if a semicolon ";" is found in the statement, it and everything
	//  after it will also be stripped out.
	// the empty object t will have the property "nochange" added with the value "true"
	//  if the SQL is unchanged when returned.

	var quoter = /(["'`]).*?\1/gm; // regex that catches any SQL quotes
	var qres = quoter.exec(s);
	var commr = /\/\*.*?\*\/|--.*?(\r\n|\r|\n|$)/gm; // catches comments of both forms
	var cres = commr.exec(s);
	var semir = /;/gm; // catches semicolons
	var sres = semir.exec(s);
	var r = ""; // our return value goes here.
	var scfound = false; // true if we find a semicolon or at least one comment.
	var last = 0; // last slice point; start here when copying text from s.

	while(cres || sres) {
		// as long as we keep finding potential comments or semicolons, the above will
		//  remain true. we set both to null to leave the loop entirely.
		let first = null; // set to first found comment or semicolon
		if(cres && sres) {
			if(cres.index < sres.index) {
				first = cres; // comment is first
			} else {
				first = sres; // semicolon is first
			}
		} else {
			if(cres) {
				first = cres;
			} else {
				first = sres;
			}
		}
		// first is now not null.
		if(qres && qres.index < first.index) {
			if(quoter.lastIndex > first.index) {
				if(first === cres) {
					// comment found at least partly inside quote; skip it.
					// this might not even be a real comment, so move the lastIndex to
					//  just after the first comment character!
					commr.lastIndex = cres.index + 1;
					cres = commr.exec(s);
				} else {
					// semicolon found inside quote; skip it.
					sres = semir.exec(s);
				}
			} else {
				// quote found before comment or ";"
				// slice from s into r until end of quote.
				r += s.slice(last, quoter.lastIndex);
				last = quoter.lastIndex;
				// now find another quote.
				qres = quoter.exec(s);
			}
		} else {
			if(first === cres) {
				// comment found before quotes or comments
				// slice up to just before the comment starts.
				r += s.slice(last, cres.index);
				// move the slice point to just after the comment ends.
				last = commr.lastIndex;
				// make sure anything else we found is not inside the comment before
				//  moving on.
				while(qres && qres.index < commr.lastIndex) {
					// this might not even be a real quote! move lastIndex to just after
					//  the first quote character.
					quoter.lastIndex = qres.index + 1;
					qres = quoter.exec(s);
				}
				while(sres && sres.index < commr.lastIndex) {
					sres = semir.exec(s);
				}
				// all quotes and semicolons found are after the comment now;
				//  find the next comment.
				cres = commr.exec(s);
			} else {
				// semicolon found before quotes or comments; end of statement found
				// slice up to just before the ";"
				if (sres) {
					r += s.slice(last, sres.index);
				}
				// and we're done.
				return r;
			}
			scfound = true; // we've found at least one comment, so set this.
		}
	}
	// done; prepare the return.
	if(!scfound) {
		r = s;
		if(t) {
			t.nochange = true;
		}
	} else {
		// add everything from last slice point forward to the end of the return string.
		r += s.slice(last);
	}
	return r;
}

function sqlLimit(s, l, t) {
	// takes an SQL string, an integer limit, and an empty object.
	// the SQL will be checked for any LIMIT clauses, and have them replaced with the
	//  given limit l, unless that limit is equal to or greater than the limit already
	//  present in the clause. If no LIMIT clause is found, one will be added to the end
	//  of the statement. The altered SQL is the return value.
	// the empty object t will have the property "nochange" added with the value "true"
	//  if the SQL is unchanged when returned.
	// sqlLimit() expects there to be no comments or semicolons in the SQL. Using
	//  sqlStrip() beforehand is strongly suggested.


	// parse the SQL query and detect any existing LIMIT clause in the query.
	// if it exists, determine how large the limit is, and use the minimum of that and
	//  100; if there is no LIMIT, add it to the end of the query.

	var quoter = /(["'`]).*?\1/gm; // regex that catches any SQL quotes
	var qres = quoter.exec(s);
	var limitr = /\blimit\s+(\d+)\b/gmi; // regex that catches "limit" and a number
	var lres = limitr.exec(s);
	var lfound = false;

	while(lres) {
		// the above will be false if we don't find a valid limit, or we set it to null.
		if(qres && qres.index < lres.index) {
			if(quoter.lastIndex > lres.index) {
				// the "limit" we found is inside of quotes. it's not a real limit clause
				lres = limitr.exec(s); // find another one
			} else {
				// quotation marks found before limit; check for more.
				qres = quoter.exec(s);
			}
		} else {
			// there are no quotation marks surrounding our limit, so work with it!
			let i = parseInt(lres[1]); // grab the number's value from the clause
			if(i > l) {
				// we only want to work with the first 100 values, so shorten this
				let len = lres[1].length;
				let k = lres.index + lres[0].length; // end of number string
				let j = k - len; // start of number string
				s = s.slice(0,j) + l + s.slice(k);
			} else {
				if(t) {
					t.nochange = true;
				}
				return s;
			}
			// if the limit is less than or equal to 100, we don't need to scan further,
			//  so we're done checking the SQL either way.
			lfound = true; // mark that we found a limit
			lres = null; // escape the while loop
		}
	}
	if(!lfound) {
		// just add the limit clause to the end of the statement in this case
		s += " LIMIT " + l;
		// NOTE: This relies on stripping out any ; and after matter first!
	}
	return s;
}
