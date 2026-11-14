(()=>{'use strict';
const $=s=>document.querySelector(s),home=$('#home'),page=$('#morningPage');
const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const activeAnimations=new Set();let phase='home',version=0,swipe=null,gestureX=0,gestureOrigin='home',leaving=null;
const ease='cubic-bezier(.76,0,.24,1)';
let horizontalIdle=0,horizontalPending=0,horizontalLast=0,horizontalOrigin='home',wheelSwipe=false,wheelCaptureUntil=0;
function resetHorizontal(){clearTimeout(horizontalIdle);horizontalIdle=0;horizontalPending=0;wheelSwipe=false;}
function paintGesture(){home.style.transform=`translateX(${gestureX}px)`;page.style.transform=`translateX(${gestureX-innerWidth}px)`;}
function beginGesture(origin='home'){gestureOrigin=origin;window.dispatchEvent(new Event('morning-gesture-start'));phase='gesture';gestureX=origin==='home'?0:innerWidth;prepare();renderClock();}
function motion(el,frames,duration=650){if(reduce())return Promise.resolve();const a=el.animate(frames,{duration,easing:ease,fill:'both'});activeAnimations.add(a);return a.finished.catch(()=>{}).finally(()=>{activeAnimations.delete(a);a.cancel();});}
function cancel(){for(const a of activeAnimations)a.cancel();activeAnimations.clear();}
function prepare(){page.hidden=false;$('#detail').hidden=true;$('#back').hidden=true;home.hidden=false;home.classList.add('route-moving');page.classList.add('route-moving');document.body.classList.add('transitioning');}
function clean(){home.classList.remove('route-moving');page.classList.remove('route-moving');home.style.transform='';page.style.transform='';document.body.classList.remove('transitioning');}
function currentX(el){const transform=getComputedStyle(el).transform;return transform==='none'?0:new DOMMatrixReadOnly(transform).m41;}
async function enter({initial=false}={}){
 if(phase==='early'||phase==='entering')return;
 const prior=phase,from=prior==='gesture'?gestureX:(prior==='leaving'?currentX(home):0),token=++version;resetHorizontal();
 cancel();phase='entering';prepare();home.style.transform='';page.style.transform='';renderClock();
 if(!initial)await Promise.all([motion(home,[{transform:`translateX(${from}px)`},{transform:'translateX(100vw)'}],Math.max(250,650*(1-from/innerWidth))),motion(page,[{transform:`translateX(${from-innerWidth}px)`},{transform:'translateX(0)'}],Math.max(250,650*(1-from/innerWidth)))]);
 if(token!==version)return;
 phase='early';home.hidden=true;clean();$('#morningTitle').focus({preventScroll:true});window.scrollTo(0,0);
}
function leave(){
 if(phase==='home')return Promise.resolve();if(phase==='leaving')return leaving;
 const homeFrom=phase==='early'?innerWidth:currentX(home),pageFrom=currentX(page),token=++version;resetHorizontal();cancel();phase='leaving';prepare();home.style.transform='';page.style.transform='';
 leaving=(async()=>{await Promise.all([motion(home,[{transform:`translateX(${homeFrom}px)`},{transform:'translateX(0)'}]),motion(page,[{transform:`translateX(${pageFrom}px)`},{transform:'translateX(-100vw)'}])]);if(token!==version)return;phase='home';page.hidden=true;clean();window.scrollTo(0,0);$('#wheel').focus({preventScroll:true});leaving=null;})();return leaving;
}
window.MorningPage={enter,leave,get active(){return phase!=='home';}};
function open(){if(phase==='early'||phase==='entering')return;history.pushState({hfMorning:true},'','#/early');window.dispatchEvent(new PopStateEvent('popstate'));}
function back(){if(history.state?.hfMorning)history.back();else{history.replaceState(null,'',location.pathname+location.search);window.dispatchEvent(new PopStateEvent('popstate'));}}
$('#morningEntry').addEventListener('click',open);$('#morningBack').addEventListener('click',back);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(phase==='early'||phase==='entering')){e.preventDefault();back();}});
// Two horizontal lanes: home -> right -> morning; morning -> left -> home.
function startSwipe(e,origin){
 if(!e.isPrimary||e.button!==0||phase!==origin||document.body.classList.contains('transitioning')||e.target.closest('a,button,input,textarea'))return;
 swipe={id:e.pointerId,x:e.clientX,y:e.clientY,start:performance.now(),mode:null,origin};
}
home.addEventListener('pointerdown',e=>startSwipe(e,'home'),true);
page.addEventListener('pointerdown',e=>startSwipe(e,'early'),true);
document.addEventListener('pointermove',e=>{
 if(!swipe||swipe.id!==e.pointerId)return;
 const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y,direction=swipe.origin==='home'?1:-1,travel=dx*direction;
 if(!swipe.mode){
  if(travel>14&&travel>Math.abs(dy)*1.4){swipe.mode='horizontal';beginGesture(swipe.origin);(swipe.origin==='home'?home:page).setPointerCapture(e.pointerId);}
  else if(Math.abs(dy)>14||travel < -14)swipe.mode='other';
 }
 if(swipe.mode!=='horizontal')return;
 if(e.cancelable)e.preventDefault();gestureX=Math.max(0,Math.min(innerWidth,(swipe.origin==='home'?0:innerWidth)+dx));paintGesture();
},{capture:true,passive:false});
async function endSwipe(e,cancelled=false){
 if(!swipe||swipe.id!==e.pointerId)return;const gesture=swipe;swipe=null;
 if(gesture.mode!=='horizontal')return;
 const host=gesture.origin==='home'?home:page;if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);
 const travel=gesture.origin==='home'?gestureX:innerWidth-gestureX,speed=travel/Math.max(1,performance.now()-gesture.start);
 if(!cancelled&&(travel>Math.min(100,innerWidth*.23)||(travel>45&&speed>.45))){if(gesture.origin==='home')open();else back();return;}
 await cancelGesture();
}
async function cancelGesture(){
 const from=gestureX,origin=gestureOrigin,destination=origin==='home'?0:innerWidth,token=++version;
 resetHorizontal();cancel();phase='cancelling';home.style.transform='';page.style.transform='';
 await Promise.all([motion(home,[{transform:`translateX(${from}px)`},{transform:`translateX(${destination}px)`}],260),motion(page,[{transform:`translateX(${from-innerWidth}px)`},{transform:`translateX(${destination-innerWidth}px)`}],260)]);
 if(token!==version)return;phase=origin;home.hidden=origin!=='home';page.hidden=origin!=='early';clean();
}
// Mac trackpads send wheel events: negative deltaX reveals morning, positive returns home.
document.addEventListener('wheel',e=>{
 if(e.ctrlKey||e.metaKey||e.shiftKey)return;
 const unit=e.deltaMode===1?16:e.deltaMode===2?innerWidth:1;
 const dx=e.deltaX*unit,dy=e.deltaY*unit,now=performance.now();
 if(Math.abs(dx)<=Math.abs(dy)*1.4||Math.abs(dx)<1)return;
 if(now<wheelCaptureUntil){if(e.cancelable)e.preventDefault();return;}
 const continuing=phase==='gesture'&&wheelSwipe,origin=continuing?gestureOrigin:phase;
 if(origin!=='home'&&origin!=='early')return;
 const host=origin==='home'?home:page;
 if(swipe||(!continuing&&(!host.contains(e.target)||e.target.closest('input,textarea,select,[contenteditable=true]'))))return;
 const directed=origin==='home'?-dx:dx;
 if(!continuing&&(directed<=0||document.body.classList.contains('transitioning')))return;
 if(e.cancelable)e.preventDefault();e.stopPropagation();
 if(!continuing){
  if(now-horizontalLast>160||horizontalOrigin!==origin)horizontalPending=0;
  horizontalOrigin=origin;horizontalPending+=directed*.9;horizontalLast=now;
  if(horizontalPending<18){clearTimeout(horizontalIdle);horizontalIdle=setTimeout(resetHorizontal,160);return;}
  const seed=horizontalPending;beginGesture(origin);wheelSwipe=true;gestureX=origin==='home'?Math.min(innerWidth,seed):Math.max(0,innerWidth-seed);
 }else gestureX=Math.max(0,Math.min(innerWidth,gestureX-dx*.9));
 horizontalLast=now;paintGesture();clearTimeout(horizontalIdle);
 const travel=origin==='home'?gestureX:innerWidth-gestureX;
 if(travel>=Math.min(140,innerWidth*.28)){wheelCaptureUntil=now+700;if(origin==='home')open();else back();return;}
 horizontalIdle=setTimeout(()=>{if(phase==='gesture'&&wheelSwipe)cancelGesture();else resetHorizontal();},140);
},{capture:true,passive:false});
document.addEventListener('pointerup',e=>endSwipe(e),true);document.addEventListener('pointercancel',e=>endSwipe(e,true),true);
// Preview-only check-in state. No network request, user record, or persistent completion is produced.
const clockFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
let demoStart=null,demoDone=null,liveDone=null;
function clock(){const parts=Object.fromEntries(clockFormat.formatToParts(new Date()).map(p=>[p.type,p.value]));let h=Number(parts.hour),m=Number(parts.minute),s=Number(parts.second);if(demoStart!==null){const elapsed=Math.floor((performance.now()-demoStart)/1000);h=5;m=30+Math.floor((20+elapsed)/60);s=(20+elapsed)%60;}return{day:`${parts.year}.${parts.month}.${parts.day}`,time:[h,m,s].map(v=>String(v).padStart(2,'0')).join(':'),seconds:h*3600+m*60+s};}
function renderClock(){
 if(phase==='home')return;
 const now=clock(),done=demoStart===null?liveDone:demoDone,validDone=done?.day===now.day,ready=now.seconds>=19800&&now.seconds<19860;
 const button=$('#checkinButton');button.disabled=!ready||validDone;button.classList.toggle('is-ready',ready&&!validDone);button.classList.toggle('is-done',!!validDone);
 $('#morningDate').textContent=now.day;$('#morningClock').textContent=now.time;
 if(validDone){$('#checkinLabel').textContent='已打卡';$('#checkinSub').textContent=done.time;$('#morningStatus').textContent='今天，从坚持开始。';}
 else if(ready){const remaining=19860-now.seconds;$('#checkinLabel').textContent='打卡';$('#checkinSub').textContent=`还剩 ${String(remaining).padStart(2,'0')} 秒`;$('#morningStatus').textContent='此刻，开启新的一天。';}
 else if(now.seconds<19800){$('#checkinLabel').textContent='未开始';$('#checkinSub').textContent='05:30 开始';$('#morningStatus').textContent='还未到时间，清晨见。';}
 else{$('#checkinLabel').textContent='已结束';$('#checkinSub').textContent='明早 05:30';$('#morningStatus').textContent='今日窗口已结束，不支持补签。';}
 button.setAttribute('aria-label',`早起打卡：${$('#checkinLabel').textContent}，${$('#checkinSub').textContent}`);
}
$('#checkinButton').addEventListener('click',()=>{const now=clock();if(now.seconds<19800||now.seconds>=19860)return;const done={day:now.day,time:now.time};if(demoStart===null){if(liveDone?.day===now.day)return;liveDone=done;}else{if(demoDone?.day===now.day)return;demoDone=done;}renderClock();});
$('#morningExperience').addEventListener('click',()=>{demoStart=demoStart===null?performance.now():null;demoDone=null;$('#morningExperience').textContent=demoStart===null?'体验打卡时段':'退出体验';$('#morningExperience').setAttribute('aria-pressed',String(demoStart!==null));$('#morningPreviewNote').textContent=demoStart===null?'设计预览 · 不保存真实打卡记录':'体验模式 · 模拟 05:30 时段，不保存记录';renderClock();});
for(const button of document.querySelectorAll('[data-scene]'))button.addEventListener('click',()=>{page.dataset.scene=button.dataset.scene;for(const other of document.querySelectorAll('[data-scene]'))other.setAttribute('aria-pressed',String(other===button));});
setInterval(renderClock,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderClock();});
})();
