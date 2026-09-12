const envelope=document.getElementById('envelope');
const invitation=document.getElementById('invitation');
const openButton=document.getElementById('open-invitation');
const skipButton=document.getElementById('skip-opening');
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let opening=false;
let runId=0;
let revealing=false;
let timers=[];
const schedule=(callback,delay)=>timers.push(window.setTimeout(callback,delay));
const clearTimers=()=>{timers.forEach(window.clearTimeout);timers=[]};
// Warm up the artwork and display fonts before the first tap, once per page.
const artworkReady=Promise.all(['envelope-paper.webp','stationery.webp','wax-seal.webp'].map(src=>{
 const img=new Image();img.src=src;
 return typeof img.decode==='function'?img.decode().catch(()=>{}):Promise.resolve();
}));
const typeReady=document.fonts?Promise.all([
 document.fonts.load('400 72px "Frank Ruhl Libre"','גל ירין'),
 document.fonts.load('400 40px "Cormorant Garamond"','GY 21.02.2027'),
 document.fonts.load('400 18px Assistant','מתחתנים')
]).catch(()=>{}):Promise.resolve();
// Both controls share one audio element; play() runs in the tap gesture.
const invitationAudio=document.getElementById('invitation-audio');
const musicButtons=[...document.querySelectorAll('.music-toggle')];
let musicEnabled=true;
let musicPending=false;
let musicRequest=0;
invitationAudio.volume=0.45;
function syncMusicControls(){
 const active=musicPending || (!invitationAudio.paused && !invitationAudio.ended);
 for(const button of musicButtons){
  button.setAttribute('aria-pressed',String(active));
  button.setAttribute('aria-label',active?'השתקת מוזיקה':'הפעלת מוזיקה');
  button.querySelector('.music-label').textContent=active?'השתקה':'מוזיקה';
  button.classList.toggle('is-playing',active);
 }
}
function pauseMusic(reset=false){
 musicRequest++;musicPending=false;invitationAudio.pause();
 if(reset){try{invitationAudio.currentTime=0}catch{}}
 syncMusicControls();
}
function playMusic(){
 if(musicPending || (!invitationAudio.paused && !invitationAudio.ended))return;
 const request=++musicRequest;musicPending=true;syncMusicControls();
 if(invitationAudio.ended){try{invitationAudio.currentTime=0}catch{}}
 try{
  const playing=invitationAudio.play();
  Promise.resolve(playing).then(()=>{
   if(request!==musicRequest)return;musicPending=false;syncMusicControls();
  }).catch(()=>{
   if(request!==musicRequest)return;musicPending=false;syncMusicControls();
  });
 }catch{musicPending=false;syncMusicControls()}
}
for(const button of musicButtons)button.addEventListener('click',()=>{
 if(musicPending || (!invitationAudio.paused && !invitationAudio.ended)){musicEnabled=false;pauseMusic()}
 else{musicEnabled=true;playMusic()}
});
for(const event of ['playing','pause','ended','error'])invitationAudio.addEventListener(event,()=>{
 if(event==='ended' || event==='error'){musicRequest++;musicPending=false}
 syncMusicControls();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseMusic()});
syncMusicControls();
const dust=document.querySelector('.light-dust');
for(let i=0;i<22;i++){
 const particle=document.createElement('i');
 particle.style.cssText=`--x:${22+(i*17%60)}%;--y:${32+(i*13%45)}%;--size:${2+i%3}px;--delay:${.8+(i%8)*.13}s;--drift:${(i%2?1:-1)*(20+i*3)}px`;
 dust.append(particle);
}
function finishOpening(){
 clearTimers();runId++;opening=false;revealing=false;invitation.inert=false;document.body.classList.remove('sealed');
 document.body.classList.add('revealed');envelope.hidden=true;
 document.getElementById('names').focus({preventScroll:true});
}
function revealPage(){
 if(revealing || envelope.hidden)return;clearTimers();revealing=true;
 document.body.classList.add('revealed','revealing');envelope.classList.add('departing');
 schedule(finishOpening,1050);
}
const stage=document.getElementById('envelope-stage');
stage.addEventListener('animationend',event=>{
 if(event.target!==stage || !opening || !['invitation-zoom','mobile-invitation-zoom'].includes(event.animationName))return;
 revealPage();
});
envelope.addEventListener('transitionend',event=>{
 if(event.target===envelope && event.propertyName==='opacity' && revealing)finishOpening();
});
openButton.addEventListener('click',async()=>{
 if(opening)return;opening=true;openButton.disabled=true;const thisRun=++runId;
 if(musicEnabled)playMusic();
 document.querySelector('.opening-status').textContent='פותחים את ההזמנה של גל וירין';
 if(reducedMotion.matches){revealPage();finishOpening();return}
 // Never begin a second run if skip or replay happened during preparation.
 await Promise.race([Promise.all([artworkReady,typeReady]),new Promise(resolve=>schedule(resolve,1400))]);
 if(thisRun!==runId || !opening)return;
 clearTimers();envelope.classList.add('opening');
 // Fallback for interrupted CSS animations or a backgrounded browser tab.
 schedule(revealPage,5200);
});
if(typeof reducedMotion.addEventListener==='function')reducedMotion.addEventListener('change',()=>{
 if(reducedMotion.matches && opening){revealPage();finishOpening()}
});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden && opening){revealPage();finishOpening()}
});
skipButton.addEventListener('click',()=>{revealPage();finishOpening()});
document.getElementById('replay').addEventListener('click',()=>{
 pauseMusic(true);
 clearTimers();runId++;opening=false;revealing=false;envelope.classList.add('resetting');window.scrollTo({top:0,behavior:'instant'});invitation.inert=true;
 envelope.hidden=false;envelope.classList.remove('opening','departing');
 document.body.classList.add('sealed');document.body.classList.remove('revealed','revealing');
 document.querySelector('.opening-status').textContent='';openButton.disabled=false;
 void envelope.offsetHeight;envelope.classList.remove('resetting');openButton.focus({preventScroll:true});
});
envelope.addEventListener('keydown',event=>{
 if(event.key==='Escape'){revealPage();finishOpening()}
 if(event.key==='Tab'){
  const controls=[openButton,skipButton,musicButtons[0]].filter(button=>!button.disabled);
  const first=controls[0],last=controls[controls.length-1];
  if(event.shiftKey && (document.activeElement===first || !envelope.contains(document.activeElement))){event.preventDefault();last.focus()}
  else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus()}
 }

});
const calendarToggle=document.getElementById('calendar-toggle');
calendarToggle.addEventListener('click',()=>{const panel=document.getElementById('calendar-options');panel.hidden=!panel.hidden;calendarToggle.setAttribute('aria-expanded',String(!panel.hidden))});
const params=new URLSearchParams({action:'TEMPLATE',text:'החתונה של גל וירין',dates:'20270221T173000Z/20270221T173000Z',ctz:'Asia/Jerusalem',details:'נשמח לחגוג איתכם! גל וירין. תחילת האירוע בשעה 19:30 שעון ישראל.',location:'הבית, התעשייה 10, רעננה'});
document.getElementById('google-calendar').href='https://calendar.google.com/calendar/render?'+params.toString();

// Absolute event instant: 19:30 in Israel, independent of the guest's time zone.
const weddingStartsAt=Date.parse('2027-02-21T19:30:00+02:00');
function remainingUntilWedding(now){
 const total=Math.max(0,Math.ceil((weddingStartsAt-now)/1000));
 return {days:Math.floor(total/86400),hours:Math.floor(total%86400/3600),minutes:Math.floor(total%3600/60),seconds:total%60,started:now>=weddingStartsAt};
}
const countdownTimer=document.getElementById('countdown-timer');
const countdownFields=Object.fromEntries(['days','hours','minutes','seconds'].map(key=>[key,document.getElementById('countdown-'+key)]));
let countdownTick;
function updateCountdown(){
 const remaining=remainingUntilWedding(Date.now());
 for(const [key,element] of Object.entries(countdownFields)){
  const value=String(remaining[key]).padStart(2,'0');
  if(element.textContent!==value)element.textContent=value;
 }
 countdownTimer.setAttribute('aria-label',remaining.started?'הגיע הזמן לחגוג':`${remaining.days} ימים, ${remaining.hours} שעות, ${remaining.minutes} דקות ו-${remaining.seconds} שניות עד החתונה`);
 if(remaining.started){
  document.getElementById('countdown-title').textContent='הגיע הזמן לחגוג אהבה';
  document.getElementById('countdown-note').textContent='גל וירין · 21.02.2027';
  window.clearInterval(countdownTick);
 }
}
function resumeCountdown(){window.clearInterval(countdownTick);updateCountdown();if(Date.now()<weddingStartsAt)countdownTick=window.setInterval(updateCountdown,1000)}
resumeCountdown();
document.addEventListener('visibilitychange',()=>{if(document.hidden)window.clearInterval(countdownTick);else resumeCountdown()});
