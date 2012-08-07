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

  // If no input is provided, return an empty string
  if (!input) return '';

  // If there is no level, fallback to 2
  if (!level) level = 2;

  // If no comment has been provided, fallback to an empty string
  if (!comment) comment = '';

  // Set up variables and constants
  var a = '',
        b = '',
        EOF = -1,
        LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
        DIGITS = '0123456789',
        ALNUM = LETTERS + DIGITS + '_$\\',
        theLookahead = EOF;


  /* isAlphanum -- return true if the character is a letter, digit, underscore,
  dollar sign, or non-ASCII character.
  */

  function isAlphanum(c) {
    return c != EOF && (ALNUM.has(c) || c.charCodeAt(0) > 126);
  }


  /* getc(IC) -- return the next character. Watch out for lookahead. If the
  character is a control character, translate it to a space or
  linefeed.
  */

  // Create an index of the current character and memoize the length of the input
  var iChar = 0,
      inputLen = input.length;

  // getc is a helper function to determine the current character
  function getc() {
    // Memoize the next character as c
    var c = theLookahead;

    // If we are at end of the input, return EOF
    if(iChar == inputLen) {
      return EOF;
    }

    // Set the next character to EOF
    theLookahead = EOF;

    // If the memoized next character was EOF, update it to the current character and move to the next character
    if(c == EOF) {
      c = input.charAt(iChar);
      ++iChar;
    }

    // If the character is of human importance or is a linefeed, return it
    // Nerd fun: ' ' has a charCode of 32. Any characters below that are either tabs, line feeds, or something not that interesting. http://www.asciitable.com/
    if(c >= ' ' || c == '\n') {
      return c;
    }

    // If the character is a carriage return, return it as a linefeed
    if(c == '\r') {
      return '\n';
    }

    // If we have not returned since then, return a space
    return ' ';
  }

  // getcIC is extremely similar to getc
  function getcIC() {
    var c = theLookahead;
    if(iChar == inputLen) {
      return EOF;
    }
    theLookahead = EOF;
    if(c == EOF) {
      c = input.charAt(iChar);
      ++iChar;
    }

    // Except instead when the current character is a carriage return, we return a carriage return
    if(c >= ' ' || c == '\n' || c == '\r') {
      return c;
    }

    return ' ';
  }


  /* peek -- get the next character without getting it.
  */
  function peek() {
    theLookahead = getc();
    return theLookahead;
  }


  /* next -- get the next character, excluding comments. peek() is used to see
  if a '/' is followed by a '/' or '*'.
  */
  function next() {
    // Get the next character
    var c = getc();

    // If it is a slash (indicitvate of regexp, multi-line strings, or comments)
    if(c == '/') {
      // Read in the following character
      switch(peek()) {
        // If it is a slash, then this is a comment (i.e. // I am a comment )
        case '/':
          // Loop while...
          for(; ; ) {
            c = getc();

            // If we hit a newline, null character, EOF, or something similar, return it
            // FIXME: If there is a tab in a comment, the comment will terminate early
            if(c <= '\n') {
              return c;
            }
          }
          break;
        case '*':
          // If is an asterisk, then this is a multi-line comment (i.e. /* I am a multi-line comment */)
          // JSMin is configured to automatically save important comment (i.e. ones with /*! at the start */)

          // Move the pointer onto the asterisk
          getc();

          // If the following character is an exclamation point (i.e. we are working with an important comment)
          if(peek() == '!') {
            // Move the pointer onto the exclamation point
            getc();
            
            // Set up a return comment to build on
            var d = '/*!';

            // Loop while...
            for(; ; ) {
              // Get the next character
              c = getcIC();

              switch(c) {
                // If it is an asterisk
                case '*':
                  // and the character after that is a slash, then we are closing the comment
                  if(peek() == '/') {
                    // Move the cursor onto the next slash
                    getc();

                    // and return the final comment
                    return d + '*/';
                  }
                  break;

                case EOF:
                // Otherwise, if the next character is EOF, throw an error
                  throw 'Error: Unterminated comment.';

                default:
                // Otherwise, add on the character to our buffered comment
                // Developer notes: Modern JS engines handle string concats much better than the array+push+join hack.
                  d += c;
              }
            }
          } else {
            //unimportant comment
            for(; ; ) {
              switch(getc()) {
                case '*':
                  if(peek() == '/') {
                    getc();
                    return ' ';
                  }
                  break;
                case EOF:
                  throw 'Error: Unterminated comment.';
              }
            }
          }
          break;
        default:
          return c;
      }
    }
    return c;
  }


  /* action -- do something! What you do is determined by the argument:
  1   Output A. Copy B to A. Get the next B.
  2   Copy B to A. Get the next B. (Delete A).
  3   Get the next B. (Delete B).
  action treats a string as a single character. Wow!
  action recognizes a regular expression if it is preceded by ( or , or =.
  */

  function action(d) {

    var r = [];

    if(d == 1) {
      r.push(a);
    }

    if(d < 3) {
      a = b;
      if(a == '\'' || a == '"') {
        for(; ; ) {
          r.push(a);
          a = getc();
          if(a == b) {
            break;
          }
          if(a <= '\n') {
            throw 'Error: unterminated string literal: ' + a;
          }
          if(a == '\\') {
            r.push(a);
            a = getc();
          }
        }
      }
    }

    b = next();

    if(b == '/' && '(,=:[!&|'.has(a)) {
      r.push(a);
      r.push(b);
      for(; ; ) {
        a = getc();
        if(a == '/') {
          break;
        } else if(a == '\\') {
          r.push(a);
          a = getc();
        } else if(a <= '\n') {
          throw 'Error: unterminated Regular Expression literal';
        }
        r.push(a);
      }
      b = next();
    }

    return r.join('');
  }


  /* m -- Copy the input to the output, deleting the characters which are
  insignificant to JavaScript. Comments will be removed. Tabs will be
  replaced with spaces. Carriage returns will be replaced with
  linefeeds.
  Most spaces and linefeeds will be removed.
  */

  function m() {

    var r = [];
    a = '';

    r.push(action(3));

    while(a != EOF) {
      switch(a) {
        case ' ':
          if(isAlphanum(b)) {
            r.push(action(1));
          } else {
            r.push(action(2));
          }
          break;
        case '\n':
          switch(b) {
            case '{':
            case '[':
            case '(':
            case '+':
            case '-':
              r.push(action(1));
              break;
            case ' ':
              r.push(action(3));
              break;
            default:
              if(isAlphanum(b)) {
                r.push(action(1));
              } else {
                if(level == 1 && b != '\n') {
                  r.push(action(1));
                } else {
                  r.push(action(2));
                }
              }
          }
          break;
        default:
          switch(b) {
            case ' ':
              if(isAlphanum(a)) {
                r.push(action(1));
                break;
              }
              r.push(action(3));
              break;
            case '\n':
              if(level == 1 && a != '\n') {
                r.push(action(1));
              } else {
                switch(a) {
                  case '}':
                  case ']':
                  case ')':
                  case '+':
                  case '-':
                  case '"':
                  case '\'':
                    if(level == 3) {
                      r.push(action(3));
                    } else {
                      r.push(action(1));
                    }
                    break;
                  default:
                    if(isAlphanum(a)) {
                      r.push(action(1));
                    } else {
                      r.push(action(3));
                    }
                }
              }
              break;
            default:
              r.push(action(1));
              break;
          }
      }
    }

    return r.join('');
  }

  ret = m(input);

  if (comment) {
    return comment + '\n' + ret;
  }
  return ret;
}

