/*----------- HOME BACKGROUND -----------*/
/*
 * Delivery routes on a city grid: random stops are assigned to the nearest
 * depot, each depot gets a tour (nearest neighbour + 2-opt), the tours are
 * drawn and then driven by a vehicle. Every few seconds a new set of stops
 * is optimized. The loop pauses while a lightbox is open or the tab is hidden,
 * and only a still frame is drawn when the visitor prefers reduced motion.
 */
(function() {
  'use strict';

  var canvas = document.querySelector('.hero-canvas');
  if (!canvas || !canvas.getContext) {
    return;
  }
  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ROUTE_COLORS = ['220, 53, 69', '220, 53, 69', '150, 150, 150'];
  var DRAW_TIME = 2600; // ms to draw one tour
  var DRIVE_TIME = 9000; // ms for one lap of a vehicle
  var CYCLE_TIME = 15000; // ms before a new set of stops is optimized
  var FADE_TIME = 900;

  var width, height, dpr, streets, routes, stops, cycleStart, frame, last;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function dist(a, b) {
    return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
  }

  /* Slightly irregular street grid, drawn once into an offscreen canvas */
  function drawStreets() {
    streets = document.createElement('canvas');
    streets.width = canvas.width;
    streets.height = canvas.height;
    var g = streets.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var step = Math.max(54, Math.min(width, height) / 10);
    var x, y, o;
    for (x = -step / 2; x < width + step; x += step) {
      o = x + rand(-10, 10);
      g.lineWidth = Math.random() < 0.18 ? 4 : 1.2;
      g.strokeStyle = 'rgba(255, 255, 255, ' + (g.lineWidth > 2 ? 0.05 : 0.04) + ')';
      g.beginPath();
      g.moveTo(o, -20);
      g.bezierCurveTo(o + rand(-28, 28), height * 0.33, o + rand(-28, 28), height * 0.66, o + rand(-16, 16), height + 20);
      g.stroke();
    }
    for (y = -step / 2; y < height + step; y += step) {
      o = y + rand(-10, 10);
      g.lineWidth = Math.random() < 0.18 ? 4 : 1.2;
      g.strokeStyle = 'rgba(255, 255, 255, ' + (g.lineWidth > 2 ? 0.05 : 0.04) + ')';
      g.beginPath();
      g.moveTo(-20, o);
      g.bezierCurveTo(width * 0.33, o + rand(-28, 28), width * 0.66, o + rand(-28, 28), width + 20, o + rand(-16, 16));
      g.stroke();
    }
  }

  /* Nearest neighbour tour from the depot, then 2-opt until no crossing improves it */
  function solveTour(depot, points) {
    var tour = [depot];
    var left = points.slice();
    var current = depot;
    while (left.length) {
      var best = 0;
      for (var i = 1; i < left.length; i++) {
        if (dist(current, left[i]) < dist(current, left[best])) {
          best = i;
        }
      }
      current = left.splice(best, 1)[0];
      tour.push(current);
    }
    tour.push(depot);
    var improved = true;
    while (improved) {
      improved = false;
      for (var a = 1; a < tour.length - 2; a++) {
        for (var b = a + 1; b < tour.length - 1; b++) {
          var before = dist(tour[a - 1], tour[a]) + dist(tour[b], tour[b + 1]);
          var after = dist(tour[a - 1], tour[b]) + dist(tour[a], tour[b + 1]);
          if (after < before - 0.01) {
            tour = tour.slice(0, a).concat(tour.slice(a, b + 1).reverse(), tour.slice(b + 1));
            improved = true;
          }
        }
      }
    }
    return tour;
  }

  /* New random stops and depots, solved into one tour per depot */
  function plan() {
    var area = width * height;
    var count = Math.max(14, Math.min(42, Math.round(area / 24000)));
    var depotCount = width < 700 ? 2 : 3;
    var depots = [];
    var i;
    for (i = 0; i < depotCount; i++) {
      depots.push({
        x: width * (i + 0.5) / depotCount + rand(-width * 0.08, width * 0.08),
        y: height * rand(0.3, 0.7)
      });
    }
    stops = [];
    for (i = 0; i < count; i++) {
      stops.push({ x: rand(0.04, 0.96) * width, y: rand(0.08, 0.92) * height, lit: 0 });
    }
    var groups = depots.map(function() {
      return [];
    });
    stops.forEach(function(stop) {
      var nearest = 0;
      for (var d = 1; d < depots.length; d++) {
        if (dist(stop, depots[d]) < dist(stop, depots[nearest])) {
          nearest = d;
        }
      }
      groups[nearest].push(stop);
    });
    routes = depots.map(function(depot, d) {
      var path = solveTour(depot, groups[d]);
      var lengths = [0];
      for (var k = 1; k < path.length; k++) {
        lengths.push(lengths[k - 1] + dist(path[k - 1], path[k]));
      }
      return {
        depot: depot,
        path: path,
        lengths: lengths,
        total: lengths[lengths.length - 1] || 1,
        color: ROUTE_COLORS[d % ROUTE_COLORS.length],
        delay: d * 450
      };
    });
    cycleStart = performance.now();
  }

  /* Point at a distance along a route, and the index of the leg it is on */
  function pointAt(route, distance) {
    var k = 1;
    while (k < route.lengths.length - 1 && route.lengths[k] < distance) {
      k++;
    }
    var a = route.path[k - 1];
    var b = route.path[k];
    var leg = route.lengths[k] - route.lengths[k - 1] || 1;
    var t = Math.max(0, Math.min(1, (distance - route.lengths[k - 1]) / leg));
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, leg: k };
  }

  function strokePath(route, upTo, style, lineWidth) {
    var end = pointAt(route, upTo);
    ctx.strokeStyle = style;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(route.path[0].x, route.path[0].y);
    for (var k = 1; k < end.leg; k++) {
      ctx.lineTo(route.path[k].x, route.path[k].y);
    }
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  function draw(now) {
    var elapsed = now - cycleStart;
    var fade = Math.min(1, elapsed / FADE_TIME, (CYCLE_TIME - elapsed) / FADE_TIME);
    if (reduceMotion) {
      elapsed = DRAW_TIME + 1000;
      fade = 1;
    }
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(streets, 0, 0, width, height);
    ctx.globalAlpha = Math.max(0, fade);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    routes.forEach(function(route) {
      var progress = Math.max(0, Math.min(1, (elapsed - route.delay) / DRAW_TIME));
      if (progress > 0) {
        strokePath(route, route.total * progress, 'rgba(' + route.color + ', 0.38)', 2.5);
      }
      if (progress === 1 && !reduceMotion) {
        // vehicle with a short fading trail
        var lap = ((elapsed - route.delay - DRAW_TIME) / DRIVE_TIME) % 1;
        var at = route.total * lap;
        for (var s = 0; s < 14; s++) {
          var p = pointAt(route, Math.max(0, at - s * 7));
          ctx.fillStyle = 'rgba(' + route.color + ', ' + (0.5 * (1 - s / 14)) + ')';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.2 - s * 0.15, 0, Math.PI * 2);
          ctx.fill();
        }
        var vehicle = pointAt(route, at);
        route.path.forEach(function(stop) {
          if (stop !== route.depot && dist(stop, vehicle) < 9) {
            stop.lit = 1;
          }
        });
      }
    });

    stops.forEach(function(stop) {
      if (stop.lit > 0.02) {
        ctx.fillStyle = 'rgba(220, 53, 69, ' + (0.18 * stop.lit) + ')';
        ctx.beginPath();
        ctx.arc(stop.x, stop.y, 12, 0, Math.PI * 2);
        ctx.fill();
        stop.lit *= 0.965;
      }
      ctx.fillStyle = '#111';
      ctx.strokeStyle = stop.lit > 0.3 ? 'rgba(220, 53, 69, 0.8)' : 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(stop.x, stop.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    routes.forEach(function(route) {
      ctx.fillStyle = 'rgba(220, 53, 69, 0.85)';
      ctx.fillRect(route.depot.x - 7, route.depot.y - 7, 14, 14);
      ctx.fillStyle = '#111';
      ctx.fillRect(route.depot.x - 2.5, route.depot.y - 2.5, 5, 5);
    });
    ctx.globalAlpha = 1;

    if (!reduceMotion && elapsed >= CYCLE_TIME) {
      plan();
    }
  }

  /* Pause while a section lightbox covers the home screen or the tab is hidden */
  function covered() {
    if (document.hidden) {
      return true;
    }
    var wrappers = document.querySelectorAll('.lightbox-wrapper');
    for (var i = 0; i < wrappers.length; i++) {
      if (wrappers[i].classList.contains(wrappers[i].id + '-on')) {
        return true;
      }
    }
    return false;
  }

  function loop(now) {
    if (!covered()) {
      draw(now);
    } else if (last) {
      // freeze the cycle while hidden, so the animation continues where it stopped
      cycleStart += now - last;
    }
    last = now;
    frame = requestAnimationFrame(loop);
  }

  function setup() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) {
      return;
    }
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStreets();
    plan();
    if (reduceMotion) {
      draw(performance.now());
    } else if (!frame) {
      frame = requestAnimationFrame(loop);
    }
  }

  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      // ignore the small height changes of mobile address bars
      if (canvas.clientWidth !== width || Math.abs(canvas.clientHeight - height) > 120) {
        setup();
      }
    }, 200);
  });
  setup();
}());
