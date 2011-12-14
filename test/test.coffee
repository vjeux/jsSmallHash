SmallHash = require '../src/smallhash.js'

input = [0,0,1,3]
encoded = SmallHash.encode input, [2,2,3,5], 'abcdefghijklmnopqrstuvwxyz'
decoded = SmallHash.decode encoded, [2,2,3,5], 'abcdefghijklmnopqrstuvwxyz'
console.log input, encoded, decoded
# Result: [0, 0, 1, 3], "bo", [0, 0, 1, 3]
