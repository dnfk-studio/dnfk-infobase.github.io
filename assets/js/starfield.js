// 簡易星野背景
(() => {
  const c = document.getElementById('starfield');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, stars;

  function resize() {
    W = c.width = innerWidth * devicePixelRatio;
    H = c.height = innerHeight * devicePixelRatio;
  }

  function init() {
    resize();
    const count = Math.min(300, Math.floor((innerWidth * innerHeight) / 4000));
    stars = Array.from({length: count}, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      z: Math.random() * 0.8 + 0.2,
      s: Math.random() * 1.8 + 0.2,
      vx: (Math.random() - 0.5) * 0.2
    }));
  }

  function draw() {
    ctx.clearRect(0,0,W,H);
    for (const st of stars) {
      st.x += st.vx * st.z;
      if (st.x < 0) st.x = W;
      if (st.x > W) st.x = 0;
      ctx.globalAlpha = st.z * 0.8 + 0.2;
      ctx.fillStyle = "#c3f3ff";
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.s, 0, Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  addEventListener('resize', init);
  init(); draw();
})();
