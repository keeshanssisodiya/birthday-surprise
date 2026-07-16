/*
  script.js — Handles starfield, floating hearts, slideshow, music and confetti
*/

(function(){
  const DEV_MODE = false;

  // --- Configuration ---
  const IMAGES = [
    'assets/photos/1.jpg',
    'assets/photos/IMG-20260715-WA0005.jpg',
    'assets/photos/IMG-20260715-WA0006.jpg',
    'assets/photos/IMG-20260715-WA0007.jpg',
    'assets/photos/IMG-20260715-WA0008.jpg',
    'assets/photos/IMG-20260715-WA0009.jpg',
    'assets/photos/IMG-20260716-WA0000.jpg',
    'assets/photos/IMG-20260716-WA0001.jpg',
    'assets/photos/IMG-20260716-WA0002.jpg',
    'assets/photos/IMG-20260716-WA0003.jpg',
    'assets/photos/IMG-20260716-WA0004.jpg',
    'assets/photos/IMG-20260716-WA0005.jpg'
  ];

  const QUOTES = [
    "You are my favorite hello and hardest goodbye.",
    "In your arms is where I find my home.",
    "Every moment with you is a beautiful dream.",
    "Your smile is my sunrise, your love my guiding star.",
    "Together is my favorite place to be.",
    "I fell for you, and I'll keep falling every day.",
    "You are my calm and my storm — I love both.",
    "A thousand lifetimes wouldn't be enough for you.",
    "You make ordinary days extraordinary.",
    "I see forever when I look at you."
  ];

  const LETTER = [
    "MERI BETUU ❤️",
    "From the little moments to the grand adventures, you've filled my life with warmth and meaning.",
    "You are the quiet in my loud world, the steady in my chaos. I carry your laughter in my chest like the softest song.",
    "On this special day, I want you to know how deeply loved you are — today, tomorrow, and always.",
    "Forever Yours,",
    "Kishan Sisodiya ❤️"
  ];

  const SLIDE_DURATION = 7000; // ms per slide

  // --- State ---
  let images = [];
  let current = -1;
  let shownCount = 0;
  let slideshowTimer = null;
  let slideshowPaused = false;
  let slideTimerStart = 0;
  let slideRemaining = SLIDE_DURATION;
  let cinematicTimers = [];
  let letterTimers = [];

  // --- Elements ---
  const startBtn = document.getElementById('startBtn');
  const loader = document.getElementById('loader');
  const intro = document.getElementById('intro');
  const app = document.getElementById('app');
  const slideshow = document.getElementById('slideshow');
  const bgMusic = document.getElementById('bgMusic');
  const musicBtn = document.getElementById('musicBtn');
  const muteBtn = document.getElementById('muteBtn');
  const letterOverlay = document.getElementById('letter');
  const letterBody = document.getElementById('letterBody');
  const replayBtn = document.getElementById('replayBtn');
  const countdownEl = document.getElementById('countdown');
  const countdownPopup = document.getElementById('countdownPopup');
  const cinematicOverlay = document.getElementById('cinematicOverlay');
  const cinematicMessage = document.getElementById('cinematicMessage');
  const introTitle = document.getElementById('introTitle');
  const introSubtitle = document.getElementById('introSubtitle');
  const introTagline = document.getElementById('introTagline');
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  const TARGET_BIRTHDAY = new Date('2026-07-19T00:00:00+05:30');
  let countdownTimer = null;
  let isBirthdayLive = false;
  let directorSequence = null;
  window.__birthdayLiveOverride = false;

  function isBirthdayActivated(){
    if(DEV_MODE) return true;
    return isBirthdayLive || window.__birthdayLiveOverride === true;
  }

  // Helpers
  function shuffle(a){
    const b = a.slice();
    for(let i=b.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [b[i],b[j]]=[b[j],b[i]];
    }
    return b;
  }

  function preloadImages(list){
    const promises = list.map(src=>new Promise((res)=>{
      const img = new Image(); img.onload=()=>res(src); img.onerror=()=>res(src); img.src=src;
    }));
    return Promise.all(promises);
  }

  // Create slides
  function buildSlides(){
    slideshow.innerHTML = '';
    images.forEach((src, i)=>{
      const s = document.createElement('div');
      s.className = 'slide';
      s.dataset.index = i;
      s.innerHTML = `
        <div class="bg" style="background-image:url('${src}')"></div>
        <div class="overlay-dark"></div>
        <div class="content-wrap">
          <img class="center-photo" src="${src}" alt="Photo ${i+1}" />
          <div class="caption glass"><h3></h3></div>
        </div>
      `;
      slideshow.appendChild(s);
    });
  }

  // Show slide at index
  function showSlide(index){
    const slides = Array.from(document.querySelectorAll('.slide'));
    slides.forEach(s=>{
      s.classList.remove('show');
      const img = s.querySelector('.center-photo');
      if(img){
        img.classList.remove('animate');
        img.style.animation = 'none';
      }
    });
    const slide = slides[index];
    if(!slide) return;
    // animate only the centered photo (Ken Burns)
    const img = slide.querySelector('.center-photo');
    if(img){
      img.style.animation = 'none';
      void img.offsetWidth;
      img.classList.add('animate');
    }
    setSlideVisibility(slide, true);

    // caption: pick a quote (no photo count)
    const q = QUOTES[(index)%QUOTES.length];
    const slideCaption = slide.querySelector('.caption');
    if(slideCaption){
      const heading = slideCaption.querySelector('h3');
      if(heading) heading.textContent = q;
      slideCaption.classList.remove('visible');
      setTimeout(()=>slideCaption.classList.add('visible'),1000);
    }
  }

  // Compute days together from 18 June 2025 to today
  function computeDaysTogether(){
    const start = new Date(2025,5,18); // months are 0-based: 5 = June
    const now = new Date();
    const diff = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / (1000*60*60*24));
    return diff;
  }

  // Advance slideshow
  function nextSlide(){
    current = (current + 1) % images.length;
    showSlide(current);
    shownCount++;
    // After one full loop, show letter & confetti
    if(shownCount >= images.length){
      endSequence();
      return; // stop auto-advance
    }
    slideRemaining = SLIDE_DURATION;
    slideTimerStart = performance.now();
    slideshowTimer = setTimeout(nextSlide, slideRemaining);
  }

  function startSlideshow(){
    // ensure fresh counters
    current = -1; shownCount = 0;
    clearTimeout(slideshowTimer);
    slideshowPaused = false;
    slideRemaining = SLIDE_DURATION;
    slideTimerStart = performance.now();
    if(musicBtn) musicBtn.textContent = 'Pause';
    // show first slide immediately when the cinematic finishes
    nextSlide();
  }

  function setSlideVisibility(slide, visible){
    if(!slide) return;
    const img = slide.querySelector('.center-photo');
    const caption = slide.querySelector('.caption');
    if(visible){
      slide.classList.add('show');
      if(img){img.style.opacity='0'; img.style.transition='opacity 1s ease';}
      if(caption){caption.style.opacity='0'; caption.style.transition='opacity 0.7s ease';}
      requestAnimationFrame(()=>{
        if(img) img.style.opacity='1';
      });
      setTimeout(()=>{
        if(caption) caption.style.opacity='1';
      }, 1000);
    } else {
      slide.classList.remove('show');
      if(img) img.style.opacity='';
      if(caption) caption.style.opacity='';
    }
  }

  function pauseSlideshow(){
    if(slideshowPaused) return;
    slideshowPaused = true;
    if(slideshowTimer){
      clearTimeout(slideshowTimer);
      const elapsed = performance.now() - slideTimerStart;
      slideRemaining = Math.max(0, slideRemaining - elapsed);
    }
    if(bgMusic && !bgMusic.paused){
      bgMusic.pause();
    }
  }

  function resumeSlideshow(){
    if(!slideshowPaused) return;
    slideshowPaused = false;
    if(slideRemaining <= 0){
      nextSlide();
      return;
    }
    slideTimerStart = performance.now();
    slideshowTimer = setTimeout(nextSlide, slideRemaining);
    if(bgMusic && bgMusic.paused){
      bgMusic.play().catch(()=>{});
    }
  }

  function endSequence(){
    clearTimeout(slideshowTimer);
    // fade out slideshow and show letter immediately
    const slideEl = document.getElementById('slideshow');
    if(slideEl) slideEl.classList.add('fade-out');
    // show letter right away (no heavy effects before letter)
    setTimeout(()=>{ showLetter(); }, 200);
    // pause music softly
    fadeOutAudio(bgMusic, 2000);
  }

  // Fade out audio gradually
  function fadeOutAudio(audio, time){
    if(!audio) return;
    const start = audio.volume;
    const steps = 20; let step = 0;
    const t = setInterval(()=>{
      step++; audio.volume = Math.max(0, start*(1-step/steps));
      if(step>=steps){ clearInterval(t); audio.pause(); audio.volume = start; }
    }, time/steps);
  }

  // Letter display
  function showLetter(){
    // prepare letter overlay and typewriter effect
    letterBody.innerHTML = '';
    const letterCard = letterOverlay.querySelector('.letter');
    letterOverlay.classList.remove('hidden');
    // fade in the paper/card
    letterCard.classList.remove('letter-visible');
    void letterCard.offsetWidth;
    letterCard.classList.add('letter-visible');

    // typewriter
    const cursor = document.createElement('span'); cursor.className = 'type-cursor'; cursor.textContent = '';
    let pIndex = 0;
    function typeNextParagraph(){
      if(pIndex >= LETTER.length) return finishTyping();
      const para = LETTER[pIndex];
      const p = document.createElement('p');
      letterBody.appendChild(p);
      p.appendChild(cursor);
      let i = 0;
      function step(){
        const ch = para.charAt(i);
        if(!ch){
          // paragraph done
          if(cursor.parentNode) cursor.parentNode.removeChild(cursor);
          pIndex++;
          // small pause between paragraphs
          const pauseTimer = setTimeout(typeNextParagraph, 500 + Math.random()*400);
          letterTimers.push(pauseTimer);
          return;
        }
        p.insertBefore(document.createTextNode(ch), cursor);
        i++;
        // natural variable typing speed
        const delay = 18 + Math.random()*36;
        const stepTimer = setTimeout(step, delay);
        letterTimers.push(stepTimer);
      }
      step();
    }

    function finishTyping(){
      // ensure cursor removed
      const cur = letterBody.querySelector('.type-cursor'); if(cur && cur.parentNode) cur.parentNode.removeChild(cur);
      // pause before signature glow
      const revealTimer = setTimeout(()=>{
        // glow the final signature paragraph if present
        const paragraphs = letterBody.querySelectorAll('p');
        const lastP = paragraphs[paragraphs.length-1];
        if(lastP) lastP.classList.add('signature-glow');
        // start gentle petals, fireworks and confetti
        spawnPetals(26);
        spawnFireworks(3);
        runConfetti();
        // after a few seconds show replay button (centered)
        const replayTimer = setTimeout(()=>{
          ensureReplayButton();
        }, 4000);
        letterTimers.push(replayTimer);
      }, 2000);
      letterTimers.push(revealTimer);
    }

    // start typing after small card fade-in
    setTimeout(()=>{ typeNextParagraph(); }, 450);
  }

  function hideLetter(){ letterOverlay.classList.add('hidden'); }

  // Confetti implementation (simple canvas particle emitter)
  function runConfetti(){
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W = canvas.width = innerWidth; let H = canvas.height = innerHeight;
    const resizeHandler = ()=>{ W = canvas.width = innerWidth; H = canvas.height = innerHeight; };
    canvas._cleanupResize = resizeHandler;
    window.addEventListener('resize', resizeHandler);

    const colors = ['#ff6b81','#ffd166','#9ad3bc','#9ec5fe','#e0aaff'];
    const pieces = [];
    const count = 120;
    for(let i=0;i<count;i++){
      pieces.push({
        x: Math.random()*W,
        y: Math.random()*-H,
        vx: (Math.random()-0.5)*6,
        vy: 2+Math.random()*6,
        r: 6+Math.random()*8,
        color: colors[Math.floor(Math.random()*colors.length)],
        rot: Math.random()*360,
        vr: (Math.random()-0.5)*10
      });
    }

    let running = true;
    function frame(){
      ctx.clearRect(0,0,W,H);
      for(const p of pieces){
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x,p.y);
        ctx.rotate(p.rot*Math.PI/180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*0.6);
        ctx.restore();
      }
      // stop after some time
      if(running) requestAnimationFrame(frame);
    }
    frame();
    setTimeout(()=>{ running=false; canvas.remove(); },5000);
  }

  // Starfield background
  function initStars(){
    const canvas = document.getElementById('star-canvas');
    const cloudsCanvas = document.getElementById('clouds-canvas');
    const ctx = canvas.getContext('2d');
    const cctx = cloudsCanvas && cloudsCanvas.getContext ? cloudsCanvas.getContext('2d') : null;
    let W = canvas.width = innerWidth; let H = canvas.height = innerHeight;
    if(cctx){ cloudsCanvas.width = W; cloudsCanvas.height = H; }
    window.addEventListener('resize', ()=>{ W=canvas.width=innerWidth; H=canvas.height=innerHeight; if(cctx){ cloudsCanvas.width=W; cloudsCanvas.height=H } recreateStars(); if(cctx) createClouds(); });

    // Create three layers of stars for depth
    let smallStars = [], medStars = [], brightStars = [];
    function recreateStars(){
      smallStars = Array.from({length: Math.max(80, Math.floor((W*H)/14000))}, ()=>({x:Math.random()*W, y:Math.random()*H, r:Math.random()*0.7+0.3, base:0.45+Math.random()*0.6, speed:0.001+Math.random()*0.003, phase:Math.random()*Math.PI*2}));
      medStars = Array.from({length: Math.max(40, Math.floor((W*H)/60000))}, ()=>({x:Math.random()*W, y:Math.random()*H, r:Math.random()*1.2+0.6, base:0.5+Math.random()*0.5, speed:0.0008+Math.random()*0.002, phase:Math.random()*Math.PI*2}));
      brightStars = Array.from({length: Math.max(12, Math.floor((W*H)/220000))}, ()=>({x:Math.random()*W, y:Math.random()*H, r:Math.random()*2+0.8, base:0.6+Math.random()*0.6, speed:0.0006+Math.random()*0.0018, phase:Math.random()*Math.PI*2}));
    }
    recreateStars();

    // Clouds sprites
    const cloudSprites = [];
    function makeCloudSprite(w,h,alpha){
      const oc = document.createElement('canvas');
      oc.width = w; oc.height = h; const octx = oc.getContext('2d');
      octx.clearRect(0,0,w,h);
      octx.fillStyle = `rgba(255,255,255,${alpha})`;
      octx.shadowColor = `rgba(255,255,255,${alpha*0.6})`;
      octx.shadowBlur = Math.max(18, Math.min(60, w/8));
      for(let i=0;i<6;i++){
        const rx = Math.random()*w; const ry = Math.random()*h; const rw = w*0.3+Math.random()*w*0.6; const rh = h*0.4+Math.random()*h*0.6;
        octx.beginPath(); octx.ellipse(rx, ry, rw, rh, 0, 0, Math.PI*2); octx.fill();
      }
      return oc;
    }
    const clouds = [];
    function createClouds(){
      cloudSprites.length = 0; clouds.length = 0;
      const count = 4 + Math.floor(Math.random()*3);
      for(let i=0;i<count;i++){
        const cw = 600 + Math.random()*1000; const ch = 120 + Math.random()*160; const alpha = 0.06 + Math.random()*0.08;
        cloudSprites.push(makeCloudSprite(cw,ch,alpha));
        clouds.push({x:Math.random()*W, y:Math.random()*H*0.5, w:cw, h:ch, speed: 0.1 + Math.random()*0.25, alpha, spriteIndex:i});
      }
    }
    if(cctx) createClouds();

    // Shooting stars container
    const shooting = [];
    function spawnShootingStar(){
      const sx = Math.random()*W*0.9; const sy = Math.random()*H*0.25; // top area
      const len = 160 + Math.random()*240; const angle = (20+Math.random()*30) * Math.PI/180; // degrees to radians
      const speed = 800 + Math.random()*600; // px per second
      shooting.push({x:sx, y:sy, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, len, life: 0, ttl: 1000 + Math.random()*700});
      // schedule next
      scheduleNextShooting();
    }
    let shootingTimer = null;
    function scheduleNextShooting(){
      const delay = 15000 + Math.random()*15000; // 15-30s
      if(shootingTimer) clearTimeout(shootingTimer);
      shootingTimer = setTimeout(spawnShootingStar, delay);
    }
    scheduleNextShooting();

    // Draw loop
    let last = performance.now();
    function draw(now){
      const dt = now - last; last = now;
      ctx.clearRect(0,0,W,H);
      // subtle gradient background behind stars
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'rgba(10,6,20,0.95)'); g.addColorStop(1,'rgba(2,1,8,0.92)');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

      const t = now * 0.001;
      // draw layers (far -> near)
      ctx.globalCompositeOperation = 'lighter';
      function drawLayer(list, intensity){
        for(const s of list){
          const a = s.base * (0.6 + 0.4 * Math.sin(t * (0.5+s.speed*200) + s.phase));
          ctx.beginPath(); ctx.globalAlpha = Math.min(1, a*intensity);
          ctx.fillStyle = '#fff'; ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
        }
      }
      drawLayer(smallStars, 0.8);
      drawLayer(medStars, 1.0);
      drawLayer(brightStars, 1.3);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // draw shooting stars
      for(let i=shooting.length-1;i>=0;i--){
        const s = shooting[i];
        const progress = s.life / s.ttl;
        const x = s.x + s.vx * (s.life/1000);
        const y = s.y + s.vy * (s.life/1000);
        const trailLen = s.len;
        const alpha = 1 - progress;
        ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255,240,200,0.9)'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(Math.atan2(s.vy, s.vx))*trailLen, y - Math.sin(Math.atan2(s.vy, s.vx))*trailLen); ctx.stroke();
        ctx.restore();
        s.life += dt;
        if(s.life > s.ttl) shooting.splice(i,1);
      }

      // clouds drawn on separate canvas to keep layers distinct
      if(cctx){
        cctx.clearRect(0,0,W,H);
        for(const cl of clouds){
          const img = cloudSprites[cl.spriteIndex % cloudSprites.length];
          cl.x -= (cl.speed * dt) * 0.02; // very slow
          if(cl.x + cl.w < -50) cl.x = W + 50;
          cctx.globalAlpha = cl.alpha;
          cctx.drawImage(img, cl.x, cl.y, cl.w, cl.h);
        }
        cctx.globalAlpha = 1;
      }

      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // Floating hearts generator
  function startHearts(){
    const container = document.getElementById('hearts');
    const make = ()=>{
      const h = document.createElement('div'); h.className='heart';
      const size = 12 + Math.random()*28; h.style.width = h.style.height = size+'px';
      const left = Math.random()*100; h.style.left = left+'%';
      h.style.bottom = '-40px';
      const dur = 6 + Math.random()*8; h.style.animationDuration = dur+'s';
      h.classList.add('float');
      container.appendChild(h);
      // remove after done
      setTimeout(()=>{ h.remove(); }, (dur+0.5)*1000);
    };
    // spawn more frequently at start
    setInterval(make, 900);
  }

  // Controls
  musicBtn.addEventListener('click', ()=>{
    if(slideshowPaused){
      resumeSlideshow();
      musicBtn.textContent='Pause';
    } else {
      pauseSlideshow();
      musicBtn.textContent='Play';
    }
  });
  muteBtn.addEventListener('click', ()=>{ bgMusic.muted = !bgMusic.muted; muteBtn.textContent = bgMusic.muted ? 'Unmute' : 'Mute'; });

  function cleanupEndingEffects(){
    // remove petals
    document.querySelectorAll('.petal').forEach(el=>el.remove());
    // remove fireworks & confetti canvases
    const fcanvas = document.getElementById('fireworks-canvas'); if(fcanvas) fcanvas.remove();
    const ccanvas = document.getElementById('confetti-canvas'); if(ccanvas) ccanvas.remove();
    // hide replay button
    const rb = document.getElementById('replayBtn'); if(rb){ rb.classList.remove('replay-visible'); rb.style.display='none'; rb.style.opacity='0'; }
    // remove signature glow from any typed signature paragraph
    document.querySelectorAll('.signature-glow').forEach(el=>el.classList.remove('signature-glow'));
    // remove fireworks and confetti resize listeners if present
    document.querySelectorAll('canvas').forEach(canvas => {
      if(canvas._cleanupResize){ window.removeEventListener('resize', canvas._cleanupResize); canvas._cleanupResize = null; }
    });
    // ensure no lingering petal elements
    document.querySelectorAll('.petal').forEach(e=>e.remove());
  }

  function ensureReplayButton(){
    let btn = document.getElementById('replayBtn');
    if(!btn){
      const letterCard = document.querySelector('.letter');
      btn = document.createElement('button');
      btn.id = 'replayBtn';
      btn.className = 'btn';
      btn.textContent = '❤️ Replay Our Memories ❤️';
      btn.style.display = 'inline-block';
      btn.style.opacity = '0';
      btn.style.transition = 'opacity 600ms ease';
      btn.addEventListener('click', handleReplayClick);
      if(letterCard){ letterCard.appendChild(btn); }
    }
    btn.textContent = '❤️ Replay Our Memories ❤️';
    btn.classList.add('replay-visible');
    btn.style.display = 'inline-block';
    btn.style.visibility = 'visible';
    btn.style.opacity = '1';
    btn.style.zIndex = '1002';
    return btn;
  }

  function clearTimerGroup(timers){
    timers.forEach(id => clearTimeout(id));
    timers.length = 0;
  }

  function clearCinematicTimers(){
    clearTimerGroup(cinematicTimers);
  }

  function clearLetterTimers(){
    clearTimerGroup(letterTimers);
  }

  function handleReplayClick(){
    try{
      clearCinematicTimers();
      clearLetterTimers();
      cleanupEndingEffects();
      // hide letter overlay and reset its contents
      hideLetter();
      const letterCard = document.querySelector('.letter');
      if(letterCard){ letterCard.classList.remove('letter-visible'); }
      const bodyEl = document.getElementById('letterBody'); if(bodyEl) bodyEl.innerHTML = '';

      // reset slideshow state
      clearTimeout(slideshowTimer);
      current = -1; shownCount = 0;
      const slideEl = document.getElementById('slideshow'); if(slideEl) slideEl.classList.remove('fade-out');
      document.querySelectorAll('.slide').forEach(s=>{ s.classList.remove('show'); const img=s.querySelector('.center-photo'); if(img){ img.style.opacity=''; } const cap=s.querySelector('.caption'); if(cap) cap.style.opacity=''; });

      // ensure music continues
      if(bgMusic && bgMusic.paused){ bgMusic.play().catch(()=>{}); }
      slideshowPaused = false;
      slideRemaining = SLIDE_DURATION;

      // rebuild slides (keep same images order)
      images = shuffle(IMAGES);
      preloadImages(images).then(()=>{
        buildSlides();
        // run cinematic intro sequence then start slideshow
        playCinematicSequence().then(()=>{
          intro.classList.add('hidden');
          app.classList.remove('hidden');
          musicBtn.textContent='Pause';
          startSlideshow();
        }).catch(()=>{
          // fallback: ensure slideshow starts
          intro.classList.add('hidden'); app.classList.remove('hidden'); startSlideshow();
        });
      }).catch(()=>{
        // on preload error still attempt to start
        playCinematicSequence().then(()=>{ intro.classList.add('hidden'); app.classList.remove('hidden'); startSlideshow(); });
      });
    }catch(e){
      console.error('Replay handler error', e);
    }
  }
  replayBtn && replayBtn.addEventListener('click', handleReplayClick);
  document.addEventListener('click', (event) => {
    if(event.target && event.target.id === 'replayBtn'){
      handleReplayClick();
    }
  });

  // Petals effect
  function spawnPetals(count){
    const body = document.body;
    for(let i=0;i<count;i++){
      const el = document.createElement('div'); el.className='petal';
      const left = Math.random()*100; el.style.left = left+'%';
      const dur = 4000 + Math.random()*5000; const delay = Math.random()*800;
      el.style.top = '-10vh';
      el.style.opacity = 0.95;
      el.style.transform = `rotate(${Math.random()*360}deg)`;
      body.appendChild(el);
      // trigger CSS animation
      setTimeout(()=>{ el.style.animation = `petalFall ${dur}ms linear forwards`; el.style.transition = 'transform 1s linear'; }, delay);
      setTimeout(()=>{ el.remove(); }, delay + dur + 200);
    }
  }

  // Minimal fireworks: subtle bursts on a canvas
  function spawnFireworks(bursts=3){
    const canvas = document.createElement('canvas'); canvas.id='fireworks-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d'); let W=canvas.width=innerWidth; let H=canvas.height=innerHeight;
    const resizeHandler = ()=>{ W=canvas.width=innerWidth; H=canvas.height=innerHeight; };
    canvas._cleanupResize = resizeHandler;
    window.addEventListener('resize', resizeHandler);
    const particles = [];
    function launch(x,y){
      const count = 18 + Math.floor(Math.random()*18);
      for(let i=0;i<count;i++){
        const angle = Math.random()*Math.PI*2; const speed = 1.2 + Math.random()*3.2;
        particles.push({x,y,vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed, life:0, ttl:800+Math.random()*800, r:1+Math.random()*2, color:`hsl(${330+Math.random()*40},80%,60%)`});
      }
    }
    let running = true; let last = performance.now();
    function frame(now){
      const dt = now - last; last = now;
      ctx.clearRect(0,0,W,H);
      for(let i=particles.length-1;i>=0;i--){
        const p = particles[i]; p.life += dt; if(p.life>p.ttl){ particles.splice(i,1); continue; }
        p.x += p.vx * (dt/16); p.y += p.vy * (dt/16) + 0.03 * (dt/16);
        const alpha = 1 - (p.life / p.ttl);
        ctx.beginPath(); ctx.fillStyle = p.color; ctx.globalAlpha = alpha; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if(running) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    // schedule bursts
    for(let i=0;i<bursts;i++){
      setTimeout(()=>{
        const x = 100 + Math.random()*(W-200); const y = 60 + Math.random()*(H*0.35);
        launch(x,y);
      }, i*700 + Math.random()*500);
    }
    // cleanup after a while
    setTimeout(()=>{ running=false; canvas.remove(); }, bursts*1200 + 3000);
  }

  function setButtonState(enabled){
    startBtn.removeAttribute('disabled');
    startBtn.setAttribute('aria-disabled', String(!enabled));
    if(enabled){
      startBtn.classList.remove('disabled');
    } else {
      startBtn.classList.add('disabled');
    }
  }

  function showCountdownPopup(){
    if(!countdownPopup) return;
    countdownPopup.classList.remove('hidden');
    clearTimeout(countdownPopup._timeout);
    countdownPopup._timeout = setTimeout(()=>{
      countdownPopup.classList.add('hidden');
    }, 3000);
  }

  function fadeMusicIn(duration = 2500){
    if(!bgMusic) return;
    bgMusic.volume = 0;
    bgMusic.play().catch(()=>{});
    const start = Date.now();
    const step = ()=>{
      const elapsed = Date.now() - start;
      const ratio = Math.min(1, elapsed / duration);
      bgMusic.volume = ratio;
      if(ratio < 1) requestAnimationFrame(step);
    };
    step();
  }

  function setStarBrightness(bright){
    const canvas = document.getElementById('star-canvas');
    if(canvas){
      canvas.style.filter = bright ? 'brightness(1.18)' : '';
      canvas.style.transition = 'filter 2s ease';
    }
  }

  function slowHearts(){
    const hearts = document.querySelectorAll('.heart');
    hearts.forEach(h=>{
      const current = parseFloat(getComputedStyle(h).animationDuration) || 8;
      h.style.animationDuration = `${Math.max(current * 1.5, 10)}s`;
    });
  }

  function createCinematicLayer(){
    const layer = document.createElement('div');
    layer.className = 'cinematic-message-layer';
    return layer;
  }

  function playCinematicSequence(){
    if(!cinematicOverlay || !cinematicMessage) return Promise.resolve();

    const lines = [
      {text:'"Every love story is beautiful..."', small:false},
      {text:'"But ours is my favorite. ❤️"', small:true},
      {text:'Happy Birthday<br>Mera Baccha ❤️<br><br>19 July 2026', small:false},
      {text:'"Let\'s relive our beautiful memories..."', small:true}
    ];

    const schedule = [300, 2800, 5300, 8500, 11000];

    cinematicMessage.innerHTML = '';
    const layers = [createCinematicLayer(), createCinematicLayer()];
    cinematicMessage.append(layers[0], layers[1]);
    let activeIndex = 1;

    const showLine = (line) => {
      const nextIndex = activeIndex ^ 1;
      const nextLayer = layers[nextIndex];
      nextLayer.innerHTML = line.text;
      nextLayer.classList.toggle('small', line.small);
      nextLayer.classList.add('visible');
      layers[activeIndex].classList.remove('visible');
      activeIndex = nextIndex;
    };

    cinematicOverlay.classList.add('hidden');
    cinematicOverlay.classList.remove('visible');

    clearCinematicTimers();
    return new Promise(resolve => {
      schedule.forEach((time, idx) => {
        const timerId = setTimeout(() => {
          if(idx < lines.length){
            if(idx === 0){
              cinematicOverlay.classList.remove('hidden');
              cinematicOverlay.classList.add('visible');
            }
            showLine(lines[idx]);
            return;
          }

          cinematicOverlay.classList.remove('visible');
          cinematicOverlay.classList.add('hidden');
          resolve();
        }, time);
        cinematicTimers.push(timerId);
      });
    });
  }

  window.__runBirthdayCinematic = function(){
    return playCinematicSequence();
  };

  function formatUnit(value){
    return String(value).padStart(2, '0');
  }

  function updateCountdown(){
    const now = new Date();
    const diff = TARGET_BIRTHDAY - now;
    if(diff <= 0){
      isBirthdayLive = true;
      setButtonState(true);
      countdownEl?.classList.add('hidden');
      introTitle.textContent = '🎂 Happy Birthday';
      introSubtitle.textContent = 'Mera Baccha ❤️';
      introTagline.textContent = '';
      introSubtitle.style.marginBottom = '0';
      introTagline.style.display = 'none';
      introTitle.classList.add('birthday-unlock');
      clearInterval(countdownTimer);
      return;
    }

    const seconds = Math.floor(diff / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if(daysEl) daysEl.textContent = formatUnit(days);
    if(hoursEl) hoursEl.textContent = formatUnit(hours);
    if(minutesEl) minutesEl.textContent = formatUnit(minutes);
    if(secondsEl) secondsEl.textContent = formatUnit(secs);
    setButtonState(false);
  }

  function hasPastBirthday(){
    if(DEV_MODE) return true;
    return new Date() >= TARGET_BIRTHDAY;
  }

  // Intro start
  startBtn.addEventListener('click', ()=>{
    if(!isBirthdayActivated()){
      showCountdownPopup();
      return;
    }
    startBtn.classList.add('fade-out');
    setTimeout(()=> startBtn.classList.add('hidden'), 600);
    fadeMusicIn(2500);
    setStarBrightness(true);
    slowHearts();
    playCinematicSequence().then(()=>{
      intro.classList.add('hidden');
      app.classList.remove('hidden');
      musicBtn.textContent='Pause';
      startSlideshow();
    });
  });

  // Initialize everything
  function initSequence(replay=false){
    images = shuffle(IMAGES);
    preloadImages(images).then(()=>{
      // hide loader & show intro
      loader.classList.add('hidden');
      intro.classList.remove('hidden');
      buildSlides();
    });
    initStars(); startHearts();
    // update days together counter
    const el = document.getElementById('daysTogether');
    if(el){ el.textContent = `❤️ ${computeDaysTogether()} Days Together ❤️`; }
    // update birthday countdown immediately
    const nowLive = hasPastBirthday();
    if(nowLive){
      isBirthdayLive = true;
      setButtonState(true);
      countdownEl?.classList.add('hidden');
      introTitle.textContent = '🎂 Happy Birthday';
      introSubtitle.textContent = 'Mera Baccha ❤️';
      introTagline.textContent = '';
      introSubtitle.style.marginBottom = '0';
      introTagline.style.display = 'none';
      introTitle.classList.add('birthday-unlock');
    } else {
      updateCountdown();
      countdownTimer = setInterval(updateCountdown, 1000);
    }
    // refresh days together counter hourly in case date changes
    setInterval(()=>{ if(el) el.textContent = `❤️ ${computeDaysTogether()} Days Together ❤️`; }, 1000*60*60);
  }

  // small utility: start on DOM ready
  document.addEventListener('DOMContentLoaded', ()=>{
    initSequence();
  });

})();
