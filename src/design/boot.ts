/**
 * The last style, replayed before React exists.
 *
 * The server sends the page already carrying the default style, so a first
 * visit paints correctly from the very first frame. A returning visitor is a
 * different problem: their style lives in this browser's storage, which the
 * server cannot see, so the page would arrive as the default and snap to
 * theirs once the provider mounted.
 *
 * This script closes that gap. It runs synchronously, before the body is
 * parsed, and writes the declarations the last paint left behind. It replays
 * a stored result rather than recomputing it, so the arithmetic that turns a
 * config into a hundred custom properties exists in exactly one place
 * (`declarations.ts`) and cannot drift from what this writes.
 *
 * It is deliberately small and total: any failure leaves the server's default
 * in place, which is a correct style, merely not the visitor's.
 */
export const PAINT_KEY = "dynamic-ui:paint"

export const bootScript = `(function(){try{
var p=localStorage.getItem(${JSON.stringify(PAINT_KEY)});if(!p)return;
var d=JSON.parse(p),r=document.documentElement;
for(var k in d.style)r.style.setProperty(k,d.style[k]);
for(var a in d.data)r.setAttribute(a,d.data[a]);
r.classList.toggle('dark',!!d.dark);
}catch(e){}})()`
