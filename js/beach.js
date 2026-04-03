/**
 * beach.js — procedural beach scene, endlessly generated
 * Waves, sky, sun, palm tree. No two frames the same.
 */
(function () {
  var canvas = document.getElementById('beach-canvas');
  var ctx = canvas.getContext('2d');
  var t = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // --- Sky ---
  function drawSky() {
    var grad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.62);
    grad.addColorStop(0,    '#0d2b5e');
    grad.addColorStop(0.35, '#1a5c9e');
    grad.addColorStop(0.7,  '#6fb3d3');
    grad.addColorStop(0.9,  '#f5d998');
    grad.addColorStop(1,    '#f0b86e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.62);
  }

  // --- Sun ---
  function drawSun() {
    var sx = canvas.width * 0.72;
    var sy = canvas.height * 0.13;
    var r  = Math.max(canvas.width, canvas.height) * 0.038;

    // Atmospheric halo
    var halo = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 5);
    halo.addColorStop(0,   'rgba(255, 235, 140, 0.45)');
    halo.addColorStop(0.4, 'rgba(255, 190,  80, 0.15)');
    halo.addColorStop(1,   'rgba(255, 160,  50, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 5, 0, Math.PI * 2);
    ctx.fill();

    // Disc
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fff9e0';
    ctx.fill();
  }

  // --- Horizon & water reflection ---
  function drawReflection(horizonY, shoreY) {
    var sx = canvas.width * 0.72;
    var spreadTop = canvas.width * 0.05;
    var spreadBot = canvas.width * 0.13;

    var ref = ctx.createLinearGradient(0, horizonY, 0, shoreY);
    ref.addColorStop(0, 'rgba(255, 230, 120, 0.38)');
    ref.addColorStop(1, 'rgba(255, 200,  80, 0.0)');
    ctx.fillStyle = ref;
    ctx.beginPath();
    ctx.moveTo(sx - spreadTop, horizonY);
    ctx.lineTo(sx + spreadTop, horizonY);
    ctx.lineTo(sx + spreadBot, shoreY);
    ctx.lineTo(sx - spreadBot, shoreY);
    ctx.closePath();
    ctx.fill();
  }

  // --- Ocean ---
  function drawOcean(horizonY, shoreY) {
    var oceanGrad = ctx.createLinearGradient(0, horizonY, 0, shoreY);
    oceanGrad.addColorStop(0,   '#0e4a80');
    oceanGrad.addColorStop(0.5, '#1565c0');
    oceanGrad.addColorStop(1,   '#1e88e5');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, horizonY, canvas.width, shoreY - horizonY);

    // Wave layers (back to front)
    var layers = [
      { relY: 0.25, amp: 5,  freq: 0.008, speed: 0.18, alpha: 0.20 },
      { relY: 0.45, amp: 8,  freq: 0.012, speed: 0.28, alpha: 0.22 },
      { relY: 0.62, amp: 11, freq: 0.010, speed: 0.22, alpha: 0.25 },
      { relY: 0.78, amp: 9,  freq: 0.018, speed: 0.40, alpha: 0.30, foam: true },
      { relY: 0.91, amp: 6,  freq: 0.022, speed: 0.55, alpha: 0.45, foam: true },
    ];

    var rangeY = shoreY - horizonY;

    layers.forEach(function (l) {
      var baseY = horizonY + rangeY * l.relY;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (var x = 0; x <= canvas.width; x += 3) {
        var y = baseY
          + Math.sin(x * l.freq + t * l.speed) * l.amp
          + Math.sin(x * l.freq * 1.7 + t * l.speed * 0.6 + 1.2) * l.amp * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(canvas.width, shoreY + 10);
      ctx.lineTo(0, shoreY + 10);
      ctx.closePath();

      if (l.foam) {
        // White-tipped wave
        var foamGrad = ctx.createLinearGradient(0, baseY - l.amp, 0, baseY + l.amp * 2);
        foamGrad.addColorStop(0, 'rgba(255,255,255,' + (l.alpha + 0.25) + ')');
        foamGrad.addColorStop(1, 'rgba(100,180,255,' + l.alpha + ')');
        ctx.fillStyle = foamGrad;
      } else {
        ctx.fillStyle = 'rgba(100, 180, 255, ' + l.alpha + ')';
      }
      ctx.fill();
    });
  }

  // --- Sand ---
  function drawSand(shoreY) {
    var grad = ctx.createLinearGradient(0, shoreY, 0, canvas.height);
    grad.addColorStop(0,   '#f0d5a0');
    grad.addColorStop(0.2, '#e8c87a');
    grad.addColorStop(0.6, '#d4b060');
    grad.addColorStop(1,   '#c09848');
    ctx.fillStyle = grad;
    ctx.fillRect(0, shoreY, canvas.width, canvas.height - shoreY);

    // Wet sand strip at waterline
    var wet = ctx.createLinearGradient(0, shoreY, 0, shoreY + canvas.height * 0.04);
    wet.addColorStop(0, 'rgba(140,180,200,0.35)');
    wet.addColorStop(1, 'rgba(140,180,200,0)');
    ctx.fillStyle = wet;
    ctx.fillRect(0, shoreY, canvas.width, canvas.height * 0.04);
  }

  // --- Palm tree ---
  function drawPalm(rootX, rootY) {
    var trunkH = canvas.height * 0.32;
    var lean   = canvas.width  * 0.04;   // lean to the right
    var topX   = rootX + lean;
    var topY   = rootY - trunkH;

    // Trunk shadow
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rootX + 6, rootY + 4);
    ctx.bezierCurveTo(
      rootX + lean * 0.3 + 6, rootY - trunkH * 0.4 + 4,
      rootX + lean * 0.7 + 6, rootY - trunkH * 0.7 + 4,
      topX  + 6,              topY + 4
    );
    ctx.stroke();
    ctx.restore();

    // Trunk
    ctx.strokeStyle = '#7a5a1a';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.bezierCurveTo(
      rootX + lean * 0.3, rootY - trunkH * 0.4,
      rootX + lean * 0.7, rootY - trunkH * 0.7,
      topX, topY
    );
    ctx.stroke();

    // Trunk ring texture
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    for (var i = 0.08; i < 1; i += 0.07) {
      var rx = rootX + (topX - rootX) * i;
      var ry = rootY + (topY - rootY) * i;
      ctx.beginPath();
      ctx.moveTo(rx - 9, ry);
      ctx.lineTo(rx + 9, ry - 2);
      ctx.stroke();
    }

    // Coconuts
    ctx.fillStyle = '#6b4c10';
    for (var c = 0; c < 4; c++) {
      var ca = (c / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(topX + Math.cos(ca) * 7, topY + Math.sin(ca) * 4 + 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fronds — each one sways slightly
    var frondDefs = [
      { angle: -0.55, len: 1.00 },
      { angle: -1.05, len: 0.92 },
      { angle: -1.65, len: 0.95 },
      { angle: -2.30, len: 0.88 },
      { angle: -2.90, len: 0.82 },
      { angle:  0.10, len: 1.05 },
      { angle:  0.75, len: 0.90 },
      { angle:  1.40, len: 0.85 },
    ];
    var maxLen = canvas.height * 0.20;

    frondDefs.forEach(function (fd, idx) {
      var sway  = Math.sin(t * 0.25 + idx * 0.9) * 0.06;
      var a     = fd.angle + sway;
      var flen  = maxLen * fd.len;

      // Frond droops: mid control point is above the end
      var midX = topX + Math.cos(a) * flen * 0.5;
      var midY = topY + Math.sin(a) * flen * 0.5 - flen * 0.12;
      var endX = topX + Math.cos(a) * flen;
      var endY = topY + Math.sin(a) * flen * 0.7 + flen * 0.18;

      // Stem
      ctx.strokeStyle = '#2a5c15';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();

      // Leaflets along the stem
      var steps = 9;
      for (var s = 1; s < steps; s++) {
        var u  = s / steps;
        // point on quadratic bezier
        var lx = (1 - u) * (1 - u) * topX + 2 * (1 - u) * u * midX + u * u * endX;
        var ly = (1 - u) * (1 - u) * topY + 2 * (1 - u) * u * midY + u * u * endY;

        // tangent direction (derivative of quadratic)
        var dx = 2 * (1 - u) * (midX - topX) + 2 * u * (endX - midX);
        var dy = 2 * (1 - u) * (midY - topY) + 2 * u * (endY - midY);
        var len2 = Math.sqrt(dx * dx + dy * dy) || 1;
        var nx = -dy / len2;
        var ny =  dx / len2;

        var leafL = (flen * 0.18) * (1 - u * 0.5);
        ctx.strokeStyle = u < 0.4 ? '#3a8c20' : '#4aac28';
        ctx.lineWidth = 1.8;

        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + nx * leafL, ly + ny * leafL);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - nx * leafL, ly - ny * leafL);
        ctx.stroke();
      }
    });
  }

  // --- Main render loop ---
  var firstFrame = true;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var horizonY = canvas.height * 0.58;
    var shoreY   = canvas.height * 0.70;

    drawSky();
    drawSun();
    drawReflection(horizonY, shoreY);
    drawOcean(horizonY, shoreY);
    drawSand(shoreY);
    drawPalm(canvas.width * 0.14, shoreY + 2);

    if (firstFrame) {
      firstFrame = false;
      // Trigger CSS fade-in after first painted frame
      requestAnimationFrame(function () { canvas.style.opacity = 1; });
    }

    t += 0.016;
    requestAnimationFrame(draw);
  }

  draw();
})();
