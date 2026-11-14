(()=>{'use strict';
const $=s=>document.querySelector(s), mods=[
{id:'move',name:'运动',en:'MOVEMENT',sub:'步数 · 跑步 · 记录',lede:'让身体先行动，让每一天有一个好的开始。',rows:[['早晨步数','06:30 以前，向 500 步的目标迈进。'],['跑步记录','记录距离与时长，看见每一次向前。']]},
{id:'read',name:'读书',en:'READING',sub:'书页 · 摘录 · 感悟',lede:'读过的文字，成为自己的见解，也成为彼此的启发。',rows:[['我的书籍','保存封面，整理自己的阅读记录。'],['阅读分享','留下摘录和感悟，与大家分享。'],['阅读进度','看见一本书，如何被一点点读完。']]},
{id:'visit',name:'拜访',en:'VISIT',sub:'拍照 · 记录 · 回顾',lede:'一次见面，一次连接。把走过的每一步留下来。',rows:[['记录拜访','拍一张照片，记录一次拜访。'],['我的记录','按时间回顾保存的拜访照片。'],['拜访统计','查看个人拜访次数。']]}
];
let p=0,selected=0,raf=0,drag=null,target=0,velocity=0,lastFrame=0;
let motionMode='snap',wheelTimer=0,wheelGesture=false,wheelStart=0,wheelDistance=0,lastWheelDelta=0;const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches, mod=n=>((n%3)+3)%3, wrap=n=>mod(n+1.5)-1.5;
$('#track').innerHTML=mods.map((m,i)=>`<div class="slot" data-i="${i}"><div class="poster photo-${m.id}" style="--photo:url('assets/${m.id}.jpg')"><div class="glass-refraction"></div><img class="module-photo" src="assets/${m.id}.jpg" alt="" draggable="false" width="1200" height="800"><div class="photo-shade"></div><span class="photo-caption">${m.name}</span><div class="glass-edge"></div></div></div>`).join('');
$('#navItems').innerHTML=mods.map((m,i)=>`<button class="nav-item" data-i="${i}" aria-current="${i===0}" aria-label="${m.name}${i===0?'，点击进入':'，点击选中'}">${m.name}</button>`).join('');
const slots=[...document.querySelectorAll('.slot')],nav=[...document.querySelectorAll('.nav-item')],wheel=$('#wheel');
function draw(){
  const angleStep=58*Math.PI/180;
  const radius=wheel.clientWidth*.51/Math.sin(angleStep);
  for(const [i,el] of slots.entries()){
    const d=wrap(i-p),a=Math.abs(d),angle=d*angleStep;
    const opacity=Math.max(0,Math.cos(a*Math.PI/3));
    el.style.transform=`translate3d(0,${(radius*Math.sin(angle)).toFixed(3)}px,${(radius*(Math.cos(angle)-1)*.38).toFixed(3)}px) rotateX(${-d*58}deg)`;
    el.style.opacity=opacity.toFixed(4);
    el.style.visibility=opacity<.008?'hidden':'visible';
    el.style.pointerEvents=a>1.25?'none':'auto';
  }
  const i=mod(Math.round(p));
  if(selected!==i){selected=i;update();}
}
function update(){nav.forEach((b,i)=>{b.setAttribute('aria-current',String(i===selected));b.setAttribute('aria-label',mods[i].name+(i===selected?'，点击进入':'，点击选中'));});wheel.setAttribute('aria-label',`${mods[selected].name}已选中。上下拖动切换，点击当前画面或按 Enter 进入`);}
function stop(){
  cancelAnimationFrame(raf);raf=0;lastFrame=0;velocity=0;
  clearTimeout(wheelTimer);wheelTimer=0;wheelGesture=false;
}
function settle(){
  p=mod(Math.round(p));target=p;velocity=0;motionMode='snap';
  draw();update();$('#live').textContent=`已选择${mods[selected].name}`;
}
// One continuous motion model: changing its destination preserves position and velocity.
function startMotion(){
  if(raf)return;
  lastFrame=performance.now();
  function tick(now){
    const dt=Math.min(.064,Math.max(.001,(now-lastFrame)/1000));lastFrame=now;
    const omega=motionMode==='follow'?32:24;
    const offset=p-target,b=velocity+omega*offset,decay=Math.exp(-omega*dt);
    p=target+(offset+b*dt)*decay;
    velocity=(velocity-omega*b*dt)*decay;
    draw();
    if(Math.abs(p-target)<.0008&&Math.abs(velocity)<.018){
      p=target;raf=0;draw();
      if(!wheelGesture)settle();
    }else raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);
}
function go(destination,initialVelocity){
  clearTimeout(wheelTimer);wheelTimer=0;wheelGesture=false;motionMode='snap';target=destination;
  if(initialVelocity!==undefined)velocity=Math.max(-12,Math.min(12,initialVelocity));
  if(reduced()){stop();p=destination;settle();return;}
  startMotion();
}
function step(direction){go((raf&&motionMode==='snap'?Math.round(target):Math.round(p))+direction);}
function choose(i){go(p+wrap(i-p));}
function activate(i){
  if(mod(Math.round(p))===i&&Math.abs(p-Math.round(p))<.08){stop();settle();open(i);}
  else choose(i);
}
wheel.addEventListener('pointerdown',e=>{
  if(e.button!==0||drag)return;stop();
  const now=performance.now();
  drag={id:e.pointerId,y:e.clientY,x:e.clientX,from:p,lastT:now,moved:false,samples:[{y:e.clientY,t:now}],item:e.target.closest('.slot')?.dataset.i};
  wheel.setPointerCapture(e.pointerId);wheel.classList.add('dragging');
});
wheel.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  const dy=e.clientY-drag.y;
  if(Math.abs(dy)>11||Math.abs(e.clientX-drag.x)>11)drag.moved=true;
  if(!drag.moved)return;
  const now=performance.now();drag.lastT=now;drag.samples.push({y:e.clientY,t:now});
  while(drag.samples.length>2&&now-drag.samples[0].t>85)drag.samples.shift();
  p=drag.from-dy/(wheel.clientWidth*.51*1.45);target=p;draw();
});
function release(e,cancel=false){
  if(!drag||drag.id!==e.pointerId)return;
  const d=drag;drag=null;wheel.classList.remove('dragging');
  if(wheel.hasPointerCapture(e.pointerId))wheel.releasePointerCapture(e.pointerId);
  if(d.moved||cancel){
    let speed=0;
    if(!cancel&&performance.now()-d.lastT<95&&d.samples.length>1){
      const first=d.samples[0],last=d.samples[d.samples.length-1];
      speed=-(last.y-first.y)/Math.max(12,last.t-first.t)*1000/(wheel.clientWidth*.51*1.45);
    }
    speed=Math.max(-12,Math.min(12,speed));
    const nearest=Math.round(p),start=Math.round(d.from);
    const glideLimit=Math.min(.55,Math.abs(p-d.from)*1.3);
    let destination=Math.round(p+Math.max(-glideLimit,Math.min(glideLimit,speed*.08)));
    if(!cancel&&Math.abs(speed)>3.5&&Math.abs(p-d.from)>.18&&destination===start)destination=start+Math.sign(speed);
    const rangeBase=Math.abs(p-d.from)<1.05?start:nearest;
    destination=Math.max(rangeBase-1,Math.min(rangeBase+1,destination));
    go(destination,speed);
  }else if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>6)go(Math.round(p));
  else if(d.item!==undefined)activate(Number(d.item));
  else go(Math.round(p));
}
wheel.addEventListener('pointerup',e=>release(e));
wheel.addEventListener('pointercancel',e=>release(e,true));
wheel.addEventListener('lostpointercapture',e=>{if(drag)release(e,true);});
wheel.addEventListener('wheel',e=>{
  if(e.ctrlKey||e.metaKey||drag||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
  e.preventDefault();
  const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?wheel.clientHeight:1);
  if(!pixels)return;
  if(!wheelGesture){wheelGesture=true;wheelStart=Math.round(p);wheelDistance=0;target=p;lastWheelDelta=0;}
  const delta=pixels/(wheel.clientWidth*.51)*.5;
  if(lastWheelDelta&&Math.sign(delta)!==Math.sign(lastWheelDelta))target=p;
  lastWheelDelta=delta;wheelDistance+=delta;target+=delta;motionMode='follow';
  if(!reduced())startMotion();
  clearTimeout(wheelTimer);
  wheelTimer=setTimeout(()=>{
    let destination=Math.round(target);
    if(destination===wheelStart&&Math.abs(wheelDistance)>.42)destination=wheelStart+Math.sign(wheelDistance);
    go(destination);
  },110);
},{passive:false});
nav.forEach((b,i)=>b.addEventListener('click',()=>routeIndex>=0?open(i):activate(i)));
wheel.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();step(e.key==='ArrowDown'?1:-1);}if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(mod(Math.round(p)));}});
let routeIndex=-1,routeVersion=0;const running=new Set(),rail=$('.module-nav');let railPlaceholder=null;
const pageEase='cubic-bezier(.76,0,.24,1)';
function revealBack(){const button=$('#back');if(!button.hidden)return;button.hidden=false;animate(button,[{opacity:0},{opacity:1}],220);}
function animate(el,frames,duration=680){if(reduced())return Promise.resolve();const a=el.animate(frames,{duration,easing:pageEase,fill:'both'});running.add(a);return a.finished.catch(()=>{}).finally(()=>{running.delete(a);a.cancel();});}
function dockRail(){if(railPlaceholder)return Promise.resolve();const from=rail.getBoundingClientRect();railPlaceholder=document.createElement('div');railPlaceholder.style.cssText=`width:${from.width}px;height:${from.height}px;flex:none`;rail.replaceWith(railPlaceholder);document.body.appendChild(rail);rail.classList.add('docked');const to=rail.getBoundingClientRect();return animate(rail,[{transform:`translate(${from.x-to.x}px,${from.y-to.y}px)`},{transform:'translate(0,0)'}]);}
function fillDetail(i){const m=mods[i];stop();p=i;selected=i;draw();update();$('#detailTitle').textContent=m.name;$('#detailIndex').textContent=`0${i+1}`;$('#detailLede').textContent=m.lede;$('#detailRows').innerHTML=m.rows.map((r,k)=>`<div class="detail-row"><span class="row-no">0${k+1}</span><div><h2>${r[0]}</h2><p>${r[1]}</p></div><span class="row-state">界面预览</span></div>`).join('');}
async function renderRoute({initial=false}={}){const desiredHash=location.hash;if(desiredHash==='#/early'){
 ++routeVersion;for(const a of running)a.cancel();running.clear();stop();
 if(!window.MorningPage.active){
  routeIndex=-1;$('#home').hidden=false;$('#detail').hidden=true;$('#back').hidden=true;
  $('#home').classList.remove('route-moving');$('#detail').classList.remove('route-moving');document.body.classList.remove('transitioning');
  if(railPlaceholder){rail.classList.remove('docked');railPlaceholder.replaceWith(rail);railPlaceholder=null;}
 }
 await window.MorningPage.enter({initial});return;
}if(window.MorningPage.active){await window.MorningPage.leave();if(location.hash!==desiredHash)return;}const id=location.hash.replace('#/',''),next=mods.findIndex(m=>m.id===id);if(next===routeIndex)return;const previous=routeIndex;routeIndex=next;if(next<0)$('#back').hidden=true;const version=++routeVersion;for(const a of running)a.cancel();running.clear();const home=$('#home'),detail=$('#detail');document.body.classList.remove('transitioning');home.classList.remove('route-moving');detail.classList.remove('route-moving');
 if(next>=0&&previous>=0){home.hidden=true;detail.hidden=false;fillDetail(next);revealBack();await animate($('.detail-content'),[{opacity:.35,transform:'translateX(18px)'},{opacity:1,transform:'translateX(0)'}],260);if(version===routeVersion)$('#detailTitle').focus({preventScroll:true});return;}
 if(next>=0){fillDetail(next);detail.hidden=false;if(initial){home.hidden=true;await dockRail();}else{home.hidden=false;document.body.classList.add('transitioning');home.classList.add('route-moving');detail.classList.add('route-moving');const railMotion=dockRail();await Promise.all([animate(home,[{transform:'translateX(0)'},{transform:'translateX(-100vw)'}]),animate(detail,[{transform:'translateX(100vw)'},{transform:'translateX(0)'}]),railMotion]);}if(version!==routeVersion)return;home.hidden=true;detail.hidden=false;revealBack();$('#detailTitle').focus({preventScroll:true});}
 else{home.hidden=false;detail.hidden=false;draw();document.body.classList.add('transitioning');home.classList.add('route-moving');detail.classList.add('route-moving');const from=rail.getBoundingClientRect(),to=railPlaceholder?.getBoundingClientRect();const railMotion=to?animate(rail,[{transform:'translate(0,0)'},{transform:`translate(${to.x-from.x}px,${to.y-from.y}px)`}]):Promise.resolve();await Promise.all([animate(home,[{transform:'translateX(-100vw)'},{transform:'translateX(0)'}]),animate(detail,[{transform:'translateX(0)'},{transform:'translateX(100vw)'}]),railMotion]);if(version!==routeVersion)return;detail.hidden=true;home.classList.remove('route-moving');detail.classList.remove('route-moving');document.body.classList.remove('transitioning');if(railPlaceholder){rail.classList.remove('docked');railPlaceholder.replaceWith(rail);railPlaceholder=null;}if(version!==routeVersion)return;wheel.focus({preventScroll:true});}
 home.classList.remove('route-moving');detail.classList.remove('route-moving');document.body.classList.remove('transitioning');window.scrollTo(0,0);
}
function open(i){if(routeIndex===i)return;if(routeIndex>=0)history.replaceState(history.state,'',`#/${mods[i].id}`);else history.pushState({hfPreview:true},'',`#/${mods[i].id}`);renderRoute();}
function back(){if(history.state?.hfPreview)history.back();else{history.replaceState(null,'',location.pathname+location.search);renderRoute();}}
window.addEventListener('morning-gesture-start',()=>{drag=null;wheel.classList.remove('dragging');stop();});
$('#back').addEventListener('click',back);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#detail').hidden)back();});window.addEventListener('popstate',renderRoute);window.addEventListener('hashchange',renderRoute);window.addEventListener('resize',draw);new ResizeObserver(draw).observe(wheel);draw();update();if(location.hash)renderRoute({initial:true});
})();
