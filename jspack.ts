/*
 * Copyright(c) 2008, Fair Oaks Labs, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 *
 *     * Redistributions of source code must retain the above copyright notice, this list
 *       of conditions and the following disclaimer.
 *
 *     * Redistributions in binary form must reproduce the above copyright notice, this
 *       list of conditions and the following disclaimer in the documentation and/or other
 *       materials provided with the distribution.
 *
 *     * Neither the name of Fair Oaks Labs, Inc. nor the names of its contributors may be
 *       used to endorse or promote products derived from this software without specific
 *       prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL
 * THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
 * THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

class JSPack{
  el: any;
  bBE = false;

  // Raw byte arrays
  _DeArray(a: any[], p: number, l: number){
    return [a.slice(p, p + l)];
  }

  _EnArray(a: any[], p: number, l: number, v: any[]){
    for(var i = 0; i < l; a[p + i] = v[i] ? v[i] : 0, i++);
  }

  // ASCII characters
  _DeChar(a: any[], p: number){
    return String.fromCharCode(a[p]);
  }

  _EnChar(a: any[], p: number, v: string){
    a[p] = v.charCodeAt(0);
  }

  // Little-endian(un)signed N-byte integers
  _DeInt = (a: any[], p: number) => {
    var lsb = this.bBE ? this.el.len - 1 : 0,
      nsb = this.bBE ? -1 : 1,
      stop = lsb + nsb * this.el.len,
      rv,
      i,
      f;
    for(rv = 0, i = lsb, f = 1; i != stop; rv += a[p + i] * f, i += nsb, f *= 256);
    if(this.el.bSigned && rv & Math.pow(2, this.el.len * 8 - 1)){
      rv -= Math.pow(2, this.el.len * 8);
    }
    return rv;
  }

  _EnInt = (a: any[], p: number, v: number) => {
    var lsb = this.bBE ? this.el.len - 1 : 0,
      nsb = this.bBE ? -1 : 1,
      stop = lsb + nsb * this.el.len,
      i;
    v = v < this.el.min ? this.el.min : v > this.el.max ? this.el.max : v;
    for(i = lsb; i != stop; a[p + i] = v & 0xff, i += nsb, v >>= 8);
  }

  // ASCII character strings
  _DeString(a: any[], p: number, l: number){
    for(var rv = new Array(l), i = 0; i < l; rv[i] = String.fromCharCode(a[p + i]), i++);
    return rv.join("");
  }

  _EnString(a: any, p: number, l: number, v: string){
    for(var t, i = 0; i < l; a[p + i] =(t = v.charCodeAt(i)) ? t : 0, i++);
  }

  // Little-endian N-bit IEEE 754 floating point
  _De754(a: any[], p: number){
    var s, e, m, i, d, nBits, mLen, elen, eBias, eMax;
    (mLen = this.el.mLen),(elen = this.el.len * 8 - this.el.mLen - 1),(eMax =(1 << elen) - 1),(eBias = eMax >> 1);

    i = this.bBE ? 0 : this.el.len - 1;
    d = this.bBE ? 1 : -1;
    s = a[p + i];
    i += d;
    nBits = -7;
    for(
      e = s &((1 << -nBits) - 1), s >>= -nBits, nBits += elen;
      nBits > 0;
      e = e * 256 + a[p + i], i += d, nBits -= 8
    );
    for(
      m = e &((1 << -nBits) - 1), e >>= -nBits, nBits += mLen;
      nBits > 0;
      m = m * 256 + a[p + i], i += d, nBits -= 8
    );

    switch(e){
      case 0:
        // Zero, or denormalized number
        e = 1 - eBias;
        break;
      case eMax:
        // NaN, or +/-Infinity
        return m ? NaN :(s ? -1 : 1) * Infinity;
      default:
        // Normalized number
        m = m + Math.pow(2, mLen);
        e = e - eBias;
        break;
    }
    return(s ? -1 : 1) * m * Math.pow(2, e - mLen);
  }

  _En754(a: any[], p: number, v: number){
    var s, e, m, i, d, c, mLen, elen, eBias, eMax;
    (mLen = this.el.mLen),(elen = this.el.len * 8 - this.el.mLen - 1),(eMax =(1 << elen) - 1),(eBias = eMax >> 1);

    s = v < 0 ? 1 : 0;
    v = Math.abs(v);
    if(isNaN(v) || v == Infinity){
      m = isNaN(v) ? 1 : 0;
      e = eMax;
    } else{
      e = Math.floor(Math.log(v) / Math.LN2); // Calculate log2 of the value
      if(v *(c = Math.pow(2, -e)) < 1){
        e--;
        c *= 2;
      } // Math.log() isn't 100% rthis.eliable

      // Round by adding 1/2 the significand's LSD
      if(e + eBias >= 1){
        v += this.el.rt / c;
      } // Normalized:  mLen significand digits
      else{
        v += this.el.rt * Math.pow(2, 1 - eBias);
      } // Denormalized:  <= mLen significand digits
      if(v * c >= 2){
        e++;
        c /= 2;
      } // Rounding can increment the exponent

      if(e + eBias >= eMax){
        // Overflow
        m = 0;
        e = eMax;
      } else if(e + eBias >= 1){
        // Normalized - term order matters, as Math.pow(2, 52-e) and v*Math.pow(2, 52) can overflow
        m =(v * c - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else{
        // Denormalized - also catches the '0' case, somewhat by chance
        m = v * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }

    for(
      i = this.bBE ? this.el.len - 1 : 0, d = this.bBE ? -1 : 1;
      mLen >= 8;
      a[p + i] = m & 0xff, i += d, m /= 256, mLen -= 8
    );
    for(e =(e << mLen) | m, elen += mLen; elen > 0; a[p + i] = e & 0xff, i += d, e /= 256, elen -= 8);
    a[p + i - d] |= s * 128;
  }

  // Class data
  _sPattern = "(\\d+)?([AxcbBhHsfdiIlL])";
  _lenLut: {[key: string]: any} ={A: 1, x: 1, c: 1, b: 1, B: 1, h: 2, H: 2, s: 1, f: 4, d: 8, i: 4, I: 4, l: 4, L: 4};
  _elLut = {
    A: {en: this._EnArray, de: this._DeArray},
    s: {en: this._EnString, de: this._DeString},
    c: {en: this._EnChar, de: this._DeChar},
    b: {en: this._EnInt, de: this._DeInt, len: 1, bSigned: true, min: -Math.pow(2, 7), max: Math.pow(2, 7) - 1},
    B: {en: this._EnInt, de: this._DeInt, len: 1, bSigned: false, min: 0, max: Math.pow(2, 8) - 1},
    h: {en: this._EnInt, de: this._DeInt, len: 2, bSigned: true, min: -Math.pow(2, 15), max: Math.pow(2, 15) - 1},
    H: {en: this._EnInt, de: this._DeInt, len: 2, bSigned: false, min: 0, max: Math.pow(2, 16) - 1},
    i: {en: this._EnInt, de: this._DeInt, len: 4, bSigned: true, min: -Math.pow(2, 31), max: Math.pow(2, 31) - 1},
    I: {en: this._EnInt, de: this._DeInt, len: 4, bSigned: false, min: 0, max: Math.pow(2, 32) - 1},
    l: {en: this._EnInt, de: this._DeInt, len: 4, bSigned: true, min: -Math.pow(2, 31), max: Math.pow(2, 31) - 1},
    L: {en: this._EnInt, de: this._DeInt, len: 4, bSigned: false, min: 0, max: Math.pow(2, 32) - 1},
    f: {en: this._En754, de: this._De754, len: 4, mLen: 23, rt: Math.pow(2, -24) - Math.pow(2, -77)},
    d: {en: this._En754, de: this._De754, len: 8, mLen: 52, rt: 0},
  };

  // Unpack a series of n this.elements of size s from array a at offset p with fxn
  _UnpackSeries(n: number, s: number, a: any[], p: number){
    for(var fxn = this.el.de, rv = [], i = 0; i < n; rv.push(fxn(a, p + i * s)), i++);
    return rv;
  }

  // Pack a series of n this.elements of size s from array v at offset i to array a at offset p with fxn
  _PackSeries(n: number, s: number, a: any[], p: number, v: any[], i: number){
    for(var fxn = this.el.en, o = 0; o < n; fxn(a, p + o * s, v[i + o]), o++);
  }

  // Unpack the octet array a, beginning at offset p, according to the fmt string
  Unpack(fmt: string, a: any[] | Uint8Array, p?: number){
    a = Array.from(a);

    // Set the private this.bBE flag based on the format string - assume big-endianness
    this.bBE = fmt.charAt(0) != "<";

    p = p ? p : 0;
    var re = new RegExp(this._sPattern, "g"),
      m,
      n,
      s,
      rv = [];
    while((m = re.exec(fmt))){
      n = m[1] == undefined || m[1] == "" ? 1 : parseInt(m[1]);
      s = this._lenLut[m[2]];
      if(p + n * s > a.length){
        return [];
      }
      switch(m[2]){
        case "A":
        case "s":
          rv.push(this._elLut[m[2]].de(a, p, n));
          break;
        case "c":
        case "b":
        case "B":
        case "h":
        case "H":
        case "i":
        case "I":
        case "l":
        case "L":
        case "f":
        case "d":
          this.el = this._elLut[m[2]];
          rv.push(this._UnpackSeries(n, s, a, p));
          break;
      }
      p += n * s;
    }
    return Array.prototype.concat.apply([], rv);
  }

  // Pack the supplied values into the octet array a, beginning at offset p, according to the fmt string
  PackTo(fmt: string, a: any[], p: number, values: any[]){
    // Set the private this.bBE flag based on the format string - assume big-endianness
    this.bBE = fmt.charAt(0) != "<";

    var re = new RegExp(this._sPattern, "g"),
      m,
      n,
      s,
      i = 0,
      j;
    while((m = re.exec(fmt))){
      n = m[1] == undefined || m[1] == "" ? 1 : parseInt(m[1]);
      s = this._lenLut[m[2]];
      if(p + n * s > a.length){
        return false;
      }
      switch(m[2]){
        case "A":
        case "s":
          if(i + 1 > values.length){
            return false;
          }
          this._elLut[m[2]].en(a, p, n, values[i]);
          i += 1;
          break;
        case "c":
        case "b":
        case "B":
        case "h":
        case "H":
        case "i":
        case "I":
        case "l":
        case "L":
        case "f":
        case "d":
          this.el = this._elLut[m[2]];
          if(i + n > values.length){
            return false;
          }
          this._PackSeries(n, s, a, p, values, i);
          i += n;
          break;
        case "x":
          for(j = 0; j < n; j++){
            a[p + j] = 0;
          }
          break;
      }
      p += n * s;
    }
    return a;
  }

  // Pack the supplied values into a new octet array, according to the fmt string
  Pack(fmt: string, values: any[]){
    return this.PackTo(fmt, new Array(this.CalcLength(fmt)), 0, values);
  }

  // Determine the number of bytes represented by the format string
  CalcLength(fmt: string){
    var re = new RegExp(this._sPattern, "g"),
      m,
      sum = 0;
    while((m = re.exec(fmt))){
      sum +=(m[1] == undefined || m[1] == "" ? 1 : parseInt(m[1])) * this._lenLut[m[2]];
    }
    return sum;
  }
}

const jspack = new JSPack();
export default jspack;
