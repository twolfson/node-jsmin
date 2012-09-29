Provide same API for Strings and Pointers
-----------------------------------------
- Move to 'isA' method for strings #done

Move to Pointer model
---------------------
- Add 'char' as a property of Pointers, this will smooth over any comments -> empty string logic

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