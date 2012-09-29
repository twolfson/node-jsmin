Provide same API for Strings and Pointers
-----------------------------------------
- Move to 'isA' method for strings #done

Move to Pointer model
---------------------
- Add 'char' as a property of Pointers, this will smooth over any comments -> empty string logic #madeintoamethodinstead
- Instead of receiving return data from file.next(), use file.next() + file.char

### Both transitions
- Use a.moveTo(file), b.moveTo(file), and b.moveTo(a)

### Hard transition
- Convert a and b to Pointer model,

### Soft transition
- In parallel, convert a and b to pointer model -- making checks along the way

Post transitions
----------------
- Add enforcement of pointer only for output

Later
-----
- We might only need isA since we can leverage 'valueOf' for a lot of comparisons







- file.getChar(), char don't line up as wanted =(
- need to make an internalGet method or something for peek
- so we can have this.char behavior for file (causing it so have the same char as file.next())

- alternatively, we can return to master and just track theAIndex along side theA every time it is changed
- then instead of doing console.log(theA), we console.log(file.charAt(theAIndex));
-- this loses abstraction of OOP but saves us the PITA that we are receiving from the Pointer model =(

-- btw we should move back to Crockford's model. no need for these levels etc.
-- maybe the important comments though =/