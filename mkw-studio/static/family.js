/* Shared family-concert colours and text runs for Canvas and Photoshop.
   OKLCH lightness 0.72; chroma is reduced only to stay inside sRGB.
   Colour space: https://www.w3.org/TR/css-color-4/#ok-lab */
(function(root){
 'use strict';
 const lightness=.72,chroma=.14;
 function oklchRGB(l,c,h){const a=c*Math.cos(h*Math.PI/180),b=c*Math.sin(h*Math.PI/180),L=(l+.3963377774*a+.2158037573*b)**3,M=(l-.1055613458*a-.0638541728*b)**3,S=(l-.0894841775*a-1.291485548*b)**3;return [4.0767416621*L-3.3077115913*M+.2309699292*S,-1.2684380046*L+2.6097574011*M-.3413193965*S,-.0041960863*L-.7034186147*M+1.707614701*S]}
 function swatch(name,h){let c=chroma,rgb=oklchRGB(lightness,c,h);while(rgb.some(v=>v<0||v>1)&&c>.001){c-=.001;rgb=oklchRGB(lightness,c,h)}const hex='#'+rgb.map(v=>Math.round(255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055)).toString(16).padStart(2,'0')).join('');return {name,hex,lightness,chroma:c,hue:h}}
 const palette=[['Koralle',25],['Himmelblau',245],['Gold',85],['Violett',290],['Mint',165],['Orange',55],['Türkis',200],['Rosa',335]].map(([n,h])=>swatch(n,h));
 const defaults=()=>({enabled:false,background:'#f4efdf',offset:0});
 const segments=text=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('de',{granularity:'grapheme'}).segment(String(text))].map(x=>x.segment):Array.from(String(text));
 function runs(text,offset=0){let n=offset;return segments(text).map(text=>{const visible=/\S/u.test(text),color=palette[((n%8)+8)%8].hex;if(visible)n++;return {text,color,visible,length:text.length}})}
 const count=text=>runs(text).filter(r=>r.visible).length;
 const api={palette,defaults,runs,count,outline:'#29313d',outlineWidth:2};if(typeof module!=='undefined')module.exports=api;else root.MKWFamily=api;
})(globalThis);
