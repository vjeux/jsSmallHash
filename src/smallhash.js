/* SmallHash | Vjeux - http://blog.vjeux.com/2009/javascript/smallhash-information-compression.html */

if (typeof bigInt == 'undefined') {
	bigInt = require('BigInt');
}

SmallHash = {
	encode: function (input, ranges, base) {
		// Rough majoration of the final result size
		// It makes the sum of all the minimum of bits required for each range
		var size = 0;
		for (var i = 0, len = ranges.length; i < len; i = i + 1) {
			size += Math.ceil(Math.log(ranges[i]) / Math.LN2);
		}
		var result = bigInt.int2bigInt(0, size, 1);
		for (var bit = ranges.length - 1, pos = 0; bit >= 0; bit = bit - 1, pos = pos + 1) {
			// If the value is higher than the expected range, the value is maximized
			// Therefore the result is always valid, even if the input is not
			var parsed_bit = Math.min(Math.abs(Math.floor(input[bit])), ranges[bit] - 1);
			result = bigInt.mult(result, bigInt.int2bigInt(ranges[bit], 32, 1));
			result = bigInt.add(result, bigInt.int2bigInt(parsed_bit, 32, 1));
		}
		return bigInt.bigInt2str(result, base);
	},
	decode: function (input, ranges, base) {
		input = bigInt.str2bigInt(input, base);
		var remainder = bigInt.dup(input); // Allocates enough room for the remainder
		var result = [];
		for (var pos = 0, len = ranges.length; pos < len; pos = pos + 1) {
			bigInt.divide_(input, bigInt.int2bigInt(ranges[pos], 32), input, remainder);
			result[pos] = Number(bigInt.bigInt2str(remainder, '0123456789'));
		}
		return result;
	}
};

if (typeof module !== 'undefined') {
	module.exports = SmallHash;
}