const NumericAlgorithm = (function () {
	const __object = function () {
		this.__intervals = [];
		this.__intervalCallbacks = [];
		this.__intervalFallbacks = [];
		this.__gradients = [];
		this.__gaps = [];
		this.__bounds = {open : 0, close : 0};
		this.__boundBehavior = 0;
		this.__aggregation = [];
		
		this.CEIL = 1;
		this.FLOOR = -1;
		this.WRAP = 0;
		this.CLIP = 1;
	};
	__object.prototype = {
		__wrapInput : function (input) {
			if (this.__boundBehavior === this.WRAP) {
				if (input < this.__bounds.open) {
					return this.__bounds.close - Math.abs(this.__bounds.open - input);
				}
				if (input > this.__bounds.close) {
					return this.__bounds.open + Math.abs(input - this.__bounds.close);
				}
			}
			if (this.__boundBehavior === this.CLIP) {
				if (input < this.__bounds.open) {
					return this.__bounds.open;
				}
				if (input > this.__bounds.close) {
					return this.__bounds.close;
				}
			}
			return input;
		},
		__applyGaps : function (input) {
			for (var i = 0; i < this.__gaps.length; i++) {
				if (input > this.__gaps[i].open && input < this.__gaps[i].close) {
					if (this.__gaps[i].force === this.CEIL) {
						return this.__gaps[i].close;
					}
					if (this.__gaps[i].force === this.FLOOR) {
						return this.__gaps[i].open;
					}
				}
			}
			return input;
		},
		__intervalPlacement : function (input) {
			for (var i = 0; i < this.__intervals.length - 1; i++) {
				const n = this.__intervals[i + 1];
				const c = this.__intervals[i];
				if (input >= c && input < n) {
					return i;
				}
			}
			if (input === this.__bounds.close) {
				return this.__intervals.length - 1;
			}
			return -1;
		},
		__checkGapForm : function () {
			for (var i = 0; i < this.__gaps.length; i++) {
				if (!(this.__gaps[i] instanceof Object)) {
					throw new Error("Gap form error. Make sure your gap values are object dictionaries with open, close, and force (direction) values. Example: {open : 16, close : 32, force : 1}");
				}
			}
		},
		output : function (input) {
			input = this.__wrapInput(input);
			this.__checkGapForm();
			input = this.__applyGaps(input);
			const index = this.__intervalPlacement(input);
			if (index === 0) {
				if (this.__intervalCallbacks[index] !== undefined) {
					return {
						value : this.__intervalCallbacks[index](
							(input - this.__intervals[index]) * this.__gradients[index]
						),
						lower : this.__intervals[index],
						upper : this.__intervals[index + 1]
					};
				}
				if (this.__intervalFallbacks[index] !== undefined) {
					return {
						value : this.__intervalFallbacks[index],
						lower : this.__intervals[index],
						upper : this.__intervals[index + 1]
					};
				}
				return {
					value : input * this.__gradients[index],
					lower : this.__intervals[index],
					upper : this.__intervals[index + 1]
				};
			} else {
				if (this.__intervalCallbacks[index] !== undefined) {
					return {
						value : this.__intervalCallbacks[index](
							this.__aggregation[index] + ((input - this.__intervals[index]) * this.__gradients[index])
						),
						lower : this.__intervals[index],
						upper : this.__intervals[index + 1]
					};
				}
				if (this.__intervalFallbacks[index] !== undefined) {
					return {
						value : this.__intervalFallbacks[index],
						lower : this.__intervals[index],
						upper : this.__intervals[index + 1]
					};
				}
				return {
					value : this.__aggregation[index] + ((input - this.__intervals[index]) * this.__gradients[index]),
					lower : this.__intervals[index],
					upper : this.__intervals[index + 1]
				};
			}
		},
		intervals : function () {
			if (arguments[0] instanceof Array) {
				this.__intervals = arguments[0];
			} else {
				this.__intervals = arguments;
			}
			this.__bounds = {
				open : Math.min.apply(null, this.__intervals),
				close : Math.max.apply(null, this.__intervals)
			};
			for (var i = 0; i < this.__intervals.length; i++) {
				this.__gradients[i] = 1;
			}
		},
		intervalFallbacks : function () {
			if (arguments[0] instanceof Array) {
				this.__intervalFallbacks = arguments[0];
			} else {
				this.__intervalFallbacks = arguments;
			}
		},
		intervalCallbacks : function () {
			if (arguments[0] instanceof Array) {
				this.__intervalCallbacks = arguments[0];
			} else {
				this.__intervalCallbacks = arguments;
			}
		},
		setInterval : function (index, value) {
			this.__intervals[index] = value;
		},
		setIntervalFallback : function (index, fallback) {
			this.__intervalIntegerFallback[index] = fallback;
		},
		setIntervalCallback : function (index, callback) {
			this.__intervalCallbacks[index] = callback;
		},
		bounds : function (open, close) {
			this.__bounds.open = open;
			this.__bounds.close = close;
		},
		wrapBounds : function () {
			this.__boundBehavior = 0;
		},
		clipBounds : function () {
			this.__boundBehavior = 1;
		},
		gaps : function () {
			if (arguments[0] instanceof Array) {
				this.__gaps = arguments[0];
			} else {
				this.__gaps = arguments;
			}
		},
		setGap : function (open, close, force) {
			this.__gaps.push({
				open : open,
				close : close,
				force : force
			});
		},
		gradients : function () {
			if (arguments[0] instanceof Array) {
				this.__gradients = arguments[0];
			} else {
				this.__gradients = arguments;
			}
		},
		setGradient : function (index, gradient) {
			this.__gradients[index] = gradient;
		},
		generateAggregation : function () {
			var prev = 0;
			for (var i = 1; i < this.__intervals.length; i++) {
				const p = this.__intervals[i - 1];
				const c = this.__intervals[i];
				//console.log(p + ", " + c);
				const v = prev + (c - p) * this.__gradients[i];
				prev = v;
				this.__aggregation[i] = v;
			}
			//console.log(this.__aggregation);
		},
		fromArray : function (array) {
			if (array.length % 2 !== 0) {
				throw new Error("Array must be of even length and alternating between range value and matching value pairs. Ex: [0, 'a', 8, 'b', 16, 'c']");
			}
			for (var i = 0; i < array.length; i += 2) {
				this.__intervals.push(array[i]);
				this.__gradients[i] = 1;
				if (array[i + 1] instanceof Function) {
					this.__intervalCallbacks.push(array[i + 1]);
				}
				this.__intervalFallbacks.push(array[i + 1]);
			}
			this.__bounds = {
				open : Math.min.apply(null, this.__intervals),
				close : Math.max.apply(null, this.__intervals)
			};
		}
	};
	return __object;
})();
