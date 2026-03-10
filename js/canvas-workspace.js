(function() {
  'use strict';

  // === Configuration ===
  // The canvas content dimensions (how big is the virtual canvas)
  const CANVAS_W = 1900;
  const CANVAS_H = 1800;

  // Scroll phases define the path through the canvas
  // Each phase maps a scroll range to a canvas transform
  const phases = [
    // Phase 0: Pan RIGHT (show Insights -> Travel App -> Data Table -> Doc -> Visual Ref)
    { scrollStart: 0, scrollEnd: 0.30, fromX: 0, fromY: 0, toX: -900, toY: 0 },
    // Phase 1: Pan DOWN (show Product Marketer, Prototype, Mobile apps, Code, Diagram)
    { scrollStart: 0.30, scrollEnd: 0.50, fromX: -900, fromY: 0, toX: -500, toY: -700 },
    // Phase 2: Continue DOWN to quote
    { scrollStart: 0.50, scrollEnd: 0.65, fromX: -500, fromY: -700, toX: -100, toY: -950 },
    // Phase 3: Pan RIGHT (Testimonials -> AI/Team section)
    { scrollStart: 0.65, scrollEnd: 1.0, fromX: -100, fromY: -950, toX: -700, toY: -1200 },
  ];

  // Total scroll distance allocated to the canvas section
  const SCROLL_DISTANCE = 4500; // pixels of scroll to traverse the entire canvas

  const outer = document.getElementById('scrollCanvasOuter');
  const inner = document.getElementById('scrollCanvasInner');
  const sticky = document.getElementById('scrollCanvasSticky');
  const titleOverlay = document.getElementById('canvasTitleOverlay');
  const progressDots = document.querySelectorAll('.scroll-progress-dot');

  // Set outer height to create scroll space
  outer.style.height = SCROLL_DISTANCE + 'px';

  // Easing function for smooth interpolation
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateCanvas);
  }

  function updateCanvas() {
    ticking = false;

    const rect = outer.getBoundingClientRect();
    const viewH = window.innerHeight;

    // How far we've scrolled into the canvas section
    // rect.top starts positive (below viewport), goes negative as we scroll past
    const scrolled = -rect.top;
    const totalScroll = SCROLL_DISTANCE - viewH;

    // Normalize to 0-1
    const progress = Math.max(0, Math.min(1, scrolled / totalScroll));

    // Find current phase and interpolate
    let x = phases[phases.length - 1].toX;
    let y = phases[phases.length - 1].toY;
    let currentPhase = phases.length - 1;

    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      if (progress >= p.scrollStart && progress <= p.scrollEnd) {
        const phaseProgress = (progress - p.scrollStart) / (p.scrollEnd - p.scrollStart);
        const eased = easeInOutCubic(phaseProgress);
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
    const vw = window.innerWidth;
    const scale = Math.min(1, vw / 1400);
    const offsetX = (vw - 1400 * scale) / 2;

    inner.style.transform =
      'translate(' + (x * scale + offsetX) + 'px,' + (y * scale + 120) + 'px) scale(' + scale + ')';

    // Fade title overlay as we scroll
    const titleOpacity = Math.max(0, 1 - progress * 5);
    titleOverlay.style.opacity = titleOpacity;

    // Update progress dots
    progressDots.forEach(function(dot, i) {
      dot.classList.toggle('active', i === currentPhase);
    });
  }

  // Initial setup
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function() { requestAnimationFrame(updateCanvas); });

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
