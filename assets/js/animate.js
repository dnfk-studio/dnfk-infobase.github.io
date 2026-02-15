export function initReveal(){
  const els = Array.from(document.querySelectorAll(".reveal"));
  if(!els.length) return;
  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){
        e.target.classList.add("show");
        io.unobserve(e.target);
      }
    }
  }, {threshold: 0.08});
  for(const el of els) io.observe(el);
}
