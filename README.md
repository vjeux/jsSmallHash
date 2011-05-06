<a href="http://blog.vjeux.com/2009/javascript/smallhash-information-compression.html">SmallHash</a> - Information Compression
===============

SmallHash encodes any range of integers into the smallest possible string. This way, you can use the hash part of your url with efficiency.


Example
-------

```javascript
var input = [0,0,1,3];
var encoded = SmallHash.encode(input, [2,2,3,5], 'abcdefghijklmnopqrstuvwxyz');
var decoded = SmallHash.decode(encoded, [2,2,3,5], 'abcdefghijklmnopqrstuvwxyz');
console.log(input, encoded, decoded);
// Result: [0, 0, 1, 3], "bo", [0, 0, 1, 3]
```

Read the full explanation on my blog: http://blog.vjeux.com/2009/javascript/smallhash-information-compression.html
