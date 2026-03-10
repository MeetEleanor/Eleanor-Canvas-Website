(function() {
  'use strict';

  // === Configuration ===
  const CANVAS_W = 1900;
  const CANVAS_H = 1800;

  // Total scroll distance — extended to accommodate particle intro phase
  const SCROLL_DISTANCE = 6000;

  // Phase 0: Particle convergence (new!) — canvas content stays hidden, particles converge
  // Phases 1-4: Original canvas panning phases (shifted forward)
  const PARTICLE_PHASE_END = 0.18; // particles finish converging at 18% scroll

  const phases = [
    // Phase 0: Particles converge (canvas content fades in at the end)
    { scrollStart: 0, scrollEnd: PARTICLE_PHASE_END, fromX: 0, fromY: 0, toX: 0, toY: 0 },
    // Phase 1: Pan RIGHT (Insights -> Travel App -> Data Table -> Doc -> Visual Ref)
    { scrollStart: PARTICLE_PHASE_END, scrollEnd: 0.38, fromX: 0, fromY: 0, toX: -900, toY: 0 },
    // Phase 2: Pan DOWN (Product Marketer, Prototype, Mobile apps, Code, Diagram)
    { scrollStart: 0.38, scrollEnd: 0.55, fromX: -900, fromY: 0, toX: -500, toY: -700 },
    // Phase 3: Continue DOWN to quote
    { scrollStart: 0.55, scrollEnd: 0.70, fromX: -500, fromY: -700, toX: -100, toY: -950 },
    // Phase 4: Pan RIGHT (Testimonials -> AI/Team section)
    { scrollStart: 0.70, scrollEnd: 1.0, fromX: -100, fromY: -950, toX: -700, toY: -1200 },
  ];

  // === DOM refs ===
  const outer = document.getElementById('scrollCanvasOuter');
  const inner = document.getElementById('scrollCanvasInner');
  const sticky = document.getElementById('scrollCanvasSticky');
  const titleOverlay = document.getElementById('canvasTitleOverlay');
  const progressDots = document.querySelectorAll('.scroll-progress-dot');
  const particleCanvas = document.getElementById('particleCanvas');
  const ctx = particleCanvas.getContext('2d');

  // Set outer height
  outer.style.height = SCROLL_DISTANCE + 'px';

  // === Particle system ===
  var PARTICLE_COUNT = 90;
  var particles = [];

  // Brand-inspired colors for particles (Eleanor palette — blues, purples, warm accents)
  var PARTICLE_COLORS = [
    'rgba(66, 98, 255, 0.8)',   // blue-primary
    'rgba(124, 58, 237, 0.7)',  // purple
    'rgba(0, 188, 212, 0.7)',   // cyan
    'rgba(255, 193, 7, 0.8)',   // brand yellow
    'rgba(233, 30, 99, 0.6)',   // pink
    'rgba(76, 175, 80, 0.6)',   // green
    'rgba(255, 138, 101, 0.7)', // coral
  ];

  // Target convergence points — these map roughly to where the first canvas items are,
  // creating the effect of particles forming into the INSIGHTS/Travel App area
  function getConvergenceTargets(w, h) {
    // Cluster around the initial visible canvas area (upper-left region)
    var cx = w * 0.35;
    var cy = h * 0.45;
    return { cx: cx, cy: cy, spread: Math.min(w, h) * 0.18 };
  }

  function initParticles() {
    var w = particleCanvas.width;
    var h = particleCanvas.height;
    particles = [];

    for (var i = 0; i < PARTICLE_COUNT; i++) {
      // Random scatter positions — spread well beyond the viewport edges
      var angle = Math.random() * Math.PI * 2;
      var dist = 0.5 + Math.random() * 0.8; // normalized distance from center
      var scatterX = w / 2 + Math.cos(angle) * w * dist;
      var scatterY = h / 2 + Math.sin(angle) * h * dist;

      // Convergence target — cluster near the initial canvas content
      var targets = getConvergenceTargets(w, h);
      var tAngle = Math.random() * Math.PI * 2;
      var tDist = Math.random() * targets.spread;
      var targetX = targets.cx + Math.cos(tAngle) * tDist;
      var targetY = targets.cy + Math.sin(tAngle) * tDist;

      particles.push({
        // Scattered starting position
        sx: scatterX,
        sy: scatterY,
        // Convergence target
        tx: targetX,
        ty: targetY,
        // Current position (will be interpolated)
        x: scatterX,
        y: scatterY,
        // Visual properties
        radius: 2 + Math.random() * 4,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        // Each particle has a slight delay/speed offset for organic feel
        delay: Math.random() * 0.3,
        // Trail properties
        trail: [],
        trailMax: 4 + Math.floor(Math.random() * 4),
        // Wobble
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmp: 2 + Math.random() * 6,
        wobbleSpeed: 0.8 + Math.random() * 1.2,
      });
    }
  }

  function resizeParticleCanvas() {
    var rect = sticky.getBoundingClientRect();
    particleCanvas.width = rect.width;
    particleCanvas.height = rect.height;
    initParticles();
  }

  // Easing functions
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // === Draw particles ===
  function drawParticles(progress) {
    var w = particleCanvas.width;
    var h = particleCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Particle phase progress: 0 = fully scattered, 1 = fully converged
    var rawPhaseProgress = progress / PARTICLE_PHASE_END;
    var phaseProgress = Math.max(0, Math.min(1, rawPhaseProgress));

    // Overall particle canvas opacity — fade out once converged
    var fadeOutStart = PARTICLE_PHASE_END * 0.75;
    var fadeOutEnd = PARTICLE_PHASE_END * 1.1;
    var canvasOpacity = 1;
    if (progress > fadeOutStart) {
      canvasOpacity = 1 - Math.min(1, (progress - fadeOutStart) / (fadeOutEnd - fadeOutStart));
    }

    if (canvasOpacity <= 0) {
      particleCanvas.style.opacity = '0';
      return;
    }
    particleCanvas.style.opacity = String(canvasOpacity);

    var time = performance.now() / 1000;

    // Draw connection lines between nearby converged particles
    if (phaseProgress > 0.5) {
      var lineOpacity = (phaseProgress - 0.5) * 2; // 0-1 over second half
      ctx.strokeStyle = 'rgba(66, 98, 255, ' + (lineOpacity * 0.12 * canvasOpacity) + ')';
      ctx.lineWidth = 1;
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    // Draw each particle
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      // Per-particle progress with staggered delay
      var pProgress = Math.max(0, Math.min(1, (phaseProgress - p.delay) / (1 - p.delay)));
      var eased = easeOutQuart(pProgress);

      // Interpolate from scattered to converged
      var baseX = lerp(p.sx, p.tx, eased);
      var baseY = lerp(p.sy, p.ty, eased);

      // Add wobble that diminishes as particles converge
      var wobbleFade = 1 - eased;
      p.x = baseX + Math.sin(time * p.wobbleSpeed + p.wobblePhase) * p.wobbleAmp * wobbleFade;
      p.y = baseY + Math.cos(time * p.wobbleSpeed * 0.7 + p.wobblePhase) * p.wobbleAmp * wobbleFade;

      // Update trail
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > p.trailMax) p.trail.shift();

      // Draw trail
      if (p.trail.length > 1 && pProgress < 0.95) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (var t = 1; t < p.trail.length; t++) {
          ctx.lineTo(p.trail[t].x, p.trail[t].y);
        }
        ctx.strokeStyle = p.color.replace(/[\d.]+\)$/, (0.15 * (1 - eased)) + ')');
        ctx.lineWidth = p.radius * 0.5;
        ctx.stroke();
      }

      // Draw particle glow
      var glowRadius = p.radius * (1.5 + (1 - eased) * 2);
      var glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
      glow.addColorStop(0, p.color);
      glow.addColorStop(1, p.color.replace(/[\d.]+\)$/, '0)'));
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Draw solid core
      var coreRadius = p.radius * (0.6 + eased * 0.4);
      ctx.beginPath();
      ctx.arc(p.x, p.y, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  }

  // === Main scroll handler ===
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateCanvas);
  }

  function updateCanvas() {
    ticking = false;

    var rect = outer.getBoundingClientRect();
    var viewH = window.innerHeight;
    var scrolled = -rect.top;
    var totalScroll = SCROLL_DISTANCE - viewH;
    var progress = Math.max(0, Math.min(1, scrolled / totalScroll));

    // --- Particle rendering ---
    drawParticles(progress);

    // --- Canvas content opacity: fade in as particles converge ---
    var contentFadeStart = PARTICLE_PHASE_END * 0.5;
    var contentFadeEnd = PARTICLE_PHASE_END;
    var contentOpacity = 0;
    if (progress >= contentFadeStart) {
      contentOpacity = Math.min(1, (progress - contentFadeStart) / (contentFadeEnd - contentFadeStart));
    }
    inner.style.opacity = String(contentOpacity);

    // --- Find current phase and interpolate canvas position ---
    var x = phases[phases.length - 1].toX;
    var y = phases[phases.length - 1].toY;
    var currentPhase = phases.length - 1;

    for (var i = 0; i < phases.length; i++) {
      var p = phases[i];
      if (progress >= p.scrollStart && progress <= p.scrollEnd) {
        var phaseProgress = (progress - p.scrollStart) / (p.scrollEnd - p.scrollStart);
        var eased = easeInOutCubic(phaseProgress);
        x = lerp(p.fromX, p.toX, eased);
        y = lerp(p.fromY, p.toY, eased);
        currentPhase = i;
        break;
      } else if (progress < p.scrollStart) {
        x = p.fromX;
        y = p.fromY;
        currentPhase = i;
        break;
      }
    }

    // Apply scale to fit viewport (responsive)
    var vw = window.innerWidth;
    var scale = Math.min(1, vw / 1400);
    var offsetX = (vw - 1400 * scale) / 2;

    inner.style.transform =
      'translate(' + (x * scale + offsetX) + 'px,' + (y * scale + 120) + 'px) scale(' + scale + ')';

    // Fade title overlay
    var titleOpacity = Math.max(0, 1 - progress * 5);
    titleOverlay.style.opacity = titleOpacity;

    // Update progress dots
    progressDots.forEach(function(dot, i) {
      dot.classList.toggle('active', i === currentPhase);
    });
  }

  // === Initialize ===
  resizeParticleCanvas();
  inner.style.opacity = '0'; // start hidden, particles visible first

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function() {
    resizeParticleCanvas();
    requestAnimationFrame(updateCanvas);
  });

  // Run once on load
  requestAnimationFrame(updateCanvas);

  // === Fade-in observer ===
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.fade-in').forEach(function(el) { obs.observe(el); });

  // === Animate cursors on the canvas ===
  var cursors = inner.querySelectorAll('.cv-cursor');
  cursors.forEach(function(c) {
    var baseLeft = parseFloat(c.style.left) || 0;
    var baseTop = parseFloat(c.style.top) || 0;
    c._baseX = baseLeft;
    c._baseY = baseTop;
    c._phase = Math.random() * Math.PI * 2;
    c._speedX = 0.3 + Math.random() * 0.4;
    c._speedY = 0.2 + Math.random() * 0.3;
    c._ampX = 15 + Math.random() * 25;
    c._ampY = 10 + Math.random() * 20;
  });

  function animateCursors(ts) {
    var t = ts / 1000;
    cursors.forEach(function(c) {
      var nx = c._baseX + Math.sin(t * c._speedX + c._phase) * c._ampX;
      var ny = c._baseY + Math.cos(t * c._speedY + c._phase) * c._ampY;
      c.style.left = nx + 'px';
      c.style.top = ny + 'px';
    });
    requestAnimationFrame(animateCursors);
  }
  requestAnimationFrame(animateCursors);

})();
