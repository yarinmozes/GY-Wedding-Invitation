const envelope=document.getElementById('envelope');
const invitation=document.getElementById('invitation');
const openButton=document.getElementById('open-invitation');
const skipButton=document.getElementById('skip-opening');
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let opening = false;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
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
const duration = 5500;
const landingTime = 5300;
const stage = document.getElementById('envelope-stage');
const sheet = document.querySelector('.invitation-sheet');
const parts = {
  back: stage.querySelector('.sleeve-back'),
  front: stage.querySelector('.sleeve-front'),
  seal: stage.querySelector('.seal-rig'),
  shadow: stage.querySelector('.envelope-shadow'),
  hinge: stage.querySelector('.lid-rig'),
  lid: stage.querySelector('.folded-lid'),
  pocketPrint: stage.querySelector('.printed-pocket'),
  wax: stage.querySelector('.wax-impression'),
  light: stage.querySelector('.lid-light'),
  shade: stage.querySelector('.pocket-shade'),
  paper: sheet,
  paperShade: sheet.querySelector('.letter-shade'),
  paperCast: sheet.querySelector('.letter-cast'),
  skip: skipButton,
  music: musicButtons[0],
  ground: envelope.querySelector('.cover-ground'),
  title: envelope.querySelector('.opening-title'),
  caption: envelope.querySelector('.opening-caption')
};
let players = [];
let started = 0;
let layoutFrame = 0;
let finishTimer;

function ease(time, from, to) {
  const t = Math.max(0, Math.min(1, (time - from) / (to - from)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function mix(a, b, t) { return a + (b - a) * t; }

function stopPlayers() {
  for (const player of players) player.cancel();
  players = [];
}

function layOutMotion() {
  if (!opening) return;
  stopPlayers();
  // The live letter stays in the page's layout, even while it is inside the pocket.
  const target = sheet.getBoundingClientRect();
  const stock = stage.getBoundingClientRect();
  if (!stock.width || !target.height) { finishOpening(); return; }
  const width = stock.width, height = stock.height;
  const fit = Math.min(.90 * width / target.width, .91 * height / target.height);
  const targetX = target.left - stock.left + target.width / 2;
  const targetY = target.top - stock.top + target.height / 2;
  const clearance = Math.max(height * .13, height * .39 - stock.top + 20);
  const drop = envelope.clientHeight - stock.top + height * .52;
  const tracks = Object.fromEntries(Object.keys(parts).map(name => [name, []]));

  // Sample the shared shot once. The browser interpolates the transforms on its
  // animation timeline; playback never measures layout or paints text in a loop.
  for (let time = 0; time <= duration; time += 50) {
    const press = ease(time, 0, 150) - ease(time, 150, 380);
    const retreat = ease(time, 200, 1750);
    const extract = ease(time, 1720, 4260);
    const approach = ease(time, 2470, landingTime);
    const peel = ease(time, 130, 395) - ease(time, 395, 685);
    const turn = ease(time, 230, 1990);
    const angle = 149 * turn - 3 * ease(time, 1930, 2540) - .65 * press;
    const sleeveScale = 1 - .19 * retreat - .003 * press;
    const sleeveY = clearance * retreat + drop * extract;
    const sleeveX = -width * .025 * extract;
    const sleeveTilt = -.65 * retreat + 2.5 * extract;
    const sleeve = 'translate3d(' + sleeveX + 'px,' + sleeveY +
      'px,0) rotate(' + sleeveTilt + 'deg) scale(' + sleeveScale + ')';

    // The letter starts inside the pocket. It rises independently while the
    // folded sleeve slides away, then settles into its exact in-page bounds.
    const lift = ease(time, 1590, 3390);
    const drift = Math.sin(Math.PI * lift);
    const cx = mix(width * (.5 + .022 * drift), targetX, approach);
    const cy = mix(height / 2 + clearance * retreat - (clearance + height * .12) * lift, targetY, approach);
    const scale = mix(fit * (1 - .19 * retreat), 1, approach);
    const paperTilt = (-.65 * retreat + 1.8 * drift) * (1 - approach);
    const paper = 'translate3d(' + (cx - targetX) + 'px,' + (cy - targetY) +
      'px,0) rotate(' + paperTilt + 'deg) scale(' + scale + ')';
    const offset = time / duration;
    const add = (name, values) => tracks[name].push({offset, ...values});
    for (const name of ['back','front','seal']) add(name, {transform:sleeve});
    const heightAboveGround = ease(time, 200, 1570) * (1 - extract);
    add('shadow', {
      transform:sleeve + ' translate(' + (2 + 6 * heightAboveGround) + 'px,' + (4 + 15 * heightAboveGround) + 'px)',
      opacity:.40 - .19 * heightAboveGround
    });
    add('hinge', {transform:sleeve, zIndex:angle < 90 ? 8 : 4});
    add('lid', {transform:'rotateX(' + angle + 'deg)'});
    add('wax', {transform:'translate(-50%,-50%) translateY(' + (-3 * peel) +
      'px) rotate(' + (-6 * peel) + 'deg) scale(' + (1 - press * .04 + peel * .025) + ')'});
    add('pocketPrint', {opacity:1 - ease(time, 190, 1060)});
    const incidence = Math.sin(Math.PI * turn);
    add('light', {opacity:incidence * .76});
    add('shade', {opacity:incidence * .9});
    if (time <= landingTime) tracks.paper.push({offset:time / landingTime, transform:paper});
    add('paperShade', {opacity:(.13 + .66 * incidence) * (1 - lift)});
    add('paperCast', {opacity:ease(time, 1570, 2830) * (1 - approach)});
    const controlOpacity = 1 - ease(time, 3920, 4930);
    add('skip', {opacity:controlOpacity});
    add('music', {opacity:controlOpacity});
    add('ground', {opacity:1 - ease(time, 3250, 5110)});
    const ink = 1 - ease(time, 0, 420);
    add('title', {opacity:ink});
    add('caption', {opacity:ink});
  }
  const now = performance.now();
  const elapsed = Math.max(0, now - started);
  const timeline = document.timeline && document.timeline.currentTime;
  for (const [name, keyframes] of Object.entries(tracks)) {
    // Give the last frames to the browser's normal, stationary text rendering.
    const timing = name === 'paper' ? {duration:landingTime, fill:'backwards'} : {duration, fill:'both'};
    const player = parts[name].animate(keyframes, timing);
    if (typeof timeline === 'number') player.startTime = timeline - elapsed;
    else player.currentTime = elapsed;
    players.push(player);
  }
}

function finishOpening(focusTarget = document.getElementById('names')) {
  clearTimeout(finishTimer);
  cancelAnimationFrame(layoutFrame);
  layoutFrame = 0;
  stopPlayers();
  opening = false;
  envelope.hidden = true;
  envelope.classList.remove('is-opening');
  invitation.inert = false;
  document.body.classList.remove('sealed', 'unfolding');
  focusTarget.focus({preventScroll:true});
  if (focusTarget.id === 'names') window.scrollTo(0, 0);
}

function queueLayout() {
  if (!opening || layoutFrame) return;
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0;
    try { layOutMotion(); } catch { finishOpening(); }
  });
}
window.addEventListener('resize', queueLayout);
if (document.fonts) document.fonts.ready.then(queueLayout);

openButton.addEventListener('click', () => {
  if (opening) return;
  // Guest activation is still available here on iOS, before moving any DOM.
  if (musicEnabled) playMusic();
  if (reducedMotion.matches || !stage.animate) { finishOpening(); return; }
  started = performance.now();
  opening = true;
  envelope.querySelector('.opening-status').textContent = 'פותחים את ההזמנה של גל וירין';
  envelope.classList.add('is-opening');
  document.body.classList.add('unfolding');
  try { layOutMotion(); } catch { finishOpening(); return; }
  finishTimer = setTimeout(finishOpening, Math.max(0, duration - (performance.now() - started)));
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
  if (opening) finishOpening();
  envelope.querySelector('.opening-status').textContent = '';
  envelope.hidden = false;
  invitation.inert = true;
  document.body.classList.add('sealed');
  envelope.focus({preventScroll:true});
  window.scrollTo(0, 0);
}
function restartInvitation() {
  pauseMusic(true);
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  showCover();
}
document.getElementById('replay').addEventListener('click', () => {
  restartInvitation();
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

const portrait = document.querySelector('.portrait-image');
const portraitFrame = portrait.closest('.portrait-frame');
async function showPortraitMounts() {
  if (portrait.decode) {
    try { await portrait.decode(); } catch { return; }
  }
  portraitFrame.classList.add('has-portrait');
}
portrait.addEventListener('load', showPortraitMounts);
portrait.addEventListener('error', () => portraitFrame.classList.remove('has-portrait'));
if (portrait.complete && portrait.naturalWidth) showPortraitMounts();

const countdown = document.querySelector('.countdown-clock');
const rsvpNote = document.querySelector('.rsvp-note');
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
  rsvpNote.hidden = finished;
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
window.addEventListener('hashchange', () => {
  if (location.hash) focusVenue();
  else window.scrollTo(0, 0);
});

// The static invitation and both calendar links work before enhancement.
document.querySelector('.header-actions').hidden = false;
const navigation = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
const returning = navigation ? ['reload', 'back_forward'].includes(navigation.type) :
  performance.navigation && [1, 2].includes(performance.navigation.type);
if (location.hash === '#details') focusVenue();
else if (returning) restartInvitation();
else if (!location.hash) showCover();

// A cached history entry resumes this document without running initialization again.
window.addEventListener('pageshow', event => {
  if (event.persisted && location.hash === '#details') focusVenue();
  else if (event.persisted) restartInvitation();
  requestAnimationFrame(() => {
    if (!envelope.hidden && !location.hash) window.scrollTo(0, 0);
  });
});
