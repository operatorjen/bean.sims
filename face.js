const NS='http://www.w3.org/2000/svg',
      h=x=>[...''+x].reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))|0,0),
      rnum=k0=>{let k=k0>>>0;return()=>((k=(k*1664525+1013904223)>>>0)/4294967296)},
      makeRNG=s=>rnum(h(s)),
      AGE=y=>new Date().getFullYear()-y;
export{h as hashString,makeRNG};

export function generateFace(s,z=60){
  const{traits:t,conditions:c,birthYear:y}=s,
        R=makeRNG(`${t.physical}${t.mental}${t.spiritual}${c.anxiety}${c.health}`),
        x=z/2,m=AGE(y),svg=document.createElementNS(NS,'svg'),
        a=t.physical+t.mental+t.spiritual+c.anxiety+c.health,N=(30+50*c.anxiety)|0;
  svg.setAttribute('class','avatar');
  svg.setAttribute('viewBox',`0 0 ${z} ${z}`);
  svg.setAttribute('width',z);
  svg.setAttribute('height',z);
  const poly=document.createElementNS(NS,'polygon'),
        pts=Array.from({length:N},(_,i)=>{const θ=-Math.PI/2+2*Math.PI*i/N,
              r=z*0.35+R()*c.anxiety*(1-t.physical)*z*0.175+t.physical*z*0.105;
          return`${x+Math.cos(θ)*r},${x+Math.sin(θ)*r}`}).join(' ');
  poly.setAttribute('points',pts);
  poly.setAttribute('fill',`hsl(${Math.floor(a*82)},${80+R()*120}%,${60+R()*20}%)`);
  svg.appendChild(poly);
  const eyey=x*0.8+(m<20?-4:m>60?4:0),rx=z*(0.03+t.mental*0.07);
  [-1,1].forEach(d=>{const g=document.createElementNS(NS,'g'),e=document.createElementNS(NS,'ellipse');
    g.setAttribute('transform',`translate(${x+d*rx*3.5},${eyey})`);
    e.setAttribute('rx',rx);
    e.setAttribute('ry',rx*(0.6+R()*0.35));
    e.setAttribute('fill','black');
    g.appendChild(e);
    svg.appendChild(g)
  });
  const mouth=document.createElementNS(NS,'ellipse');
  mouth.setAttribute('cx',x);
  mouth.setAttribute('cy',x+z*0.05+(m<20?-5:m>60?5:0));
  mouth.setAttribute('rx',z*(0.04*c.anxiety)+R()*z/4);
  mouth.setAttribute('ry',z*(0.08*c.anxiety)+R()*z*t.mental*0.1);
  mouth.setAttribute('fill','rgba(75,5,16,0.94)');
  svg.appendChild(mouth);
  return svg;
}

export function updateFace(prev,s,z=60){
  if (!prev||!prev.parentNode) return;
  const n=generateFace(s,z);n.setAttribute('class','avatar');
  prev.parentNode.replaceChild(n,prev);return n;
}
