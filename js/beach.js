/**
 * beach.js — WebGL fragment-shader beach scene + canvas2D palm tree
 *
 * Two layered canvases:
 *  #beach-canvas  → WebGL  (sky, clouds, ocean, sand)
 *  palmCanvas     → 2D     (palm tree, inserted on top)
 */
(function () {

  // ─── WebGL background ────────────────────────────────────────────────────────

  var bg = document.getElementById('beach-canvas');
  var gl = bg.getContext('webgl') || bg.getContext('experimental-webgl');

  var VERT = [
    'attribute vec2 a;',
    'void main(){gl_Position=vec4(a,0.,1.);}',
  ].join('');

  // Fragment shader — one string per line for readability
  var FRAG = [
    'precision highp float;',
    'uniform float uT;',
    'uniform vec2 uR;',

    // ---- noise helpers ----
    'float h(vec2 p){p=fract(p*vec2(127.1,311.7));p+=dot(p,p+19.19);return fract(p.x*p.y);}',
    'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    '  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float fbm(vec2 p){float s=0.,a=.5;',
    '  for(int i=0;i<6;i++){s+=a*vn(p);p*=2.1;a*=.5;}return s;}',

    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/uR; uv.y=1.-uv.y;',

    // scene layout
    '  float HZ=0.415;',  // horizon
    '  float SH=0.625;',  // shoreline

    '  vec3 col=vec3(0.);',

    // ───── SKY ─────
    '  if(uv.y<HZ){',
    '    float t=uv.y/HZ;',
    '    col=mix(vec3(.63,.83,.95),vec3(.28,.58,.91),pow(t,.55));',

    // clouds — domain-warped FBM
    '    vec2 q=vec2(uv.x+uT*.007,uv.y*2.8+.9);',
    '    vec2 r2=vec2(fbm(q),fbm(q+vec2(5.2,1.3)));',
    '    float cv=fbm(q+r2);',
    '    float cm=smoothstep(.53,.72,cv);',
    // clouds cluster in lower half of sky
    '    cm*=smoothstep(0.,.28,t)*smoothstep(.92,.22,t);',
    '    col=mix(col,vec3(.96,.98,1.),cm*.88);',

    '  } else if(uv.y<SH){',

    // ───── OCEAN ─────
    '  float ot=(uv.y-HZ)/(SH-HZ);',

    // depth colour: deep navy → teal → turquoise shallows
    '  vec3 deep=vec3(.07,.28,.54),mid=vec3(.10,.50,.65),shal=vec3(.20,.70,.73);',
    '  col=mix(deep,mid,clamp(ot*2.,0.,1.));',
    '  col=mix(col,shal,clamp(ot*2.-1.,0.,1.));',

    // wave crests (additive sine layers)
    '  float w=0.;',
    '  w+=sin(uv.x*7.+uT*.90)*0.035;',
    '  w+=sin(uv.x*11.-uT*1.3+1.4)*0.020;',
    '  w+=sin(uv.x*4.5+uT*.60+2.1)*0.025;',
    '  w+=sin(uv.x*16.+uT*1.8+0.8)*0.012;',
    '  col+=vec3(.55,.80,.90)*max(0.,w);',

    // sun reflection streak
    '  float sd=length(uv-vec2(.72,.12));',
    '  col+=vec3(1.,.95,.75)*exp(-sd*9.)*.35*(1.-ot*.4);',

    // surface shimmer / micro-waves
    '  col+=vn(vec2(uv.x*45.+uT*.9,uv.y*22.))*.055*(1.-ot*.7);',

    // shore foam band
    '  float fl=smoothstep(.78,.93,ot);',
    '  float fn=vn(vec2(uv.x*38.+uT*1.8,uv.y*10.));',
    '  col=mix(col,vec3(.94,.97,1.),fl*(fn*.5+.5)*.85);',

    '  } else {',

    // ───── SAND ─────
    '  float st=(uv.y-SH)/(1.-SH);',
    '  col=mix(vec3(.70,.65,.50),vec3(.95,.91,.76),pow(st,.35));',
    '  col+=vn(uv*vec2(110.,70.))*.022;',
    // wet sheen at waterline
    '  col+=vec3(.14,.20,.20)*(1.-smoothstep(0.,.12,st))*.10;',

    '  }',

    // horizon atmospheric haze
    '  float hz=smoothstep(.33,.43,uv.y)*(1.-smoothstep(.43,.60,uv.y));',
    '  col=mix(col,vec3(.80,.91,.97),hz*.22);',

    // vignette
    '  vec2 vp=uv*2.-1.;',
    '  col*=mix(.70,1.,1.-dot(vp*.38,vp*.38));',

    '  gl_FragColor=vec4(col,1.);',
    '}',
  ].join('\n');

  function mkShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, mkShader(gl.VERTEX_SHADER,   VERT));
  gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  var aLoc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

  var uT = gl.getUniformLocation(prog, 'uT');
  var uR = gl.getUniformLocation(prog, 'uR');

  // ─── Canvas 2D palm tree overlay ─────────────────────────────────────────────

  var pc = document.createElement('canvas');
  pc.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:block;pointer-events:none;';
  bg.parentNode.insertBefore(pc, bg.nextSibling);
  var ctx = pc.getContext('2d');

  // ─── Resize ──────────────────────────────────────────────────────────────────

  function resize() {
    bg.width = pc.width = window.innerWidth;
    bg.height = pc.height = window.innerHeight;
    gl.viewport(0, 0, bg.width, bg.height);
  }
  window.addEventListener('resize', resize);
  resize();

  // ─── Palm tree ───────────────────────────────────────────────────────────────

  // Evaluate cubic bezier and its tangent at parameter t
  function bezPt(t, x0, y0, x1, y1, x2, y2, x3, y3) {
    var m = 1 - t;
    return {
      x: m*m*m*x0 + 3*m*m*t*x1 + 3*m*t*t*x2 + t*t*t*x3,
      y: m*m*m*y0 + 3*m*m*t*y1 + 3*m*t*t*y2 + t*t*t*y3,
      tx: 3*(m*m*(x1-x0) + 2*m*t*(x2-x1) + t*t*(x3-x2)),
      ty: 3*(m*m*(y1-y0) + 2*m*t*(y2-y1) + t*t*(y3-y2)),
    };
  }

  // Evaluate quadratic bezier
  function qbezPt(t, x0, y0, x1, y1, x2, y2) {
    var m = 1 - t;
    return {
      x: m*m*x0 + 2*m*t*x1 + t*t*x2,
      y: m*m*y0 + 2*m*t*y1 + t*t*y2,
      tx: 2*(m*(x1-x0) + t*(x2-x1)),
      ty: 2*(m*(y1-y0) + t*(y2-y1)),
    };
  }

  function drawPalm(W, H, time) {
    ctx.clearRect(0, 0, W, H);

    // Trunk: base buried in sand bottom-right, leans left toward water
    var bx = W * 0.73, by = H * 0.67;
    var tx = W * 0.50, ty = H * 0.06;
    var c1x = W * 0.72, c1y = H * 0.40;
    var c2x = W * 0.60, c2y = H * 0.22;

    var baseHW = W * 0.013;  // half-width at base
    var topHW  = W * 0.006;  // half-width at crown

    // Build trunk outline by sampling bezier
    var STEPS = 50;
    var lPts = [], rPts = [];
    for (var i = 0; i <= STEPS; i++) {
      var b = bezPt(i / STEPS, bx, by, c1x, c1y, c2x, c2y, tx, ty);
      var len = Math.sqrt(b.tx*b.tx + b.ty*b.ty) || 1;
      var nx = -b.ty / len, ny = b.tx / len;
      var hw = baseHW + (topHW - baseHW) * (i / STEPS);
      lPts.push([b.x + nx*hw, b.y + ny*hw]);
      rPts.push([b.x - nx*hw, b.y - ny*hw]);
    }

    // Ground shadow
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = baseHW * 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx + 10, by + 6);
    ctx.bezierCurveTo(c1x + 10, c1y + 5, c2x + 8, c2y + 4, tx + 8, ty + 4);
    ctx.stroke();
    ctx.restore();

    // Trunk fill — tapered polygon with gradient
    var tGrad = ctx.createLinearGradient(tx - baseHW, ty, bx + baseHW, by);
    tGrad.addColorStop(0,   '#a07828');
    tGrad.addColorStop(0.3, '#8a6018');
    tGrad.addColorStop(0.7, '#6a4810');
    tGrad.addColorStop(1,   '#4e3208');
    ctx.fillStyle = tGrad;
    ctx.beginPath();
    ctx.moveTo(lPts[0][0], lPts[0][1]);
    for (var i = 1; i <= STEPS; i++) ctx.lineTo(lPts[i][0], lPts[i][1]);
    for (var i = STEPS; i >= 0; i--) ctx.lineTo(rPts[i][0], rPts[i][1]);
    ctx.closePath();
    ctx.fill();

    // Trunk left-edge highlight
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.strokeStyle = '#c8a050';
    ctx.lineWidth = topHW * 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lPts[0][0], lPts[0][1]);
    for (var i = 1; i <= STEPS; i++) ctx.lineTo(lPts[i][0], lPts[i][1]);
    ctx.stroke();
    ctx.restore();

    // Trunk ring scars
    ctx.strokeStyle = 'rgba(30,15,0,.20)';
    ctx.lineWidth = 1.2;
    for (var r = 1; r <= 16; r++) {
      var b = bezPt(r / 17, bx, by, c1x, c1y, c2x, c2y, tx, ty);
      var len = Math.sqrt(b.tx*b.tx + b.ty*b.ty) || 1;
      var nx = -b.ty / len, ny = b.tx / len;
      var hw = (baseHW + (topHW - baseHW) * (r / 17)) * 1.15;
      ctx.beginPath();
      ctx.moveTo(b.x + nx*hw, b.y + ny*hw);
      ctx.lineTo(b.x - nx*hw, b.y - ny*hw);
      ctx.stroke();
    }

    // Small sandy mound at base
    ctx.save();
    ctx.globalAlpha = 0.35;
    var mGrad = ctx.createRadialGradient(bx, by, 0, bx, by, baseHW * 4);
    mGrad.addColorStop(0, '#c8a85a');
    mGrad.addColorStop(1, 'rgba(200,168,90,0)');
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.ellipse(bx, by, baseHW * 4, baseHW * 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Coconuts
    ctx.fillStyle = '#4a3008';
    for (var ci = 0; ci < 5; ci++) {
      var ca = (ci / 5) * Math.PI * 2;
      var cr = W * 0.011;
      ctx.beginPath();
      ctx.arc(tx + Math.cos(ca)*cr*0.65, ty + Math.sin(ca)*cr*0.4 + cr, cr*0.85, 0, Math.PI*2);
      ctx.fill();
    }

    // ─── Fronds ──────────────────────────────────────────────────────────────
    var frondDefs = [
      { a: -0.38, l: 1.00 },
      { a: -0.82, l: 0.96 },
      { a: -1.30, l: 0.90 },
      { a: -1.82, l: 0.86 },
      { a: -2.38, l: 0.80 },
      { a: -2.90, l: 0.75 },
      { a:  0.22, l: 1.04 },
      { a:  0.78, l: 0.93 },
      { a:  1.35, l: 0.83 },
      { a:  1.95, l: 0.70 },
    ];

    var maxLen = H * 0.24;

    frondDefs.forEach(function (fd, idx) {
      var sway  = Math.sin(time * 0.22 + idx * 1.1) * 0.045;
      var angle = fd.a + sway;
      var flen  = maxLen * fd.l;

      // Frond curves from crown outward then droops
      var ex = Math.cos(angle), ey = Math.sin(angle);
      var endX = tx + ex * flen;
      var endY = ty + ey * flen * 0.65 + flen * 0.28;
      var midX = tx + ex * flen * 0.48;
      var midY = ty + ey * flen * 0.38 - flen * 0.08;

      // ── Filled frond shape (tapered) ──────────────────────────────────────
      var FS = 20;
      var lp = [], rp = [];
      for (var s = 0; s <= FS; s++) {
        var ft = s / FS;
        var q = qbezPt(ft, tx, ty, midX, midY, endX, endY);
        var tl = Math.sqrt(q.tx*q.tx + q.ty*q.ty) || 1;
        var fnx = -q.ty / tl, fny = q.tx / tl;
        var fw = flen * 0.055 * (1 - ft * 0.88);
        lp.push([q.x + fnx*fw, q.y + fny*fw]);
        rp.push([q.x - fnx*fw, q.y - fny*fw]);
      }

      var fGrad = ctx.createLinearGradient(tx, ty, endX, endY);
      fGrad.addColorStop(0,   '#1a5c0a');
      fGrad.addColorStop(0.25,'#268a10');
      fGrad.addColorStop(0.6, '#38b018');
      fGrad.addColorStop(1,   '#4acc20');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.moveTo(lp[0][0], lp[0][1]);
      for (var s = 1; s <= FS; s++) ctx.lineTo(lp[s][0], lp[s][1]);
      for (var s = FS; s >= 0; s--) ctx.lineTo(rp[s][0], rp[s][1]);
      ctx.closePath();
      ctx.fill();

      // Midrib
      ctx.strokeStyle = 'rgba(15,55,5,.40)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();

      // ── Leaflets ──────────────────────────────────────────────────────────
      var LEAVES = 11;
      for (var li = 1; li < LEAVES; li++) {
        var lt  = li / LEAVES;
        var q   = qbezPt(lt, tx, ty, midX, midY, endX, endY);
        var tl  = Math.sqrt(q.tx*q.tx + q.ty*q.ty) || 1;
        var lnx = -q.ty / tl, lny = q.tx / tl;
        var ll  = flen * 0.13 * (1 - lt * 0.55);

        ctx.strokeStyle = lt < 0.45 ? 'rgba(25,90,8,.65)' : 'rgba(40,130,12,.60)';
        ctx.lineWidth   = lt < 0.5 ? 2.0 : 1.5;

        [1, -1].forEach(function (side) {
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.quadraticCurveTo(
            q.x + lnx * side * ll * 0.55,
            q.y + lny * side * ll * 0.55 + ll * 0.18,
            q.x + lnx * side * ll,
            q.y + lny * side * ll + ll * 0.35
          );
          ctx.stroke();
        });
      }
    });
  }

  // ─── Animation loop ──────────────────────────────────────────────────────────

  var firstFrame = true;
  var t0 = performance.now();

  function draw() {
    var elapsed = (performance.now() - t0) / 1000;

    gl.uniform1f(uT, elapsed);
    gl.uniform2f(uR, bg.width, bg.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    drawPalm(pc.width, pc.height, elapsed);

    if (firstFrame) {
      firstFrame = false;
      requestAnimationFrame(function () { bg.style.opacity = 1; });
    }

    requestAnimationFrame(draw);
  }

  draw();
})();
