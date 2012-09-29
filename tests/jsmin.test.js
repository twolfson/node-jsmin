// Read in js min, its expected outputs, and create our actual outputs
var assert = require('assert'),
	jsmin = require('../jsmin'),
	fs = require('fs'),
	jquerySrc = fs.readFileSync(__dirname + '/test_files/jquery.js', 'utf8'),
	expectedJQueryMin1 = fs.readFileSync(__dirname + '/test_files/jquery.min.1.js', 'utf8'),
  expectedJQueryMin2 = fs.readFileSync(__dirname + '/test_files/jquery.min.2.js', 'utf8'),
  expectedJQueryMin3 = fs.readFileSync(__dirname + '/test_files/jquery.min.3.js', 'utf8'),
	actualJQueryMin1 = jsmin.jsmin(jquerySrc, 1),
	actualJQueryMin2 = jsmin.jsmin(jquerySrc, 2),
	actualJQueryMin3 = jsmin.jsmin(jquerySrc, 3);

fs.writeFileSync(__dirname + '/test_files/jquery.min.1.js', actualJQueryMin1, 'utf8');
fs.writeFileSync(__dirname + '/test_files/jquery.min.2.js', actualJQueryMin2, 'utf8');
fs.writeFileSync(__dirname + '/test_files/jquery.min.3.js', actualJQueryMin3, 'utf8');

// Output to debug
fs.writeFileSync(__dirname + '/jsmin.debug.js', actualJQueryMin1, 'utf8');

// Run our asserts
assert.strictEqual(expectedJQueryMin1, actualJQueryMin1, 'JS min level 1');
assert.strictEqual(expectedJQueryMin2, actualJQueryMin2, 'JS min level 2');
assert.strictEqual(expectedJQueryMin3, actualJQueryMin3, 'JS min level 3');

// If no errors have been throw, log success
console.log('Success!');