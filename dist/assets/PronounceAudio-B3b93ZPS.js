async function r(n){if(!(n!=null&&n.trim()))return"missing";const t=`/assets/phonetics/${n}.mp3`;try{return await new Audio(t).play(),"played"}catch{return"missing"}}export{r as playPronounce};
