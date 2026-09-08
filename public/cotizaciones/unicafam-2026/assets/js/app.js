// Interacción mínima
(function(){
  window.descargarPDF = function(){ window.print(); };

  var links = Array.prototype.slice.call(document.querySelectorAll('.bar nav a'));
  var secs = links.map(function(a){ return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if(secs.length){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){
        links.forEach(function(l){ l.classList.remove('active'); });
        var a = links.find(function(l){ return l.getAttribute('href')==='#'+e.target.id; });
        if(a) a.classList.add('active');
      }});
    }, {rootMargin:'-45% 0px -50% 0px'});
    secs.forEach(function(s){ io.observe(s); });
  }
})();
