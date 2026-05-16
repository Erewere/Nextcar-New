const p = 239200;
const a = 6030.80;
const n = 60;
let r = 0.01;
for(let i=0; i<100; i++) {
  r = r - (r/(1-Math.pow(1+r, -n)) - a/p) / ((1-(1+n*r)*Math.pow(1+r, -n-1)) / Math.pow(1-Math.pow(1+r,-n), 2));
}
console.log("Monthly r:", r);
console.log("Annual r:", r * 12);
