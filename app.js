const envelope=document.getElementById('envelope');
const invitation=document.getElementById('invitation');
const openButton=document.getElementById('open-invitation');
const skipButton=document.getElementById('skip-opening');
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let opening = false;
let revealing = false;
let revealTimer;
let sheetMotion;
const sheet = document.querySelector('.invitation-sheet');
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
  if (!invitationAudio.hasAttribute('src')) invitationAudio.src = invitationAudio.dataset.src;
  else if (invitationAudio.error) invitationAudio.load();
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
function finishOpening(focusTarget = document.getElementById('names')) {
  clearTimeout(revealTimer);
  if (sheetMotion) sheetMotion.cancel();
  sheetMotion = null;
  opening = false;
  revealing = false;
  envelope.hidden = true;
  invitation.inert = false;
  document.body.classList.remove('sealed', 'revealing');
  focusTarget.focus({preventScroll: true});
}

function revealPage() {
  if (!opening || revealing || envelope.hidden) return;
  clearTimeout(revealTimer);
  revealing = true;

  // Start the final sheet at the exact paper bounds left by the last fold.
  const card = envelope.querySelector('.invitation-card').getBoundingClientRect();
  const target = sheet.getBoundingClientRect();
  document.body.classList.add('revealing');
  revealTimer = setTimeout(finishOpening, 1050);
  if (sheet.animate && target.width && target.height && !reducedMotion.matches) {
    const start = 'translate(' + (card.left - target.left) + 'px, ' +
      (card.top - target.top) + 'px) scale(' + (card.width / target.width) +
      ', ' + (card.height / target.height) + ')';
    sheetMotion = sheet.animate([{transform: start}, {transform: 'none'}],
      {duration: 900, easing: 'cubic-bezier(.22,.72,.15,1)'});
  }
  envelope.classList.add('departing');
}

const stage = document.getElementById('envelope-stage');
stage.addEventListener('animationend', event => {
  if (event.target === stage && ['invitation-zoom', 'mobile-invitation-zoom'].includes(event.animationName)) {
    revealPage();
  }
});
envelope.addEventListener('transitionend', event => {
  if (event.target === envelope && event.propertyName === 'opacity' && revealing) finishOpening();
});

openButton.addEventListener('click', () => {
  if (opening) return;
  opening = true;
  // Keep play() inside the trusted tap, before any animation or asynchronous work.
  if (musicEnabled) playMusic();
  if (reducedMotion.matches) {
    finishOpening();
    return;
  }
  envelope.querySelector('.opening-status').textContent = 'פותחים את ההזמנה של גל וירין';
  envelope.classList.add('opening');
  revealTimer = setTimeout(revealPage, 5200);
});
if (typeof reducedMotion.addEventListener === 'function') {
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && opening) finishOpening();
  });
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && opening) finishOpening();
});
skipButton.addEventListener('click', () => finishOpening());

function showCover() {
  envelope.classList.add('resetting');
  envelope.classList.remove('opening', 'departing');
  envelope.querySelector('.opening-status').textContent = '';
  envelope.hidden = false;
  invitation.inert = true;
  document.body.classList.add('sealed');
  void envelope.offsetHeight;
  envelope.classList.remove('resetting');
  envelope.focus({preventScroll: true});
}
document.getElementById('replay').addEventListener('click', () => {
  pauseMusic(true);
  if (location.hash === '#details') history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo({top: 0, behavior: 'instant'});
  showCover();
  openButton.focus({preventScroll: true});
});
envelope.addEventListener('keydown', event => {
  if (event.key === 'Escape') finishOpening();
  if (event.key !== 'Tab') return;
  if (event.shiftKey && [openButton, envelope].includes(document.activeElement)) {
    event.preventDefault();
    musicButtons[0].focus();
  } else if (!event.shiftKey && document.activeElement === musicButtons[0]) {
    event.preventDefault();
    openButton.focus();
  }
});

const countdown = document.querySelector('.countdown');
const countdownTitle = document.getElementById('countdown-title');
const countdownUnits = countdown.querySelector('.countdown-units');
const countdownFinished = countdown.querySelector('.countdown-finished');
const countdownDays = document.getElementById('countdown-days');
const countdownHours = document.getElementById('countdown-hours');
const countdownMinutes = document.getElementById('countdown-minutes');
const reception = Date.parse(document.querySelector('.day time').dateTime);
const minuteMs = 60000;
let countdownTick;
function updateCountdown() {
  clearTimeout(countdownTick);
  const remainingMs = reception - Date.now();
  const finished = remainingMs <= 0;
  countdownUnits.hidden = finished;
  countdownFinished.hidden = !finished;
  countdownTitle.textContent = finished ? 'גל וירין' : 'עד שניפגש';
  if (!finished) {
    // Keep the last minute visible until the reception actually starts.
    const totalMinutes = Math.ceil(remainingMs / minuteMs);
    countdownDays.textContent = Math.floor(totalMinutes / 1440);
    countdownHours.textContent = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
    countdownMinutes.textContent = String(totalMinutes % 60).padStart(2, '0');
    countdownTick = setTimeout(updateCountdown, remainingMs % minuteMs || minuteMs);
  }
  countdown.hidden = false;
}
updateCountdown();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(countdownTick);
  else updateCountdown();
});

function focusVenue() {
  if (location.hash !== '#details') return;
  finishOpening(document.getElementById('details'));
  document.getElementById('details').scrollIntoView({block: 'start'});
}
window.addEventListener('hashchange', focusVenue);

// The static invitation and both calendar links work before enhancement.
document.querySelector('.header-actions').hidden = false;
if (location.hash === '#details') focusVenue();
else if (!location.hash) showCover();
