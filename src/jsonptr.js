// HarperDB Data Studio Connector
// jsonptr.js: JSON Pointer implementation (RFC 6901) with extension for iterating through
//  arrays inside an object.
// Contributor(s): Aubrey Smith

function jsonPtrQuery(obj, ptr, ind) {
	// takes an object, a JSON Pointer string, and a set of indexes to insert into the
	//  pointer.
	// ind can be either an array of integers, a single integer, or a null/undefined.
	// calls may be made to jsonPtrQuery() without the ind.
	
	// returns the value contained in the obj at the position of the ptr.
	// if there is no value at that position, returns undefined.
	//  note that returning undefined is technically an error condition, and should be
	//  checked against in most cases.
	
	if(ptr == null || ptr == "") {
		// null, undefined, or empty string ptr just gives the object
		return obj;
	}
	
	if(ind == null) {
		// null or undefined ind is equivalent to a zero-length array
		ind == [];
	} else if(typeof ind == "number") {
		// convert to an array of length 1
		ind == [ind];
	} else if(!Array.isArray(ind)) {
		// error; Apps Script should convert this into debug text
		throw new Error('jsonPtrQuery received set of indexes that is not a number or array\n'
			+ 'typeof ind == "' + typeof ind + '"');
	} else {
		ind = ind.slice(); // creates a safe clone of the array
	}
	// at this point, ind is an array; safe to continue
	
	// parse ptr into an array to drill down.
	var p;
	if(ptr.startsWith("/")) {
		// the first slash is optional; get rid of it to prevent a spurious "".
		p = ptr.slice(1).split("/");
	} else {
		p = ptr.split("/");
	}
	
	// drill down obj using the array
	var o = obj;
	for(i of p) {
		if(typeof o == "object") {
			if(Array.isArray(o)) {
				// replace all instances of "" on an array with one of the indexes in ind,
				//  unless we have run out of indexes, in which case leave it as ""
				//  (and return undefined).
				if(i == "") {
					if(ind.length > 0) {
						let j = ind.shift();
						if(j.match(/^\d+$/)) {
							o = o[parseInt(j)];
						} else {
							// error; Apps Script should convert to debug text.
							throw new Error('jsonPtrQuery received an index that is not an integer\n'
								+ 'bad index was "' + j + '"');
						}
					} else {
						// nothing to insert; there is no way to retrieve "" from an array
						return undefined;
					}
				} else if(i.match(/^\d+$/)) {
					o = o[parseInt(i)];
				} else {
					// non-numeric value is meaningless when accessing array;
					//  no value to retrieve.
					return undefined;
				}
			} else {
				// remove escape sequences first
				i = i.replace(/~1/g,'/');
				i = i.replace(/~0/g,'~');
				if(o.hasOwnProperty(i)) {
					o = o[i];
				} else {
					// pointed-to position does not exist in object!
					return undefined;
				}
			}
		} else {
			// attempted to point to a location that cannot exist, as there is no lower
			// layer of the object to reach
			return undefined;
		}
	}
	// if we've gotten to the end of the ptr without returning, we have our return val.
	return o;
}

function jsonPtrConstruct(arr) {
	// takes an array of strings and numbers.
	// returns a JSON Pointer string made of those elements.
	
	if(arr == null) {
		// no elements, blank pointer
		return "";
	} else if(typeof arr == "string") {
		// one element
		return "/" + arr;
	} else if(typeof arr != "object") {
		// one non-string element, convert to string
		return "/" + arr.toString();
	} else if(!Array.isArray(arr)) {
		// error; Apps Script should convert to debug text.
		throw new Error("jsonPtrConstruct received an object that is not an Array.");
	}
	// if we reach this point, arr is an array.
	// clone it
	var a = arr.slice();
	// step through all elements in the array, converting them to escaped strings.
	var i;
	for(i=0;i<a.length;i++) {
		if(a[i] == null) {
			a[i] == "";
		} else if(typeof a[i] == "object") {
			// error; Apps Script should convert to debug text.
			throw new Error("jsonPtrConstruct received object or Array as an arary element.");
		} else if(typeof a[i] != "string") {
			a[i] == a[i].toString();
		}
		// at this point the element is a string. escape it.
		i = i.replace(/~/g,'~0');
		i = i.replace(/\//g,'~1');
	}
	// now join and return.
	return "/" + a.join("/");
}