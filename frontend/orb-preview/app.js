// Presentation-only adapter. WorkBuddy can replace demoAdapter without changing navigation.
const icons = {
  moon: '<path d="M20 15a8 8 0 0 1-11-11 8 8 0 1 0 11 11Z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="m14 6-6 6 6 6"/>',
  up: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  down: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
  board: '<path d="M3 20V10h6v10m0 0V4h6v16m0 0v-7h6v7M2 20h20"/>',
  early: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>'
};
const svg = name => `<svg aria-hidden="true" viewBox="0 0 24 24">${icons[name]}</svg>`;
const projectIcons = {
 early:'<path d="M4 17h16M7 21h10M12 3v2M4.2 7.2l1.5 1.5m12.6 0 1.5-1.5M2 13h2m16 0h2"/><path d="M7 17v-2a5 5 0 0 1 10 0v2"/>',
 run:'<circle cx="15.5" cy="3.8" r="2"/><path d="m5 10 4-3 3.2.8 3.3 4.1H20M12.2 7.8l-2.6 6.3 4.9 2.6-1.2 4.3M9.6 14.1 6 20H3"/>',
 steps:'<path d="M8 3c-2.5 0-4 3.5-3.5 6 .4 2 2 3 3.5 2.5S10 9 10 7 10 3 8 3ZM5.5 15l3 .5M16 9c-2.5 0-3 4-2.5 6.5s2 3.5 3.5 3 2-3 1.5-5S18 9 16 9ZM14.5 22l3-.5"/>',
 read:'<path d="M12 6v15M12 6C9 3.5 5.5 3 2.5 4.5v14C6 17 9 18 12 21c3-3 6-4 9.5-2.5v-14C18.5 3 15 3.5 12 6Z"/><path d="M6 8.5c1.2 0 2 .3 3 1M15 9.5c1-.7 1.8-1 3-1"/>',
 visit:'<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a22 22 0 0 0 18 0M10 13v3h4v-3"/>'
};
const projectSvg=id=>`<svg class="project-icon" aria-hidden="true" viewBox="0 0 24 24">${projectIcons[id]}</svg>`;
const tasks = [
  {id:'early',color:'#f8e4ac',ink:'#665020',name:'早起',desc:'从一个清醒的早晨开始'},
  {id:'run',color:'#f6c9b8',ink:'#673e30',name:'跑步',desc:'迈开脚步，保持自己的节奏'},
  {id:'steps',color:'#c3e2f4',ink:'#294e63',name:'步数',desc:'每一步，都算今天的行动'},
  {id:'read',color:'#dbd2f3',ink:'#4e3d70',name:'阅读',desc:'留一点时间，读几页好书'},
  {id:'visit',color:'#f3d2df',ink:'#673e52',name:'客户拜访',desc:'主动连接，让行动发生'}
];
const state = {index:1,page:'home',metric:'run',scope:'personal',name:'林小满',steps:8260,total:128560,runDone:false,image:null,imageUrl:null,notice:'',noticeType:'',busy:false};
const demoAdapter = {
  // Demo numbers are fixtures, never an authoritative completion decision.
  async submitRun(file) {await new Promise(resolve=>setTimeout(resolve,450));return {status:'local-preview',filename:file.name};},
  async syncSteps() {await new Promise(resolve=>setTimeout(resolve,450));return {dailySteps:10280};},
  boards(metric,scope) {
    if(!['run','steps'].includes(metric)) return [];
    const run=metric==='run';
    if(scope==='team')return [{name:'晨光队',detail:'示例队伍',value:run?'18.6 公里':'42,860 步'},{name:'向上队',detail:'示例队伍',value:run?'15.2 公里':'36,240 步'}];
    return [{name:'陈晨',detail:'晨光队',value:run?'6.2 公里':'12,640 步'},{name:'周晓',detail:'向上队',value:run?'5.1 公里':'11,300 步'},{name:state.name,detail:'晨光队 · 我',value:run?'3.2 公里':`${state.steps.toLocaleString()} 步`,self:true}];
  }
};
let manualTheme=null;
const isNight=()=>manualTheme===null?(new Date().getHours()<6||new Date().getHours()>=18):manualTheme==='night';
function applyTheme(){document.documentElement.dataset.theme=isNight()?'night':'day';document.querySelector('meta[name="theme-color"]').content=isNight()?'#111111':'#ffffff';}
function clockText(){return new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});}
const app=document.querySelector('#app');
const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function announce(text){document.querySelector('#announcement').textContent=text;}
function task(){return tasks[state.index];}
function homeStatus(){return task().id==='run'?(state.runDone?'已体验本地上传':'未体验 · 选择截图开始'):task().id==='steps'?(state.steps>8260?'已体验模拟同步':'未体验 · 同步今日步数'):'待开放 · 打卡规则待确认';}
function taskGuide(){return task().id==='run'?'上传跑步截图，查看今天的跑步排名':task().id==='steps'?'同步今日步数，看看你和队伍的排名':'打卡规则确认后，在这里开启新的坚持';}
function header(){return `<header class="sub-header"><button class="back" data-action="home">${svg('back')}返回首页</button><span class="hint">交互原型 · 示例数据</span></header>`;}
function home(){return `<section class="screen home"><header class="topbar"><button class="profile-button" data-action="profile" aria-label="管理个人资料"><span class="avatar">${escapeHTML(state.name.slice(0,1))}</span><span class="profile-copy">${escapeHTML(state.name)}<small>个人资料</small></span></button><span class="brand">鸿心 · 今日行动</span><div class="header-actions"><button class="theme-toggle" data-action="theme" aria-label="切换到${isNight()?'日间':'夜间'}外观">${svg(isNight()?'early':'moon')}</button><button class="plain-button" data-action="rankings">${svg('board')}排行榜</button></div></header><div class="intro"><h1 tabindex="-1">今天，行动。</h1><time class="clock" aria-label="本机当前时间">${clockText()}</time><p>左右滑动选择项目</p></div><div class="carousel" aria-label="行动项目选择">${tasks.map((t,i)=>{let offset=(i-state.index+7)%5-2;return `<button class="orb" style="--project-color:${t.color};--project-ink:${t.ink}" data-offset="${offset}" data-index="${i}" aria-label="${t.name}${offset===0?'，进入项目':'，选择项目'}" ${Math.abs(offset)>1?'tabindex="-1" aria-hidden="true"':''}>${projectSvg(t.id)}<span class="orb-label">${t.name}</span></button>`;}).join('')}</div><div class="task-info" aria-live="polite"><h2>${task().name}</h2><p><span class="status-dot ${state.runDone&&task().id==='run'?'done':''}"></span>${homeStatus()}</p></div><div class="home-actions"><p class="task-description">${taskGuide()}</p><button class="enter-hint" data-action="detail"><span>上滑进入${task().name} · 或轻点圆形</span>${svg('up')}</button><nav class="selector" aria-label="切换项目"><button class="arrow" data-action="previous" aria-label="上一个项目">${svg('back')}</button><div class="dots">${tasks.map((t,i)=>`<button class="dot" data-select="${i}" aria-label="选择${t.name}" aria-current="${i===state.index}"></button>`).join('')}</div><button class="arrow" data-action="next" aria-label="下一个项目">${svg('arrow')}</button></nav></div><p class="demo-note">交互原型 · 不上传真实业务数据</p></section>`;}
function scopeTabs(){return `<div class="scope" aria-label="榜单范围"><button class="tab" data-scope="personal" aria-pressed="${state.scope==='personal'}">个人</button><button class="tab" data-scope="team" aria-pressed="${state.scope==='team'}">队伍</button></div>`;}
function board(metric){let rows=demoAdapter.boards(metric,state.scope);return rows.length?`<table class="board"><caption class="sr-only">${tasks.find(t=>t.id===metric).name}今日${state.scope==='team'?'队伍':'个人'}排行榜，示例数据</caption><thead><tr><th scope="col">排名</th><th scope="col">${state.scope==='team'?'队伍':'学员'}</th><th scope="col">${metric==='run'?'跑步距离':'今日步数'}</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${r.self?'self':''}"><td>${i+1}</td><td>${escapeHTML(r.name)}<small>${r.detail}</small></td><td>${r.value}</td></tr>`).join('')}</tbody></table><p class="hint" style="margin-top:14px">今日榜 · 示例数据${state.scope==='team'?'；队伍计算规则待客户确认':''}</p>`:`<p class="empty">这个项目的排名规则还没有确定。<br>确认后，会在这里展示对应榜单。</p>`;}
function message(){return `<p class="message ${state.noticeType}" role="status">${escapeHTML(state.notice)}</p>`;}
function detail(){const t=task();let action;
  if(t.id==='run')action=`<form id="run-form"><label class="upload">${state.imageUrl?`<img src="${state.imageUrl}" alt="所选跑步截图预览">`:svg('upload')}<strong>${state.image?escapeHTML(state.image.name):'选择跑步截图'}</strong><small>JPG / PNG，最大 5 MB${state.image?' · 点击可重新选择':''}</small><input id="run-image" type="file" accept="image/jpeg,image/png" aria-label="选择跑步截图"></label><div class="form-actions"><button class="primary" type="submit" ${state.busy?'disabled':''}>${state.busy?'正在预览…':'体验提交截图'}</button></div>${message()}<p class="hint">截图只在当前页面预览。本原型不识别里程、不判定真实打卡完成，也不发送到服务器。</p></form>`;
  else if(t.id==='steps')action=`<div class="statline"><strong>${state.steps.toLocaleString()}</strong><span>今日步数 · 示例</span></div><button class="primary" data-action="sync" ${state.busy?'disabled':''}>${state.busy?'正在模拟同步…':'模拟同步今日步数'}</button>${message()}<p class="hint">使用固定示例值，重复同步不会重复累加；尚未连接微信运动。</p>`;
  else action=`<p class="empty">${t.name}的入口已预留。<br>打卡要求与完成判定待确认，暂不开放提交。</p>`;
  return `<section class="screen task-detail">${header()}<div class="sub-content"><h1 class="page-title" tabindex="-1">${t.name}</h1><p class="lede">${t.id==='run'?'上传运动软件的跑步截图，之后在这里查看当天的跑步排名。':t.desc}</p>${action}<section class="section" aria-label="项目排行榜"><div class="section-head"><h2>${t.name}排行榜</h2>${scopeTabs()}</div>${board(t.id)}</section></div></section>`;
}
function rankings(){return `<section class="screen">${header()}<div class="sub-content"><h1 class="page-title" tabindex="-1">排行榜</h1><p class="lede">每一种坚持，都有自己的排名。</p><nav class="tabs" aria-label="排行榜项目">${[tasks[1],tasks[2],tasks[0],tasks[3],tasks[4]].map(t=>`<button class="tab" data-metric="${t.id}" aria-pressed="${state.metric===t.id}">${t.name}</button>`).join('')}</nav><section class="section"><div class="section-head"><h2>${tasks.find(t=>t.id===state.metric).name} · 今日榜</h2>${scopeTabs()}</div>${board(state.metric)}</section><p class="hint" style="margin-top:28px">各项目独立排名，不合并计分。历史累计步数可在个人资料查看。</p></div></section>`;}
function profile(){return `<section class="screen">${header()}<div class="sub-content"><h1 class="page-title" tabindex="-1">个人资料</h1><p class="lede">管理你的展示信息，看看一路走来的积累。</p><form id="profile-form"><label class="field">显示名称<input name="displayName" maxlength="20" required value="${escapeHTML(state.name)}" autocomplete="nickname"></label><p class="hint">所属队伍：晨光队 · 示例身份</p><div class="profile-total">历史累计步数<strong>${state.total.toLocaleString()} <span class="hint">步</span></strong><small>仅在个人资料展示，不参加历史累计排名。</small></div><button class="primary" type="submit">保存本地展示名称</button>${message()}<p class="hint">信息只在本次页面会话保留，刷新后恢复示例身份。</p></form></div></section>`;}
function render({focus=false,animate=false,back=false}={}){
  applyTheme();
  const oldFocus= document.activeElement;const focusKey=oldFocus?.dataset?.scope?['scope',oldFocus.dataset.scope]:oldFocus?.dataset?.metric?['metric',oldFocus.dataset.metric]:null;
  app.innerHTML=({home,detail,rankings,profile}[state.page])();
  if(focus){window.scrollTo(0,0);app.querySelector('h1')?.focus({preventScroll:true});}
  else if(focusKey)app.querySelector(`[data-${focusKey[0]}="${focusKey[1]}"]`)?.focus({preventScroll:true});
  if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches) app.firstElementChild.animate([{transform:`translateY(${back?'-':'+'}100vh)`,opacity:.9},{transform:'translateY(0)',opacity:1}],{duration:580,easing:'cubic-bezier(.16,1,.3,1)'});
}
function navigate(page){const back=page==='home';state.page=page;state.notice='';state.noticeType='';render({focus:true,animate:true,back});}
function select(index){
  state.index=(index+tasks.length)%tasks.length;
  if(state.page!=='home'){render();return;}
  app.querySelectorAll('.orb').forEach((orb,i)=>{
    const offset=(i-state.index+7)%5-2;
    orb.dataset.offset=offset;
    orb.setAttribute('aria-label',`${tasks[i].name}${offset===0?'，进入项目':'，选择项目'}`);
    orb.tabIndex=Math.abs(offset)>1?-1:0;
    if(Math.abs(offset)>1)orb.setAttribute('aria-hidden','true');else orb.removeAttribute('aria-hidden');
  });
  app.querySelectorAll('.dot').forEach((dot,i)=>dot.setAttribute('aria-current',String(i===state.index)));
  app.querySelector('.task-info h2').textContent=task().name;
  app.querySelector('.task-info p').innerHTML=`<span class="status-dot ${state.runDone&&task().id==='run'?'done':''}"></span>${homeStatus()}`;
  app.querySelector('.task-description').textContent=taskGuide();
  app.querySelector('.enter-hint span').textContent=`上滑进入${task().name} · 或轻点圆形`;
  announce(`已选择${task().name}`);
}
app.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.index!==undefined){const i=Number(button.dataset.index);i===state.index?navigate('detail'):select(i);return;}
  if(button.dataset.select!==undefined){select(Number(button.dataset.select));app.querySelector(`[data-select="${state.index}"]`)?.focus();return;}
  if(button.dataset.metric){state.metric=button.dataset.metric;render();return;}
  if(button.dataset.scope){state.scope=button.dataset.scope;render();return;}
  const action=button.dataset.action;
  if(action==='theme'){manualTheme=isNight()?'day':'night';render();app.querySelector('[data-action="theme"]')?.focus();return;}
  if(['home','profile','rankings','detail'].includes(action)){navigate(action);return;}
  if(action==='next'||action==='previous'){select(state.index+(action==='next'?1:-1));app.querySelector(`[data-action="${action}"]`)?.focus();}
  if(action==='sync'&&!state.busy){state.busy=true;render();const result=await demoAdapter.syncSteps();state.total+=Math.max(0,result.dailySteps-state.steps);state.steps=Math.max(state.steps,result.dailySteps);state.busy=false;state.notice='本地示例已同步为 10,280 步。';state.noticeType='success';if(state.page==='detail'&&task().id==='steps')render();}
});
app.addEventListener('change',event=>{
  if(event.target.id!=='run-image')return;const file=event.target.files[0];if(!file)return;
  if(!['image/png','image/jpeg'].includes(file.type)||file.size>5*1024*1024){state.notice='请选择 5 MB 以内的 JPG 或 PNG 图片。';state.noticeType='error';render();return;}
  if(state.imageUrl)URL.revokeObjectURL(state.imageUrl);state.image=file;state.imageUrl=URL.createObjectURL(file);state.notice='截图已在本地预览，点击下方按钮体验提交。';state.noticeType='';render();app.querySelector('.primary')?.focus();
});
app.addEventListener('submit',async event=>{
  event.preventDefault();
  if(event.target.id==='profile-form'){const name=new FormData(event.target).get('displayName').trim();if(!name){state.notice='请填写显示名称。';state.noticeType='error';render();app.querySelector('input')?.focus();return;}state.name=name;state.notice='本次会话的展示名称已保存。';state.noticeType='success';render();app.querySelector('input')?.focus();}
  if(event.target.id==='run-form'&&!state.busy){if(!state.image){state.notice='请先选择一张跑步截图。';state.noticeType='error';render();app.querySelector('input')?.focus();return;}state.busy=true;render();await demoAdapter.submitRun(state.image);state.busy=false;state.runDone=true;state.notice='本地交互已完成。截图未上传，榜单仍为示例数据。';state.noticeType='success';if(state.page==='detail'&&task().id==='run')render();}
});
document.addEventListener('keydown',event=>{if(/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;if(event.key==='Escape'&&state.page!=='home')navigate('home');if(state.page==='home'&&event.key==='PageDown'){event.preventDefault();navigate('detail');return;}if(state.page==='home'&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();select(state.index+(event.key==='ArrowRight'?1:-1));app.querySelector(`[data-select="${state.index}"]`)?.focus();}});
let touchStart=null,suppressClick=false;
app.addEventListener('touchstart',event=>{touchStart=null;if(state.page==='home'&&event.touches.length===1&&event.target.closest('.carousel,.task-info,.task-description,.enter-hint'))touchStart={x:event.touches[0].clientX,y:event.touches[0].clientY,mode:'home'};;},{passive:true});
app.addEventListener('touchend',event=>{if(!touchStart)return;const dx=event.changedTouches[0].clientX-touchStart.x,dy=event.changedTouches[0].clientY-touchStart.y,mode=touchStart.mode;touchStart=null;if(mode==='return'){if(state.page==='detail'&&dy>65&&dy>Math.abs(dx)*1.3){suppressClick=true;navigate('home');setTimeout(()=>suppressClick=false,350);}return;}if(state.page!=='home')return;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){suppressClick=true;select(state.index+(dx<0?1:-1));setTimeout(()=>suppressClick=false,350);}else if(dy < -65&&-dy>Math.abs(dx)*1.3){suppressClick=true;navigate('detail');setTimeout(()=>suppressClick=false,350);}},{passive:true});
app.addEventListener('touchcancel',()=>{touchStart=null;},{passive:true});
app.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();}},true);
window.addEventListener('pagehide',()=>{if(state.imageUrl)URL.revokeObjectURL(state.imageUrl);});
render();

setInterval(()=>{const previous=document.documentElement.dataset.theme;applyTheme();const clock=app.querySelector('.clock');if(clock)clock.textContent=clockText();if(previous!==document.documentElement.dataset.theme&&state.page==='home'){const toggle=app.querySelector('[data-action="theme"]');toggle.setAttribute('aria-label',`切换到${isNight()?'日间':'夜间'}外观`);toggle.innerHTML=svg(isNight()?'early':'moon');}},30000);

// Desktop equivalent: scroll down once the homepage is fully in view.
let wheelDistance=0,lastWheel=0;
app.addEventListener('wheel',event=>{
  if(event.ctrlKey||event.metaKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
  const entering=state.page==='home'&&event.deltaY>0&&window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-8;
  const returning=false;
  if(!entering&&!returning){wheelDistance=0;return;}
  const now=Date.now();if(now-lastWheel>250)wheelDistance=0;lastWheel=now;
  wheelDistance+=Math.abs(event.deltaY)*(event.deltaMode===1?16:event.deltaMode===2?window.innerHeight:1);
  if(wheelDistance>90){event.preventDefault();wheelDistance=0;navigate(entering?'detail':'home');}
},{passive:false});
