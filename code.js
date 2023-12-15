


const ieees = [];

// converts binary numbers (given as a string) into a hexadecimal
// number; assumes length of "binStr" is divisible by 4
function binStrToHex(binStr) {
  let hexStr = "";
  for (let i = 0; i+3 < binStr.length; i += 4)
    hexStr += parseInt(binStr.slice(i,i+4),2).toString(16);
  return hexStr.toUpperCase();
}

// utility function to get or set values of fields (some of which are
// text elements while others are input boxes)
function content(id, number, newValue) {
  let sel = document.getElementById(`${id}${number}`);
  if (["in", "sign", "hidden", "mantissa", "exp"].indexOf(id) == -1) {
    if (newValue === undefined)
      newValue = sel.textContent;
    else
      sel.textContent = newValue;
  } else {
    if (newValue === undefined)
      newValue = sel.value;
    else
      sel.value = newValue;
  }
  return newValue;
}

// updates all HTML elements (including the input box on the left) for
// the ith number
function setAllBits(i) {
  const ieee = ieees[i];
  let binStr = (ieee.minus || ieee.nan) ? "1" : "0";
  let expStr = Number(ieee.exp + IEEE.NaNExp - 1).toString(2);
  expStr = "0".repeat(IEEE.numberOfBits - IEEE.mantissaLen - 1 - expStr.length) + expStr;
  content("exp", i, expStr);
  binStr += expStr;
  const mantissaStr = ieee.mantissa.join("");
  content("mantissa", i, mantissaStr);
  binStr += mantissaStr;
  content("binOut", i, "0b" + binStr);
  content("hexOut", i, "0x" + binStrToHex(binStr));
  if (ieee.nan) {
    content("hidden", i, " ");
    content("sign", i, "1");
    content("signOut", i, "");
    content("mantissaOut", i, "NaN");
    content("expOut", i, "");
    content("in", i, "NaN");
    return;
  }
  content("sign", i, ieee.minus ? "1" : "0");
  content("signOut", i, ieee.minus ? "-" : "+");
  if (ieee.inf) {
    content("hidden", i, " ");
    content("mantissaOut", i, "Inf");
    content("expOut", i, "");
    content("in", i, (ieee.minus ? "-" : "") + "Inf");
    return;
  }
  if (ieee.isZero()) {
    content("hidden", i, "0");
    content("mantissaOut", i, "0.0");
    content("expOut", i, "+0");
    content("in", i, (ieee.minus ? "-" : "") + "0.0");
    return;
  }
  let exp = ieee.exp;
  if (exp == 1 - IEEE.NaNExp) {
    // denormalized
    content("hidden", i, "0");
    content("expOut", i, 2 - IEEE.NaNExp);
  } else {
    content("hidden", i, "1");
    if (exp >= 0)
      exp = "+" + exp;
    content("expOut", i, exp);
  }
  content("mantissaOut", i, decMantissa(ieee)); 
  content("in", i, ieee.decimalOutput());
}

// mantissa of ieee as a decimal string
function decMantissa(ieee)
 { 
  const mantissa = new IEEE(ieee.val);
  mantissa.minus = false;
  mantissa.updateBits();
  // remove exponent
  mantissa.exp = 0;
  if (ieee.exp == 1 - IEEE.NaNExp) {
    // special treatment for denormalized numbers
    const index = mantissa.mantissa.indexOf(1) + 1;
    mantissa.mantissa = mantissa.mantissa.slice(index)
      .concat(new Array(index).fill(0));
    mantissa.exp = -index;
  }
  mantissa.fromBits();
  return mantissa.decimalOutput();
}

// returns a function to read and update the ith number
function inUpdater(i) {
  return () => {
    ieees[i] = IEEE.parse(content("in", i));
    // number is read, then converted to bits, then the number
    // corresponding to the bit pattern is stored and displayed
    ieees[i].updateBits();
    ieees[i].fromBits();
    setAllBits(i);
  };
}

// returns an IEEE object assembled from the HTML input boxes
// representing the bits on the right side for the ith number
function readBitInput(i) {
  const ieee = new IEEE(0);
  ieee.minus = (content("sign", i) == "1");
  let mantissaStr = content("mantissa", i);
  mantissaStr = mantissaStr.replaceAll(/[^01]/g, "0");
  if (mantissaStr == "")
    mantissaStr = "0";
  // fill with zeros to the right (!)
  mantissaStr = mantissaStr + "0".repeat(IEEE.mantissaLen - mantissaStr.length);
  ieee.mantissa = mantissaStr.split("").map(x => parseInt(x));
  let expStr = content("exp", i);
  if (expStr.length != "" && (expStr[0] == "+" || expStr[0] == "-")) {
    // exponent was entered as a decimal number
    const minus = (expStr[0] == "-");
    expStr = expStr.replaceAll(/[^0-9]/g, "");
    if (expStr == "")
      expStr = "0";
    let exp = parseInt(expStr, 10);
    if (minus)
      exp = -exp;
    ieee.exp = (exp < IEEE.NaNExp && exp > 1 - IEEE.NaNExp) ? exp : 0;
  } else {
    // otherwise assume bit pattern
    expStr = expStr.replaceAll(/[^01]/g, "0");
    if (expStr == "")
      expStr = "0";
    ieee.exp = parseInt(expStr, 2) - IEEE.NaNExp + 1;
  }
  ieee.fromBits();
  return ieee;
}

// returns a function to update the ith number from the bit patterns
// on the right
function outUpdater(i) {
  return () => {
    ieees[i] = readBitInput(i);
    setAllBits(i);
  };
}

// computes the sum of ieees[1] and summand2 (which by default is
// ieees[2]) and returns it as an IEEE object; assumes that its
// arguments aren't NaNs
function addThem(summand2) {
  summand2 = summand2 || ieees[2];
  // treat Inf first
  if (ieees[1].inf || summand2.inf) {
    if (!summand2.inf)
      return IEEE.newInf(ieees[1].minus);
    if (!ieees[1].inf)
      return IEEE.newInf(summand2.minus);
    if (ieees[1].minus == summand2.minus)
      return IEEE.newInf(ieees[1].minus);
    return IEEE.newNaN();
  }
  // special case, see https://en.wikipedia.org/wiki/Signed_zero
  if (ieees[1].isZero() && summand2.isZero && ieees[1].minus && summand2.minus)
    return IEEE.newNegZero();
  let val;
  // do the right thing depending on the sign
  if ((!ieees[1].minus) == (!summand2.minus)) {
    val = ieees[1].val.add(summand2.val);
    if (ieees[1].minus)
      val = val.mult(Fraction.MINUSONE);
  } else {
    if (ieees[1].minus)
      val = summand2.val.sub(ieees[1].val);
    else
      val = ieees[1].val.sub(summand2.val);
  }
  return new IEEE(val);
}

// computes the difference of ieees[1] and ieees[2] and returns it as
// an IEEE object; assumes that its arguments aren't NaNs
function subtractThem() {
  const subtrahend = ieees[2].inf ? IEEE.newInf(ieees[2].minus) : new IEEE(ieees[2].val);
  subtrahend.minus = !ieees[2].minus;
  return addThem(subtrahend);
}

// computes the product of ieees[1] and ieees[2] and returns it as an
// IEEE object; assumes that its arguments aren't NaNs
function multiplyThem() {
  const signsDiffer = (!ieees[1].minus) != (!ieees[2].minus);
  // treat Inf first
  if (ieees[1].inf || ieees[2].inf) {
    if (ieees[1].isZero() || ieees[2].isZero())
      return IEEE.newNaN();
    return IEEE.newInf(signsDiffer);
  }
  const product = new IEEE(ieees[1].val.mult(ieees[2].val));
  product.minus = signsDiffer;
  return product;
}

// computes the quotient of ieees[1] and ieees[2] and returns it as an
// IEEE object; assumes that its arguments aren't NaNs
function divideThem() {
  const signsDiffer = (!ieees[1].minus) != (!ieees[2].minus);
  // treat Infs first
  if (ieees[1].inf && ieees[2].inf)
    return IEEE.newNaN();
  if (ieees[1].inf)
    return IEEE.newInf(signsDiffer);
  if (ieees[2].inf)
    return signsDiffer ? IEEE.newNegZero() : new IEEE(0);
  if (ieees[2].isZero()) {
    if (ieees[1].isZero())
      return IEEE.newNaN();
    else
      return IEEE.newInf(signsDiffer);
  }
  const quotient = new IEEE(ieees[1].val.div(ieees[2].val));
  quotient.minus = signsDiffer;
  return quotient;
}

// fixed global update functions; see "inUpdater" above
const inUpdater1 = inUpdater(1);
const inUpdater2 = inUpdater(2);

// generates and returns a callback for one of the arithmetic buttons;
// "fn" will be something like "divideThem" above
function generateComputer(fn) {
  return () => {
    // update arguments first, just in case
    inUpdater1();
    inUpdater2();
    // treat NaNs before calling the actual function
    if (ieees[1].nan || ieees[2].nan)
      ieees[3] = IEEE.newNaN();
    else
      ieees[3] = fn();
    // set the bits of the result; so far, only the fraction (val) is
    // correct
    ieees[3].updateBits();
    ieees[3].fromBits();
    // update HTML page
    setAllBits(3);
  };
}

// called at page start and whenever the user presses a button to
// change the binary format
function init(size) {
  if (size)
    window.scrollTo(0,0);
  size = size || 64;
  let sizes = [16, 32, 64, 128];
  if (sizes.indexOf(size) == -1)
    size = 64;
  
  // reset global constants
  IEEE.switchBitSize(size);

  for (let i = 1; i <= 3; i++) {
    // resize some input boxes
    document.getElementById(`in${i}`).size = size == 16 ? 20 : size == 128 ? 40 : 30;
    const mantissaEl = document.getElementById(`mantissa${i}`);
    mantissaEl.size = IEEE.mantissaLen;
    mantissaEl.maxLength = IEEE.mantissaLen;
    const expEl = document.getElementById(`exp${i}`);
    expEl.size = IEEE.numberOfBits - IEEE.mantissaLen - 1;
    expEl.maxLength = IEEE.numberOfBits - IEEE.mantissaLen - 1;
    
    // initially fill all numbers with zeros and update the HTML page
    // accordingly
    ieees[i] = new IEEE(0);
    ieees[i].updateBits();
    content("in", i, "0.0");
    content("sign", i, "0");
    content("hidden", i, "0");
    content("mantissa", i, "0".repeat(IEEE.mantissaLen));
    content("exp", i, "0".repeat(IEEE.numberOfBits - IEEE.mantissaLen - 1));
    content("signOut", i, "+");
    content("mantissaOut", i, "0.0");
    content("expOut", i, "+0");
    content("binOut", i, "0b" + "0".repeat(IEEE.numberOfBits));
    content("hexOut", i, "0x" + "0".repeat(IEEE.numberOfBits / 4));

    // callbacks for the interactive elements
    document.getElementById(`in${i}`).onchange = inUpdater(i);
    for (let id of ["sign", "mantissa", "exp"])
      document.getElementById(`${id}${i}`).onchange = outUpdater(i);
  }
  document.getElementById("plusButton").onclick = generateComputer(addThem);
  document.getElementById("minusButton").onclick = generateComputer(subtractThem);
  document.getElementById("timesButton").onclick = generateComputer(multiplyThem);
  document.getElementById("divButton").onclick = generateComputer(divideThem);
  for (let n of sizes)
    document.getElementById(`sizeButton${n}`).onclick = () => init(n);
}

// call "init" once page loading has finished
window.onload = init;