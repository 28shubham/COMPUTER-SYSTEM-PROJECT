

const abs = x => x < 0 ? - x : x;

// computes the greatest common divisor of a and b
function gcd(a,b) {
  if (a == 0)
    return b;
  if (b == 0)
    return a;
  while (b != 0)
    [a,b] = [b,a%b];
  return a;
}

// a "Fraction" object represents a rational number with a numerator
// or a denominator; both of these are "bigInt" objects so that we
// have infinite precision
function Fraction(num, den) {
  // if there's only one argument to the constructor, we construct a
  // fraction representing an integer
  den = den || 1;
  this.num = BigInt(num);
  this.den = BigInt(den);
  if (den != 1 && num != 1)
    this.cancel();
}

// "Fraction" objects are always canceled and the denominator is never
// negative; that's done by this function
Fraction.prototype.cancel = function() {
  const g = gcd(abs(this.num), abs(this.den));
  this.num /= g;
  this.den /= g;
  if (this.den < 0) {
    this.num = -this.num;
    this.den = -this.den;
  }
};


Fraction.prototype.add = function(summand) {
  return new Fraction(this.num*summand.den+this.den*summand.num,this.den*summand.den);
};


Fraction.prototype.sub = function(subtrahend) {
  return new Fraction(this.num*subtrahend.den-this.den*subtrahend.num,this.den*subtrahend.den);
};

// subtract integer k in-place
Fraction.prototype.subInt = function(k) {
  this.num -= BigInt(k)*this.den;
  this.cancel();
};

// multiply fraction with "factor" and return NEW object
Fraction.prototype.mult = function(factor) {
  return new Fraction(this.num*factor.num,this.den*factor.den);
};

// multiply fraction in-place with ten
Fraction.prototype.multTen = function(factor) {
  this.num *= 10n;
  this.cancel();
};



// whether the fraction and "other" are equal
Fraction.prototype.eq = function(other) {
  // should not be necessary for canceled fractions, but anyway ...
  return this.num*other.den == this.den*other.num;
};

// whether fraction is greater than "other"
Fraction.prototype.gt = function(other) {
  if (this.num > 0 && other.num <= 0)
    return true;
  if (this.num <= 0 && other.num > 0)
    return false;
  return this.num*other.den > this.den*other.num;
};

// whether fraction is greater than "other" or equal to it
Fraction.prototype.ge = function(other) {
  return this.gt(other) || this.eq(other);
};

// whether fraction is less than "other"
Fraction.prototype.lt = function(other) {
  return other.gt(this);
};

// whether fraction is less than "other" or equal to it
Fraction.prototype.le = function(other) {
  return this.lt(other) || this.eq(other);
};

// whether fraction is positive
Fraction.prototype.isPositive = function() {
  // remember that the denominator is always positive
  return this.num > 0;
};

// whether fraction is negative
Fraction.prototype.isNegative = function() {
  // remember that the denominator is always positive
  return this.num < 0;
};

// whether the fraction is equal to zero
Fraction.prototype.isZero = function() {
  return this.num == 0;
};

// returns the absolute value of the fraction as a NEW object
Fraction.prototype.abs = function() {
  return new Fraction(abs(this.num), this.den);
};

// string representation of the fraction; only used for debugging
Fraction.prototype.toString = function() {
  return (this.isNegative() ? "-" : "") + this.num.toString() + "/" + this.den.toString();
};

// computes the integer part of the fraction as a JavaScript integer;
// assumes that the fraction is positive!
Fraction.prototype.floor = function() {
  return Number(this.num/this.den);
};

// helper function which computes the product of "val" (a BigInt) and
// 10 to the "exp" power and returns it as a fraction
function fractionTimesPower10(val, exp) {
  if (exp >= 0) {
    const pow = 10n ** BigInt(exp);
    return new Fraction(val != 1 ? val*pow : pow);
  } else
    return new Fraction(val, 10n ** BigInt(-exp));
}

// helper function which computes the product of "val" (a BigInt) and
// 2 to the "exp" power and returns it as a fraction
function fractionTimesPower2(val, exp) {
  if (exp >= 0) {
    const pow = 1n << BigInt(exp);
    return new Fraction(val != 1 ? val*pow : pow);
  } else
    return new Fraction(val, 1n << BigInt(-exp));
}

// returns an approximation of the decadic logarithm of an integer
// (can be a BigInt) which is assumed to be positive
function intLog10(n) {
  const s = n.toString(10);
  return s.length + Math.log10(`0.${s.substring(0,15)}`);
}

// returns a rough approximation of the binary logarithm of an integer
// (can be a BigInt) which is assumed to be positive
function intLog2(n) {
  return n.toString(2).length;
}

// returns the ceiling of the decadic logarithm of the fraction as a
// JavaScript integer; assumes that its argument is positive
Fraction.prototype.log10 = function () {
  let cand = Math.ceil(intLog10(this.num)-intLog10(this.den)) - 2;
  while (fractionTimesPower10(1n, cand).lt(this))
    cand++;
  return cand;
};

// returns a rough approximation of the binary logarithm of the
// fraction as a JavaScript integer; assumes that its argument is
// positive
Fraction.prototype.log2 = function () {
  return intLog2(this.num)-intLog2(this.den);
};

// some constants
Fraction.ZERO = new Fraction(0, 1); // 0
Fraction.ONE = new Fraction(1, 1); // 1
Fraction.MINUSONE = new Fraction(-1, 1); // -1
Fraction.TWO = new Fraction(2, 1); // 2
Fraction.HALF = new Fraction(1, 2); // 1/2
Fraction.TENTEN = new Fraction(10**10, 1); // 10^10
Fraction.TENHUNDRED = new Fraction(10n**100n, 1); // 10^100
Fraction.TWOTEN = new Fraction(1024, 1); // 2^{10}
Fraction.TWOFIFTY = new Fraction(1125899906842624, 1); // 2^{50}
Fraction.TWOMINUSTEN = new Fraction(1, 1024); // 2^{-10}
Fraction.TWOMINUSFIFTY = new Fraction(1, 1125899906842624); // 2^{-50}