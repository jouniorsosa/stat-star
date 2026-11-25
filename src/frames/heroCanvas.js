// Themed hero backgrounds drawn on a canvas. startHero(canvas, getTheme) returns a stop function.
export function startHero(c, getTheme) {
var self = {};
if (!c || !c.getContext) return function () {};
var ctx = c.getContext('2d');
var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var w = 0, h = 0, t = 0, mouse = null, ease = { x: 0, y: 0 }, look = { x: 0, y: 0 }, cur = '', S = {};
var TAU = Math.PI * 2;
function rnd(a, b) { return a + Math.random() * (b - a); }
function size() {
var r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1;
w = r.width; h = r.height; c.width = w * d; c.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
cur = '';
}
function aim() { return mouse || { x: w / 2 + Math.sin(t * 0.7) * w * 0.25, y: h * 0.45 + Math.cos(t * 0.5) * h * 0.15 }; }
function gaze(cx, cy, reachPx) {
var m = mouse, tx = 0, ty = 0;
if (m) { var gx = m.x - cx, gy = m.y - cy, gd = Math.sqrt(gx * gx + gy * gy) || 1, r = Math.min(1, gd / reachPx); tx = gx / gd * r; ty = gy / gd * r; }
else if (!still) { tx = Math.sin(t * 0.9) * 0.6; ty = Math.cos(t * 0.6) * 0.3; }
look.x += (tx - look.x) * 0.12; look.y += (ty - look.y) * 0.12;
}

/* ---------- SAMURAI: falling petals, mask whose eyes track the pointer ---------- */
function initSamurai() { S.p = []; for (var i = 0; i < 70; i++) S.p.push({ x: rnd(0, w), y: rnd(-h, h), s: rnd(3, 7), v: rnd(0.4, 1.2), a: rnd(0, TAU), sp: rnd(-0.03, 0.03) }); }
function samurai() {
ctx.fillStyle = '#0A0A0B'; ctx.fillRect(0, 0, w, h);
// big red sun
ctx.fillStyle = 'rgba(255,75,51,0.10)'; ctx.beginPath(); ctx.arc(w / 2, h * 0.36, Math.min(w, h) * 0.42, 0, TAU); ctx.fill();
var m = aim();
S.p.forEach(function (p) {
if (!still) { p.y += p.v; p.x += Math.sin(t * 2 + p.a) * 0.6; p.a += p.sp; if (p.y > h + 10) { p.y = -10; p.x = rnd(0, w); } }
var dx = p.x - m.x, dy = p.y - m.y, d = Math.sqrt(dx * dx + dy * dy);
if (mouse && d < 90) { p.x += dx / d * 2.5; p.y += dy / d * 2.5; }
ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = 'rgba(255,140,150,0.75)';
ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, TAU); ctx.fill(); ctx.restore();
});
var k = Math.max(0.5, Math.min(0.78, w / 1100)), cx = w / 2, cy = 40 + 250 * k;
gaze(cx, cy, 260); mask(cx, cy + (still ? 0 : Math.sin(t * 1.4) * 4), k);
}
function mask(cx, cy, k) {
var ink = 'rgba(244,241,234,0.92)', red = '#FF4B33';
ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
ctx.fillStyle = '#0A0A0B';
ctx.beginPath(); ctx.moveTo(-150, -20); ctx.quadraticCurveTo(-140, -150, 0, -160); ctx.quadraticCurveTo(140, -150, 150, -20);
ctx.lineTo(205, 70); ctx.lineTo(120, 60); ctx.lineTo(84, 96); ctx.lineTo(0, 150); ctx.lineTo(-84, 96); ctx.lineTo(-120, 60); ctx.lineTo(-205, 70); ctx.closePath(); ctx.fill();
ctx.strokeStyle = red; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,75,51,0.16)';
ctx.beginPath(); ctx.moveTo(-150, -250); ctx.quadraticCurveTo(-120, -120, 0, -118); ctx.quadraticCurveTo(120, -120, 150, -250);
ctx.quadraticCurveTo(95, -160, 0, -158); ctx.quadraticCurveTo(-95, -160, -150, -250); ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
ctx.beginPath(); ctx.moveTo(-150, -20); ctx.quadraticCurveTo(-140, -150, 0, -160); ctx.quadraticCurveTo(140, -150, 150, -20); ctx.stroke();
ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(244,241,234,0.35)';
for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 22, -158); ctx.quadraticCurveTo(i * 48, -110, i * 56, -24); ctx.stroke(); }
ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
ctx.beginPath(); ctx.moveTo(-168, -14); ctx.quadraticCurveTo(0, -44, 168, -14); ctx.quadraticCurveTo(0, -8, -168, -14); ctx.closePath(); ctx.stroke();
ctx.lineWidth = 1.5;
for (var s = -1; s <= 1; s += 2) for (var p = 0; p < 3; p++) { ctx.beginPath(); ctx.moveTo(s * (150 + p * 4), -8 + p * 26); ctx.lineTo(s * (188 + p * 9), 14 + p * 28); ctx.lineTo(s * (122 + p * 2), 30 + p * 22); ctx.stroke(); }
ctx.lineWidth = 2.5;
ctx.beginPath(); ctx.moveTo(-112, -6); ctx.lineTo(112, -6); ctx.lineTo(98, 62); ctx.lineTo(84, 96); ctx.lineTo(0, 150); ctx.lineTo(-84, 96); ctx.lineTo(-98, 62); ctx.closePath(); ctx.stroke();
ctx.lineWidth = 1.5;
ctx.beginPath(); ctx.moveTo(0, 22); ctx.lineTo(-13, 66); ctx.lineTo(13, 66); ctx.closePath(); ctx.stroke();
ctx.beginPath(); ctx.moveTo(-50, 92); ctx.quadraticCurveTo(0, 76, 50, 92); ctx.stroke();
for (var m = -2; m <= 2; m++) { ctx.beginPath(); ctx.moveTo(m * 16, 86 + Math.abs(m) * 2); ctx.lineTo(m * 16, 104 - Math.abs(m) * 5); ctx.stroke(); }
for (var e = -1; e <= 1; e += 2) {
ctx.fillStyle = '#000'; ctx.strokeStyle = ink; ctx.lineWidth = 2;
ctx.beginPath(); ctx.moveTo(e * 92, 6); ctx.lineTo(e * 22, 24); ctx.lineTo(e * 26, 44); ctx.lineTo(e * 84, 36); ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.save(); ctx.clip(); glowEye(e * 55 + look.x * 20, 28 + look.y * 7, 9, red); ctx.restore();
}
ctx.restore();
}
function glowEye(x, y, r, col) {
ctx.shadowColor = col; ctx.shadowBlur = 22; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
ctx.shadowBlur = 0; ctx.fillStyle = '#FFF2EE'; ctx.beginPath(); ctx.arc(x + look.x * 2, y + look.y, r / 3, 0, TAU); ctx.fill();
}

/* ---------- HERO (comic): halftone that swells near the pointer, speed lines, masked face ---------- */
function hero() {
ctx.fillStyle = '#F5C518'; ctx.fillRect(0, 0, w, h);
var m = aim(), cx = w / 2, cy = h * 0.32;
// speed lines burst from behind the face
ctx.save(); ctx.translate(cx, cy);
for (var i = 0; i < 48; i++) {
var a = i / 48 * TAU + (still ? 0 : t * 0.05);
ctx.fillStyle = i % 2 ? '#E8302A' : '#F5C518';
ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 2000, Math.sin(a) * 2000); ctx.lineTo(Math.cos(a + TAU / 48) * 2000, Math.sin(a + TAU / 48) * 2000); ctx.closePath(); ctx.fill();
}
ctx.restore();
// halftone dots
var g = 22;
ctx.fillStyle = 'rgba(20,20,40,0.28)';
for (var y = g / 2; y < h; y += g) for (var x = (y / g % 2) * g / 2; x < w; x += g) {
var dx = x - m.x, dy = y - m.y, d = Math.sqrt(dx * dx + dy * dy);
var r = 1.5 + Math.max(0, 1 - d / 240) * 7;
ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
var k = Math.max(0.55, Math.min(0.85, w / 1100));
gaze(cx, cy, 260);
ctx.save(); ctx.translate(cx, cy + (still ? 0 : Math.sin(t * 1.6) * 5)); ctx.scale(k, k); ctx.lineJoin = 'round';
// head
ctx.fillStyle = '#1B3FA0'; ctx.strokeStyle = '#111'; ctx.lineWidth = 8;
ctx.beginPath(); ctx.ellipse(0, 10, 150, 175, 0, 0, TAU); ctx.fill(); ctx.stroke();
// emblem stripe
ctx.fillStyle = '#E8302A'; ctx.beginPath(); ctx.moveTo(-28, -165); ctx.lineTo(28, -165); ctx.lineTo(10, -60); ctx.lineTo(-10, -60); ctx.closePath(); ctx.fill(); ctx.stroke();
// mask band
ctx.fillStyle = '#111';
ctx.beginPath(); ctx.moveTo(-150, -10); ctx.quadraticCurveTo(0, -55, 150, -10); ctx.lineTo(140, 50); ctx.quadraticCurveTo(0, 20, -140, 50); ctx.closePath(); ctx.fill();
// eyes
for (var e = -1; e <= 1; e += 2) {
ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#111'; ctx.lineWidth = 5;
ctx.beginPath(); ctx.moveTo(e * 118, -8); ctx.quadraticCurveTo(e * 70, -30, e * 22, 6); ctx.quadraticCurveTo(e * 70, 40, e * 118, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.save(); ctx.clip();
ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(e * 68 + look.x * 26, 6 + look.y * 10, 12, 0, TAU); ctx.fill();
ctx.restore();
}
// jaw line
ctx.strokeStyle = '#111'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-40, 120); ctx.quadraticCurveTo(0, 135, 40, 120); ctx.stroke();
ctx.restore();
// "POW" burst that follows the pointer
if (mouse) {
ctx.save(); ctx.translate(ease.x, ease.y); ctx.rotate(-0.15);
ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.beginPath();
for (var s = 0; s < 22; s++) { var rr = s % 2 ? 26 : 46, aa = s / 22 * TAU; ctx[s ? 'lineTo' : 'moveTo'](Math.cos(aa) * rr * 1.3, Math.sin(aa) * rr); }
ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.fillStyle = '#E8302A'; ctx.font = '900 24px "Bricolage Grotesque", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('POW!', 0, 1);
ctx.restore();
}
}

/* ---------- SPACE: parallax stars, ringed planet, a ship that chases the pointer ---------- */
function initSpace() { S.st = []; for (var i = 0; i < 260; i++) S.st.push({ x: rnd(0, w), y: rnd(0, h), z: rnd(0.2, 1), tw: rnd(0, TAU) }); S.trail = []; S.ship = { x: w / 2, y: h / 2, a: 0 }; }
function space() {
var bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#05061A'); bg.addColorStop(1, '#130A2A');
ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
var m = aim(), px = (m.x - w / 2) / w, py = (m.y - h / 2) / h;
S.st.forEach(function (s) {
var x = (s.x - px * 60 * s.z + w) % w, y = (s.y - py * 40 * s.z + h) % h;
ctx.fillStyle = 'rgba(220,230,255,' + (0.35 + 0.65 * s.z * (0.6 + 0.4 * Math.sin(t * 3 + s.tw))) + ')';
ctx.fillRect(x, y, s.z * 2.2, s.z * 2.2);
});
// planet
var R = Math.min(w, h) * 0.22, cx = w * 0.78 - px * 25, cy = h * 0.3 - py * 18;
var pg = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.1, cx, cy, R);
pg.addColorStop(0, '#7B8CFF'); pg.addColorStop(0.6, '#3B2E8C'); pg.addColorStop(1, '#120B33');
ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.35);
ctx.strokeStyle = 'rgba(180,170,255,0.55)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, R * 1.7, R * 0.38, 0, Math.PI, TAU); ctx.stroke();
ctx.restore();
ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.35);
ctx.strokeStyle = 'rgba(200,190,255,0.75)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, R * 1.7, R * 0.38, 0, 0, Math.PI); ctx.stroke();
ctx.restore();
// ship chases the pointer
var sh = S.ship, dx = m.x - sh.x, dy = m.y - sh.y;
sh.x += dx * 0.06; sh.y += dy * 0.06;
var want = Math.atan2(dy, dx), diff = ((want - sh.a + Math.PI * 3) % TAU) - Math.PI; sh.a += diff * 0.15;
S.trail.push({ x: sh.x - Math.cos(sh.a) * 18, y: sh.y - Math.sin(sh.a) * 18 }); if (S.trail.length > 40) S.trail.shift();
S.trail.forEach(function (p, i) { var f = i / S.trail.length; ctx.fillStyle = 'rgba(120,220,255,' + f * 0.6 + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 1 + f * 5, 0, TAU); ctx.fill(); });
ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.a); ctx.scale(1.7, 1.7);
ctx.fillStyle = '#EDEFFF'; ctx.strokeStyle = '#7FE3FF'; ctx.lineWidth = 2;
ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-14, -13); ctx.lineTo(-8, 0); ctx.lineTo(-14, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
ctx.fillStyle = '#7FE3FF'; ctx.beginPath(); ctx.arc(6, 0, 4, 0, TAU); ctx.fill();
ctx.restore();
}

/* ---------- TECH: dot grid that lights up near the pointer, a camera iris that tracks it ---------- */
function tech() {
ctx.fillStyle = '#04110D'; ctx.fillRect(0, 0, w, h);
var m = aim(), g = 28;
for (var y = g / 2; y < h; y += g) for (var x = g / 2; x < w; x += g) {
var dx = x - m.x, dy = y - m.y, d = Math.sqrt(dx * dx + dy * dy), f = Math.max(0, 1 - d / 220);
ctx.fillStyle = 'rgba(57,255,170,' + (0.12 + f * 0.8) + ')';
ctx.fillRect(x - 1 - f * 1.5, y - 1 - f * 1.5, 2 + f * 3, 2 + f * 3);
}
// circuit traces
ctx.strokeStyle = 'rgba(57,255,170,0.18)'; ctx.lineWidth = 1.5;
for (var i = 0; i < 6; i++) { var yy = h * (0.15 + i * 0.14); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w * 0.2, yy); ctx.lineTo(w * 0.24, yy + 30); ctx.lineTo(w * 0.3, yy + 30); ctx.stroke(); ctx.beginPath(); ctx.moveTo(w, yy + 14); ctx.lineTo(w * 0.8, yy + 14); ctx.lineTo(w * 0.76, yy - 16); ctx.lineTo(w * 0.7, yy - 16); ctx.stroke(); }
// iris
var k = Math.max(0.55, Math.min(0.9, w / 1100)), cx = w / 2, cy = h * 0.3, R = 120 * k;
gaze(cx, cy, 300);
ctx.save(); ctx.translate(cx, cy);
ctx.strokeStyle = 'rgba(57,255,170,0.9)'; ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(0, 0, R * 1.35, 0, TAU); ctx.stroke();
ctx.setLineDash([4, 10]); ctx.beginPath(); ctx.arc(0, 0, R * 1.6, (still ? 0 : t), (still ? 0 : t) + TAU * 0.7); ctx.stroke(); ctx.setLineDash([]);
for (var tk = 0; tk < 36; tk++) { var a = tk / 36 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 1.4, Math.sin(a) * R * 1.4); ctx.lineTo(Math.cos(a) * R * (tk % 3 ? 1.46 : 1.54), Math.sin(a) * R * (tk % 3 ? 1.46 : 1.54)); ctx.stroke(); }
ctx.fillStyle = '#020806'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill(); ctx.stroke();
var ex = look.x * R * 0.45, ey = look.y * R * 0.45;
for (var b = 0; b < 8; b++) { var ba = b / 8 * TAU + (still ? 0 : t * 0.3); ctx.strokeStyle = 'rgba(57,255,170,0.35)'; ctx.beginPath(); ctx.moveTo(ex + Math.cos(ba) * R * 0.25, ey + Math.sin(ba) * R * 0.25); ctx.lineTo(Math.cos(ba + 0.5) * R * 0.95, Math.sin(ba + 0.5) * R * 0.95); ctx.stroke(); }
ctx.shadowColor = '#39FFAA'; ctx.shadowBlur = 30; ctx.fillStyle = '#39FFAA'; ctx.beginPath(); ctx.arc(ex, ey, R * 0.22, 0, TAU); ctx.fill();
ctx.shadowBlur = 0; ctx.fillStyle = '#04110D'; ctx.beginPath(); ctx.arc(ex, ey, R * 0.1, 0, TAU); ctx.fill();
ctx.restore();
// targeting reticle on the pointer
if (mouse) {
ctx.strokeStyle = '#39FFAA'; ctx.lineWidth = 1.5; var q = 14;
ctx.beginPath(); ctx.arc(ease.x, ease.y, 18, 0, TAU); ctx.stroke();
ctx.beginPath(); ctx.moveTo(ease.x - 30, ease.y); ctx.lineTo(ease.x - q, ease.y); ctx.moveTo(ease.x + q, ease.y); ctx.lineTo(ease.x + 30, ease.y); ctx.moveTo(ease.x, ease.y - 30); ctx.lineTo(ease.x, ease.y - q); ctx.moveTo(ease.x, ease.y + q); ctx.lineTo(ease.x, ease.y + 30); ctx.stroke();
ctx.fillStyle = 'rgba(57,255,170,0.9)'; ctx.font = '600 11px Inter, monospace'; ctx.fillText(Math.round(m.x) + ', ' + Math.round(m.y), ease.x + 24, ease.y - 22);
}
}

/* ---------- SPORTS: court lines, a ball that dribbles after the pointer ---------- */
function initSports() { S.b = { x: w / 2, y: h * 0.4, vy: 0, z: 0, spin: 0 }; }
function sports() {
ctx.fillStyle = '#1B0F08'; ctx.fillRect(0, 0, w, h);
// hardwood planks
for (var x = 0; x < w; x += 46) { ctx.fillStyle = (x / 46) % 2 ? 'rgba(201,124,61,0.10)' : 'rgba(201,124,61,0.05)'; ctx.fillRect(x, 0, 46, h); }
ctx.strokeStyle = 'rgba(255,240,220,0.35)'; ctx.lineWidth = 3;
ctx.beginPath(); ctx.arc(w / 2, h * 0.5, Math.min(w, h) * 0.22, 0, TAU); ctx.stroke();
ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
ctx.beginPath(); ctx.arc(0, h / 2, h * 0.55, -Math.PI / 2, Math.PI / 2); ctx.stroke();
ctx.beginPath(); ctx.arc(w, h / 2, h * 0.55, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
var m = aim(), b = S.b;
b.x += (m.x - b.x) * 0.08; var gy = m.y;
// dribble: bounce height under the pointer
if (!still) { b.vy += 0.9; b.z -= b.vy; if (b.z < 0) { b.z = 0; b.vy = -15; } }
b.y += (gy - b.y) * 0.08; b.spin += (m.x - b.x) * 0.002;
var r = 34, by = b.y - b.z * 1.0 - r;
// shadow
var sf = 1 - Math.min(1, b.z / 140);
ctx.fillStyle = 'rgba(0,0,0,' + (0.25 + 0.35 * sf) + ')'; ctx.beginPath(); ctx.ellipse(b.x, b.y, r * (0.6 + 0.5 * sf), r * 0.22, 0, 0, TAU); ctx.fill();
// ball
ctx.save(); ctx.translate(b.x, by); ctx.rotate(b.spin);
var bg = ctx.createRadialGradient(-10, -12, 4, 0, 0, r); bg.addColorStop(0, '#FF9A4A'); bg.addColorStop(1, '#C4501A');
ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
ctx.strokeStyle = '#2A1408'; ctx.lineWidth = 2.5;
ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
ctx.beginPath(); ctx.arc(-r * 1.25, 0, r * 0.9, -0.85, 0.85); ctx.stroke();
ctx.beginPath(); ctx.arc(r * 1.25, 0, r * 0.9, Math.PI - 0.85, Math.PI + 0.85); ctx.stroke();
ctx.restore();
}

/* ---------- ABSTRACT: a flow field of ribbons that bends around the pointer ---------- */
function initAbstract() { S.q = []; for (var i = 0; i < 900; i++) S.q.push({ x: rnd(0, w), y: rnd(0, h), life: rnd(0, 200), hue: rnd(0, 1) }); ctx.fillStyle = '#0B0714'; ctx.fillRect(0, 0, w, h); }
function abstract() {
ctx.fillStyle = 'rgba(11,7,20,0.035)'; ctx.fillRect(0, 0, w, h);
var m = aim();
S.q.forEach(function (p) {
var a = Math.sin(p.x * 0.004 + t * 0.6) * 2 + Math.cos(p.y * 0.005 - t * 0.4) * 2;
var dx = p.x - m.x, dy = p.y - m.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
var vx = Math.cos(a) * 1.6, vy = Math.sin(a) * 1.6;
if (d < 220) { var f = (1 - d / 220) * 3.2; vx += -dy / d * f; vy += dx / d * f; }
var ox = p.x, oy = p.y; p.x += vx; p.y += vy; p.life -= 1;
var col = p.hue < 0.5 ? 'rgba(255,79,163,' : 'rgba(84,140,255,';
if (p.hue > 0.85) col = 'rgba(255,200,87,';
ctx.strokeStyle = col + '0.85)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(p.x, p.y); ctx.stroke();
if (p.life < 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) { p.x = rnd(0, w); p.y = rnd(0, h); p.life = rnd(80, 220); }
});
}

var T = { samurai: [initSamurai, samurai], hero: [null, hero], space: [initSpace, space], tech: [null, tech], sports: [initSports, sports], abstract: [initAbstract, abstract] };
function frame() {
var r = c.getBoundingClientRect();
if (Math.abs(r.width - w) > 2 || Math.abs(r.height - h) > 2) size();
var name = (getTheme && getTheme()) || 'samurai'; if (!T[name]) name = 'samurai';
if (name !== cur) { cur = name; S = {}; look = { x: 0, y: 0 }; if (T[name][0]) T[name][0](); }
if (!still) t += 0.016;
var m = aim(); ease.x += (m.x - ease.x) * 0.25; ease.y += (m.y - ease.y) * 0.25;
T[name][1]();
self._raf = requestAnimationFrame(frame);
}
self._onMove = function (e) { var r = c.getBoundingClientRect(); mouse = (e.clientY >= r.top && e.clientY <= r.bottom && e.clientX >= r.left && e.clientX <= r.right) ? { x: e.clientX - r.left, y: e.clientY - r.top } : null; };
window.addEventListener('pointermove', self._onMove);
size(); frame();
return function stop() { if (self._raf) cancelAnimationFrame(self._raf); window.removeEventListener('pointermove', self._onMove); };
}
