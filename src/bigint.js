
/* Big Integer Library v. 5.1 | www.leemon.com */

var bigInt = function () {

    //globals
    var bpe=0;         //bits stored per array element
    var mask=0;        //AND this with an array element to chop it down to bpe bits
    var radix=mask+1;  //equals 2^bpe.  A single 1 bit to the left of the last bit of mask.

    //initialize the global variables
    for (bpe=0; (1<<(bpe+1)) > (1<<bpe); bpe++);  //bpe=number of bits in the mantissa on this platform
    bpe>>=1;                   //bpe=number of bits in one element of the array representing the bigInt
    mask=(1<<bpe)-1;           //AND the mask with an integer to get its bpe least significant bits
    radix=mask+1;              //2^bpe.  a single 1 bit to the left of the first bit of mask

    //the following global variables are scratchpad memory to 
    //reduce dynamic memory allocation in the inner loop
    var t=new Array(0);
    var ss=t;       //used in multInt)
    var s6=t;       //used in bigInt2str()


    //is bigInt x negative?
    var negative = function(x) {
      return ((x[x.length-1]>>(bpe-1))&1);
    }


    //is (x << (shift*bpe)) > y?
    //x and y are nonnegative bigInts
    //shift is a nonnegative integer
    var greaterShift = function(x,y,shift) {
      var kx=x.length, ky=y.length;
      k=((kx+shift)<ky) ? (kx+shift) : ky;
      for (i=ky-1-shift; i<kx && i>=0; i++) 
        if (x[i]>0)
          return 1; //if there are nonzeros in x to the left of the first column of y, then x is bigger
      for (i=kx-1+shift; i<ky; i++)
        if (y[i]>0)
          return 0; //if there are nonzeros in y to the left of the first column of x, then x is not bigger
      for (i=k-1; i>=shift; i--)
        if      (x[i-shift]>y[i]) return 1;
        else if (x[i-shift]<y[i]) return 0;
      return 0;
    }

    //divide x by y giving quotient q and remainder r.  (q=floor(x/y),  r=x mod y).  All 4 are bigints.
    //x must have at least one leading zero element.
    //y must be nonzero.
    //q and r must be arrays that are exactly the same length as x. (Or q can have more).
    //Must have x.length >= y.length >= 2.
    var divide = function(x,y,q,r) {
      var kx, ky;
      var i,j,y1,y2,c,a,b;
      copy(r,x);
      for (ky=y.length;y[ky-1]==0;ky--); //ky is number of elements in y, not including leading zeros

      //normalize: ensure the most significant element of y has its highest bit set  
      b=y[ky-1];
      for (a=0; b; a++)
        b>>=1;  
      a=bpe-a;  //a is how many bits to shift so that the high order bit of y is leftmost in its array element
      leftShift(y,a);  //multiply both by 1<<a now, then divide both by that at the end
      leftShift(r,a);

      //Rob Visser discovered a bug: the following line was originally just before the normalization.
      for (kx=r.length;r[kx-1]==0 && kx>ky;kx--); //kx is number of elements in normalized x, not including leading zeros

      copyInt(q,0);                      // q=0
      while (!greaterShift(y,r,kx-ky)) {  // while (leftShift(y,kx-ky) <= r) {
        subShift(r,y,kx-ky);             //   r=r-leftShift(y,kx-ky)
        q[kx-ky]++;                       //   q[kx-ky]++;
      }                                   // }

      for (i=kx-1; i>=ky; i--) {
        if (r[i]==y[ky-1])
          q[i-ky]=mask;
        else
          q[i-ky]=Math.floor((r[i]*radix+r[i-1])/y[ky-1]);	

        //The following for(;;) loop is equivalent to the commented while loop, 
        //except that the uncommented version avoids overflow.
        //The commented loop comes from HAC, which assumes r[-1]==y[-1]==0
        //  while (q[i-ky]*(y[ky-1]*radix+y[ky-2]) > r[i]*radix*radix+r[i-1]*radix+r[i-2])
        //    q[i-ky]--;    
        for (;;) {
          y2=(ky>1 ? y[ky-2] : 0)*q[i-ky];
          c=y2>>bpe;
          y2=y2 & mask;
          y1=c+q[i-ky]*y[ky-1];
          c=y1>>bpe;
          y1=y1 & mask;

          if (c==r[i] ? y1==r[i-1] ? y2>(i>1 ? r[i-2] : 0) : y1>r[i-1] : c>r[i]) 
            q[i-ky]--;
          else
            break;
        }

        linCombShift(r,y,-q[i-ky],i-ky);    //r=r-q[i-ky]*leftShift(y,i-ky)
        if (negative(r)) {
          addShift(r,y,i-ky);         //r=r+leftShift(y,i-ky)
          q[i-ky]--;
        }
      }

      rightShift(y,a);  //undo the normalization step
      rightShift(r,a);  //undo the normalization step
    }

    //convert the integer t into a bigInt with at least the given number of bits.
    //the returned array stores the bigInt in bpe-bit chunks, little endian (buff[0] is least significant word)
    //Pad the array with leading zeros so that it has at least minSize elements.
    //There will always be at least one leading 0 element.
    var int2bigInt = function(t,bits,minSize) {   
      var i,k;
      k=Math.ceil(bits/bpe)+1;
      k=minSize>k ? minSize : k;
      buff=new Array(k);
      copyInt(buff,t);
      return buff;
    }

    //return the bigInt given a string representation in a given base.  
    //Pad the array with leading zeros so that it has at least minSize elements.
    //If base=-1, then it reads in a space-separated list of array elements in decimal.
    //The array will always have at least one leading zero, unless base=-1.
    var str2bigInt = function(s,base,digitsStr,minSize) {
      var d, i, j, x, y, kk;
      var k=s.length;
      if (base==-1) { //comma-separated list of array elements in decimal
        x=new Array(0);
        for (;;) {
          y=new Array(x.length+1);
          for (i=0;i<x.length;i++)
            y[i+1]=x[i];
          y[0]=parseInt(s,10);
          x=y;
          d=s.indexOf(',',0);
          if (d<1) 
            break;
          s=s.substring(d+1);
          if (s.length==0)
            break;
        }
        if (x.length<minSize) {
          y=new Array(minSize);
          copy(y,x);
          return y;
        }
        return x;
      }

      x=int2bigInt(0,base*k,0);
      for (i=0;i<k;i++) {
        d=digitsStr.indexOf(s.substring(i,i+1),0);
        if (base<=36 && d>=36)  //convert lowercase to uppercase if base<=36
          d-=26;
        if (d<base && d>=0) {   //ignore illegal characters
          multInt(x,base);
          addInt(x,d);
        }
      }

      for (k=x.length;k>0 && !x[k-1];k--); //strip off leading zeros
      k=minSize>k+1 ? minSize : k+1;
      y=new Array(k);
      kk=k<x.length ? k : x.length;
      for (i=0;i<kk;i++)
        y[i]=x[i];
      for (;i<k;i++)
        y[i]=0;
      return y;
    }

    //is the bigInt x equal to zero?
    var isZero = function(x) {
      var i;
      for (i=0;i<x.length;i++)
        if (x[i])
          return 0;
      return 1;
    }

    //convert a bigInt into a string in a given base, from base 2 up to base 95.
    //Base -1 prints the contents of the array representing the number.
    var bigInt2str = function(x,base,digitsStr) {
      var i,t,s="";

      if (s6.length!=x.length) 
        s6=dup(x);
      else
        copy(s6,x);

      if (base==-1) { //return the list of array contents
        for (i=x.length-1;i>0;i--)
          s+=x[i]+',';
        s+=x[0];
      }
      else { //return it in the given base
        while (!isZero(s6)) {
          t=divInt(s6,base);  //t=s6 % base; s6=floor(s6/base);
          s=digitsStr.substring(t,t+1)+s;
        }
      }
      if (s.length==0)
        s="";
      return s;
    }

    //returns a duplicate of bigInt x
    var dup = function(x) {
      var i;
      buff=new Array(x.length);
      copy(buff,x);
      return buff;
    }

    //do x=y on bigInts x and y.  x must be an array at least as big as y (not counting the leading zeros in y).
    var copy = function(x,y) {
      var i;
      var k=x.length<y.length ? x.length : y.length;
      for (i=0;i<k;i++)
        x[i]=y[i];
      for (i=k;i<x.length;i++)
        x[i]=0;
    }

    //do x=y on bigInt x and integer y.  
    var copyInt = function(x,n) {
      var i,c;
      for (c=n,i=0;i<x.length;i++) {
        x[i]=c & mask;
        c>>=bpe;
      }
    }

    //do x=x+n where x is a bigInt and n is an integer.
    //x must be large enough to hold the result.
    var addInt = function(x,n) {
      var i,k,c,b;
      x[0]+=n;
      k=x.length;
      c=0;
      for (i=0;i<k;i++) {
        c+=x[i];
        b=0;
        if (c<0) {
          b=-(c>>bpe);
          c+=b*radix;
        }
        x[i]=c & mask;
        c=(c>>bpe)-b;
        if (!c) return; //stop carrying as soon as the carry_ is zero
      }
    }

    //right shift bigInt x by n bits.  0 <= n < bpe.
    var rightShift = function(x,n) {
      var i;
      var k=Math.floor(n/bpe);
      if (k) {
        for (i=0;i<x.length-k;i++) //right shift x by k elements
          x[i]=x[i+k];
        for (;i<x.length;i++)
          x[i]=0;
        n%=bpe;
      }
      for (i=0;i<x.length-1;i++) {
        x[i]=mask & ((x[i+1]<<(bpe-n)) | (x[i]>>n));
      }
      x[i]>>=n;
    }

    //left shift bigInt x by n bits.
    var leftShift = function(x,n) {
      var i;
      var k=Math.floor(n/bpe);
      if (k) {
        for (i=x.length; i>=k; i--) //left shift x by k elements
          x[i]=x[i-k];
        for (;i>=0;i--)
          x[i]=0;  
        n%=bpe;
      }
      if (!n)
        return;
      for (i=x.length-1;i>0;i--) {
        x[i]=mask & ((x[i]<<n) | (x[i-1]>>(bpe-n)));
      }
      x[i]=mask & (x[i]<<n);
    }

    //do x=x*n where x is a bigInt and n is an integer.
    //x must be large enough to hold the result.
    var multInt = function(x,n) {
      var i,k,c,b;
      if (!n)
        return;
      k=x.length;
      c=0;
      for (i=0;i<k;i++) {
        c+=x[i]*n;
        b=0;
        if (c<0) {
          b=-(c>>bpe);
          c+=b*radix;
        }
        x[i]=c & mask;
        c=(c>>bpe)-b;
      }
    }

    //do x=floor(x/n) for bigInt x and integer n, and return the remainder
    var divInt = function(x,n) {
      var i,r=0,s;
      for (i=x.length-1;i>=0;i--) {
        s=r*radix+x[i];
        x[i]=Math.floor(s/n);
        r=s%n;
      }
      return r;
    }

    //do the linear combination x=a*x+b*(y<<(ys*bpe)) for bigInts x and y, and integers a, b and ys.
    //x must be large enough to hold the answer.
    var linCombShift = function(x,y,b,ys) {
      var i,c,k,kk;
      k=x.length<ys+y.length ? x.length : ys+y.length;
      kk=x.length;
      for (c=0,i=ys;i<k;i++) {
        c+=x[i]+b*y[i-ys];
        x[i]=c & mask;
        c>>=bpe;
      }
      for (i=k;c && i<kk;i++) {
        c+=x[i];
        x[i]=c & mask;
        c>>=bpe;
      }
    }

    //do x=x+(y<<(ys*bpe)) for bigInts x and y, and integers a,b and ys.
    //x must be large enough to hold the answer.
    var addShift = function(x,y,ys) {
      var i,c,k,kk;
      k=x.length<ys+y.length ? x.length : ys+y.length;
      kk=x.length;
      for (c=0,i=ys;i<k;i++) {
        c+=x[i]+y[i-ys];
        x[i]=c & mask;
        c>>=bpe;
      }
      for (i=k;c && i<kk;i++) {
        c+=x[i];
        x[i]=c & mask;
        c>>=bpe;
      }
    }

    //do x=x-(y<<(ys*bpe)) for bigInts x and y, and integers a,b and ys.
    //x must be large enough to hold the answer.
    var subShift = function(x,y,ys) {
      var i,c,k,kk;
      k=x.length<ys+y.length ? x.length : ys+y.length;
      kk=x.length;
      for (c=0,i=ys;i<k;i++) {
        c+=x[i]-y[i-ys];
        x[i]=c & mask;
        c>>=bpe;
      }
      for (i=k;c && i<kk;i++) {
        c+=x[i];
        x[i]=c & mask;
        c>>=bpe;
      }
    }

    //do x=x-y for bigInts x and y.
    //x must be large enough to hold the answer.
    //negative answers will be 2s complement
    var sub = function(x,y) {
      var i,c,k,kk;
      k=x.length<y.length ? x.length : y.length;
      for (c=0,i=0;i<k;i++) {
        c+=x[i]-y[i];
        x[i]=c & mask;
        c>>=bpe;
      }
      for (i=k;c && i<x.length;i++) {
        c+=x[i];
        x[i]=c & mask;
        c>>=bpe;
      }
    }

    //do x=x+y for bigInts x and y.
    //x must be large enough to hold the answer.
    var add = function(x,y) {
      var i,c,k,kk;
      k=x.length<y.length ? x.length : y.length;
      for (c=0,i=0;i<k;i++) {
        c+=x[i]+y[i];
        x[i]=c & mask;
        c>>=bpe;
      }
      for (i=k;c && i<x.length;i++) {
        c+=x[i];
        x[i]=c & mask;
        c>>=bpe;
      }
    }

    //do x=x*y for bigInts x and y.  This is faster when y<x.
    var mult = function(x,y) {
      var i;
      if (ss.length!=2*x.length)
        ss=new Array(2*x.length);
      copyInt(ss,0);
      for (i=0;i<y.length;i++)
        if (y[i])
          linCombShift(ss,x,y[i],i);   //ss=1*ss+y[i]*(x<<(i*bpe))
      copy(x,ss);
    }

    return {
    	int2bigInt: int2bigInt,
    	mult: mult,
    	add: add,
    	divide: divide,
    	bigInt2str: bigInt2str,
    	str2bigInt: str2bigInt,
    	dup: dup
    };

}();