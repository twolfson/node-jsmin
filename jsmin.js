/*
** node-jsmin - a js minifier based on Doug Crockford's jsmin.c, based
** on Franck Marica's jsmin.js by Peteris Krumins.
*/

/*!
jsmin.js - 2010-01-15
Author: NanaLich (http://www.cnblogs.com/NanaLich)
Another patched version for jsmin.js patched by Billy Hoffman,
this version will try to keep CR LF pairs inside the important comments
away from being changed into double LF pairs.

jsmin.js - 2009-11-05
Author: Billy Hoffman
This is a patched version of jsmin.js created by Franck Marcia which
supports important comments denoted with /*! ...
Permission is hereby granted to use the Javascript version under the same
conditions as the jsmin.js on which it is based.

jsmin.js - 2006-08-31
Author: Franck Marcia
This work is an adaptation of jsminc.c published by Douglas Crockford.
Permission is hereby granted to use the Javascript version under the same
conditions as the jsmin.c on which it is based.

jsmin.c
2006-05-04

Copyright (c) 2002 Douglas Crockford  (www.crockford.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

The Software shall be used for Good, not Evil.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Update:
add level:
1: minimal, keep linefeeds if single
2: normal, the standard algorithm
3: agressive, remove any linefeed and doesn't take care of potential
missing semicolons (can be regressive)
*/

// Helper function to determine if a string contains a character or not
String.prototype.has = function(c) {
  return this.indexOf(c) > -1;
};

// Export JSMin which we are about to create
exports.jsmin = jsmin;

/**
 * JSMin function
 * @param {String} input String to minify on
 * @param {Number} [level=2] Level of compression to use (1 - 3; min - aggro). See license block for more info.
 * @param {String} [comment=""] Comment to do prepend to final output with
 * @returns {String} Minified code
 */
function jsmin(input, level, comment) {
  // TODO: Create an output object which has an 'add' function
  // This takes a start and end index to add to the output
  // There should also be a 'addChar' function which adds the character at a certain index (could optimize with charAt)

  // If no input is provided, return an empty string
  // DEV: Move level, comment into options object
  if (!input) return '';

  // If there is no level, fallback to 2
  if (!level) level = 2;

  // If no comment has been provided, fallback to an empty string
  if (!comment) comment = '';

  // Set up variables and constants
  var EOF = -1,
      LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      DIGITS = '0123456789',
      ALNUM = LETTERS + DIGITS + '_$\\';
  // DEV: EOF should be an object or unique reference

  /* isAlphanum -- return true if the character is a letter, digit, underscore,
  dollar sign, or non-ASCII character.
  */

  function isAlphanum(c) {
    return !isEOF(c) && (ALNUM.has(c) || c.charCodeAt(0) > 126);
  }

  // Helper function for determining if a character is a control one.
  // We keep raw function separate from isEOF to prevent any unwanted nastiness.
  // Nerd fun: ' ' has a charCode of 32. Any characters below that are either tabs, line feeds, or something not that interesting. http://www.asciitable.com/
  function isCtrlCharRaw(char) {
    // A ctrl character has a charCode < 32 (below space)
    var charCode = char.charCodeAt(0),
        retVal = charCode < 32;

    // Return the result
    return retVal;
  }

  // Determine if a character is EOF or not
  function isEOF(char) {
    var retVal = char === EOF;
    return retVal;
  }

  // Sugar control char checker
  function isCtrlChar(char) {
    var retVal = isCtrlCharRaw(char) || isEOF(char);
    return retVal;
  }

  var file = {
    // Create an internal pointer and limit for the file
    pointer: 0,
    end: input.length,
    /**
     * Function that returns the next important character.
     * @returns {String} Next character (length 1)
     */
    // If the character is a control character, it will be converted to a space or line feed.
    // This function is explicity for important comments (i.e. /*! */)
    // It is possible for this to contain carriage returns and we require unaltered content since these could be licenses (main reason to use important comment).
    nextImportant: function nextImportant () {
      var pointer = file.pointer,
          end = file.end;

      // If we are at end of the file, return EOF
      if(pointer === end) {
        return EOF;
      }

      // Set the current character to our index
      char = input.charAt(pointer);

      // Increment the pointer
      file.pointer += 1;

      // If the character is not of human importance (is a control character besides line feed and carraige return), cast it to a space
      if(isCtrlChar(char) && char !== '\n' && char !== '\r') {
        char = ' ';
      }

      // Return our character
      return char;
    },
    /**
     * Function that returns the next character. Same as nextImportant except carriage returns are line feeds
     * @returns {String} Next character (length 1)
     */
    next: function next () {
      // Grab the char from file.nextImportant
      var char = this.nextImportant();

      // If the character is a carriage return, cast it as a line feed
      if(char === '\r') {
        char = '\n';
      }

      // Return our character
      return char;
    },
    /**
     * Function that gets the next character
     * @returns {String} Next character (length 1)
     */
    peek: function peek () {
      // Grab the next char
      var nextChar = this.next();

      // Decrement the file pointer
      this.pointer -= 1;

      // Return the next character
      return nextChar;
    }
  };

  // Helper function to read from file until a character is hit
  function readUntil(testFns, nextMethod) {
    // Fallback nextMethod to next
    nextMethod = nextMethod || 'next';

    while (true) {
      var char = file[nextMethod](),
          i = testFns.length;

      while (i--) {
        if (testFns[i](char)) {
          return char;
        }
      }
    }
  }

  function atEndOfMultilineComment(char) {
    switch(char) {
      // If it is an asterisk
      case '*':
        // and the character after that is a slash, then we are closing the comment
        if(file.peek() == '/') {
          // Move the cursor onto this slash
          file.next();

          // and return the final comment
          return true;
        }
        break;
      case EOF:
      // Otherwise, if the next character is EOF, throw an error
        throw 'Error: Unterminated comment.';
    }
  }

  // Create common function for RegExp and string's
  function charEncountered(endChar, typeMessage) {
    // Fallback the message
    typeMessage = typeMessage || 'Error: unterminated literal: ';

    return function charEncounteredFn (char) {
      // If the next character was our opening quote, stop looping
      if(char === endChar) {
        return true;
      } else if (isCtrlChar(char)) {
      // Otherwise, if line break or EOF is reached, throw an error
        throw typeMessage + char;
      } else if (char == '\\') {
      // Otherwise, if there is a slash (multi-line separator), skip to the next character
        file.next();
      }
    };
  }

  var atEndOfRegExp = charEncountered('/', 'Error: unterminated Regular Expression literal');

  function atEndOfString(quote) {
    return charEncountered(quote, 'Error: unterminated string literal: ');
  }

  /**
   * Function that gets the next character excluding non-important comments.
   * @returns {String} Next character (length 1)
   */
  function next() {
    // Get the next character
    var startIndex = file.pointer,
        char = file.next();

    // If it is a slash (indicitvate of regexp, multi-line strings, or comments)
    if(char === '/') {
      // Read in the following character
      var nextChar = file.peek();

      // If the next char is a slash, then this is a single line comment (i.e. // I am a comment )
      if (nextChar === '/') {
        // Read until we hit a ctrlChar (line feed or EOF)
        return readUntil([isCtrlChar]);
      } else if (nextChar === '*') {
      // Otherwise, if it is an asterisk, then this is a multi-line comment (i.e. /* I am a multi-line comment */)
        // Move the pointer onto the asterisk
        file.next();

        // If this comment is an important comment (i.e. the following character is an exclamation point -- /*! Important comment */), we are required to save it
        if(file.peek() === '!') {
          // Move the pointer onto the exclamation point
          file.next();

          // Read until we close the important comment
          readUntil([atEndOfMultilineComment], 'nextImportant');

          // Return the important comment
          var endIndex = file.pointer,
              retVal = input.slice(startIndex, endIndex),
              len = retVal.length,
              lenMinus2 = len - 2;

          // TODO: This should be a 'legacy' option in JSMin?
          // Remove non-head/tail asterisks as JSMin has done before
          retVal = retVal.replace(/\*/g, function removeAsterisk (word, index) {
            return (index === 1 || index === lenMinus2) ? '*' : '';
          });

          // Return the retVal;
          return retVal;
        }

        // Otherwise, read in the remainder of the (unimportant) multiline comment
        readUntil([atEndOfMultilineComment]);
        return ' ';
      }
    }

    // Otherwise, return the current character
    return char;
  }


  /* action -- do something! What you do is determined by the argument:
  1   Output A. Copy B to A. Get the next B.
  2   Copy B to A. Get the next B. (Delete A).
  3   Get the next B. (Delete B).
  action treats a string as a single character. Wow!
  action recognizes a regular expression if it is preceded by ( or , or =.
  */
  var a = '',
      b = '';
  // DEV: a and b are characters (act like iterators as with file) so maybe objectify them
  // TODO: Add a note explaining how a <= b but they can sometimes have quite a lot of spacing between them

  var output = {
    'arr': [],
    'val': function getOutputVal () {
      // Grab the arr, add it together, and return
      var arr = this.arr,
          retVal = arr.join('');
      return retVal;
    },
    'add': function addOutputChunk (start, end) {
      // Grab the slice between start and end
      var addStr = input.slice(start, end);

      // Add it onto the array
      this.arr.push(addStr);
    },
    // TODO: This should accept a pointer/index only
    'addChar': function addOutputChar (char) {
      this.arr.push(char);
    }
  };

  function outputAandMoveChars() {
    // Create a retArr for concatentating on
    var retArr = [];

    // Push on a to the the array
    retArr.push(a);

    _copyBtoA(retArr);

    // Return the retArr
    return _getNextB(retArr);
  }

  function moveChars() {
    // Create a retArr for concatentating on
    var retArr = [];

    // Call the shared function
    _copyBtoA(retArr);

    // Return the retArr
    return _getNextB(retArr);
  }

  function nextB() {
    var retArr = [];

    return _getNextB(retArr);
  }

  function _copyBtoA(retArr) {
    // Load b into a
    a = b;

    // If b was a single or double quote (i.e. opening a string)
    if(/'|"/.test(b)) {
      // Push the current character to the array
      retArr.push(a);

      // Read until we close the string
      // TODO: While jQuery does do this, I am worried about when char == '\\' (should a = readUntil or not?)
      var startIndex = file.pointer;
      a = readUntil([atEndOfString(b)]);

      // Get the end index and retStr
      var endIndex = file.pointer - 1,
          retStr = input.slice(startIndex, endIndex);

      // Add the retStr to our retArr
      retArr.push(retStr);
    }
  }

  function _getNextB(retArr) {
    // Get the next character (skipping over comments)
    b = next();

    // If it is a slash and looks like a regular expression
    // PERSONAL_TODO: Determine what 'a' is and why this works
    if(b == '/' && '(,=:[!&|'.has(a)) {
      // Add a then b onto the array
      retArr.push(a, b);

      // Read until we close the regular expression
      var startIndex = file.pointer;
      a = readUntil([atEndOfRegExp]);

      // Get the end index and retStr
      var endIndex = file.pointer - 1,
          retStr = input.slice(startIndex, endIndex);

      // Add the retStr to our retArr
      retArr.push(retStr);

      // Now that we are out of the regular expression, move off of the last slash
      b = next();
    }

    // Join together the buffer and return
    return retArr.join('');
  }

  /* m -- Copy the input to the output, deleting the characters which are
  insignificant to JavaScript. Comments will be removed. Tabs will be
  replaced with spaces. Carriage returns will be replaced with
  linefeeds.
  Most spaces and linefeeds will be removed.
  */
  // Minification function
  function minify() {
    // Create a buffered array to return
    var r = [];

    // Get the next character and delete it from the buffer
    r.push(nextB());

    // While we are not at EOF
    while(!isEOF(a)) {
      // Depending on the next character?
      // TODO: wtf is a?
      switch(a) {
        // If a is whitespace
        case ' ':
          // If b is alphanumeric, output a, copy b to a, get b
          // TODO: I am officially confused.
          if(isAlphanum(b)) {
            r.push(outputAandMoveChars());
          } else {
          // Otherwise, copy b to a, get b (skipping output of a)
            r.push(moveChars());
          }
          break;
        case '\n':
        // If a is a line break, then...
          switch(b) {
            // If a is starting some scoping or doing a unary operation, then output a (line break), copy b to a, get b
            // TODO: huh?
            case '{':
            case '[':
            case '(':
            case '+':
            case '-':
              r.push(outputAandMoveChars());
              break;
            case ' ':
            // Otherwise, if it is whitespace, move to the next b
              r.push(nextB());
              break;
            default:
            // Otherwise
              // If b is alphanumeric, output a, copy b to a, get the next b
              // TODO: huh?
              if(isAlphanum(b)) {
                r.push(outputAandMoveChars());
              } else {
              // Otherwise, if we are on the weakest minification and b is not a linebreak, output a
                // In both cases, copy b to a and get the next b
                // TODO: huh on a/b copying
                if(level == 1 && b != '\n') {
                  r.push(outputAandMoveChars());
                } else {
                  r.push(moveChars());
                }
              }
          }
          break;
        default:
        // Otherwise (a is not whitespace or a line feed)
          switch(b) {
            // If b is whitespace
            case ' ':
              // If a is alphanumeric, output it, swap b to a, get the next b and break out
              // TODO: huh a/b?
              if(isAlphanum(a)) {
                r.push(outputAandMoveChars());
                break;
              }
              // DEV: Use an else statement
              // Otherwise, get the next b
              r.push(nextB());
              break;
            case '\n':
            // If b is a line feed
              // If we are on the weak minification and a is not a line feed as well (not possible due to previous switch?)
              // Then, output a, copy b to a, get the next b
              // TODO: huh a/b?
              if(level == 1 && a != '\n') {
                r.push(outputAandMoveChars());
              } else {
              // Otherwise
                switch(a) {
                  // If we are closing an object or quotes before this
                  // TODO: Right? since a is before a? (so tired and confused)
                  case '}':
                  case ']':
                  case ')':
                  case '+':
                  case '-':
                  case '"':
                  case '\'':
                    // If we are doing aggressive minification, ignore current a and b. Get the next b.
                    // TODO: huh? a/b?
                    if(level == 3) {
                      r.push(nextB());
                    } else {
                    // Otherwise, output a, copy b to a, get the next b
                    // TODO: huh? a/b?
                      r.push(outputAandMoveChars());
                    }
                    break;
                  default:
                  // Otherwise
                    // If a is alphanumeric, output a, copy b to a, get the next b
                    // TODO: huh?
                    if(isAlphanum(a)) {
                      r.push(outputAandMoveChars());
                    } else {
                    // Otherwise, get the next b
                      r.push(nextB());
                    }
                }
              }
              break;
            default:
            // Othrwise (b is not whitespace or a linefeed), output a, copy b to a, get the next b
            // TODO: huh?
              r.push(outputAandMoveChars());
              break;
          }
      }
    }

    // Join together the buffered output and return
    return r.join('');
  }

  // Process the input into its minified compliment
  var retVal = minify(input);

  // If there is a comment, add it on
  if (comment) {
    retVal = comment + '\n' + retVal;
  }

  // Return the comment + minified code
  return retVal;
}