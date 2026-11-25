// Lightbox nativo para las galerías de portfolio-page.html (Espectáculos,
// Fotografía, Diseño Gráfico). Un solo componente compartido: se arma la
// lista de imágenes de la galería visible a partir de los enlaces
// ".lightbox-trigger" que comparten el mismo ".row" que el enlace clickeado.
(function () {

	var lightbox = document.getElementById('lightbox');
	if (!lightbox) return;

	var lightboxImg = lightbox.querySelector('.lightbox-content img');
	var lightboxCaption = lightbox.querySelector('.lightbox-caption');
	var closeButton = lightbox.querySelector('.lightbox-close');
	var prevButton = lightbox.querySelector('.lightbox-prev');
	var nextButton = lightbox.querySelector('.lightbox-next');

	var currentGallery = [];
	var currentIndex = 0;

	function galleryFor(trigger) {
		var row = trigger.closest('.row');
		var scope = row || document;
		return Array.prototype.slice.call(scope.querySelectorAll('a.lightbox-trigger'));
	}

	function captionFor(trigger) {
		var heading = trigger.closest('.item').querySelector('header h3');
		return heading ? heading.textContent.trim() : '';
	}

	function show(index) {
		currentIndex = (index + currentGallery.length) % currentGallery.length;
		var trigger = currentGallery[currentIndex];
		lightboxImg.src = trigger.getAttribute('href');
		lightboxImg.alt = captionFor(trigger);
		lightboxCaption.textContent = captionFor(trigger);
	}

	function open(trigger) {
		currentGallery = galleryFor(trigger);
		currentIndex = currentGallery.indexOf(trigger);
		show(currentIndex);
		lightbox.classList.add('is-open');
		lightbox.setAttribute('aria-hidden', 'false');
	}

	function close() {
		lightbox.classList.remove('is-open');
		lightbox.setAttribute('aria-hidden', 'true');
		lightboxImg.src = '';
	}

	document.addEventListener('click', function (event) {
		var trigger = event.target.closest('a.lightbox-trigger');
		if (trigger) {
			event.preventDefault();
			open(trigger);
			return;
		}

		if (event.target === lightbox || event.target.closest('.lightbox-close')) {
			close();
		}
	});

	prevButton.addEventListener('click', function () { show(currentIndex - 1); });
	nextButton.addEventListener('click', function () { show(currentIndex + 1); });

	document.addEventListener('keydown', function (event) {
		if (!lightbox.classList.contains('is-open')) return;

		if (event.key === 'Escape') close();
		if (event.key === 'ArrowLeft') show(currentIndex - 1);
		if (event.key === 'ArrowRight') show(currentIndex + 1);
	});

})();

// Cabecera: transparente sobre el hero y sólida al hacer scroll.
(function () {
	function update() {
		document.body.classList.toggle('scrolled', window.scrollY > 40);
	}
	window.addEventListener('scroll', update, { passive: true });
	update();
})();

// Faders de la sección "Sobre mí": suben desde -∞ hasta su nivel al entrar en pantalla.
(function(){
  if (!document.getElementById('faders')) return; // solo existe en index.html
  // Curva dB -> % de recorrido (no lineal, como un fader real). -∞ = 0 %.
  // Marcas como en el fader de una Yamaha QL/CL: 10 5 0 5 10 20 30 40 50 60 ∞
  var MAP=[[-60,6],[-50,13],[-40,21],[-30,31],[-20,44],[-10,59],[-5,69],[0,78],[5,89],[10,100]];
  function dbToPct(db){
    if(db===-Infinity) return 0;
    if(db<=MAP[0][0]) return MAP[0][1];
    for(var i=1;i<MAP.length;i++){
      if(db<=MAP[i][0]){var a=MAP[i-1],b=MAP[i];return a[1]+(b[1]-a[1])*(db-a[0])/(b[0]-a[0]);}
    }
    return 100;
  }
  function pctToDb(p){
    if(p<=2.5) return -Infinity;
    if(p<=MAP[0][1]) return -60;
    for(var i=1;i<MAP.length;i++){
      if(p<=MAP[i][1]){var a=MAP[i-1],b=MAP[i];return a[0]+(b[0]-a[0])*(p-a[1])/(b[1]-a[1]);}
    }
    return 10;
  }
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SEGS=24, TICKS=[10,5,0,-5,-10,-20,-30,-40,-50,-60,-Infinity];
  var tickLabel=function(t){return t===-Infinity?'∞':String(Math.abs(t));};
  var easeOutBack=function(t){var c=1.4;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};

  var chans=[].map.call(document.querySelectorAll('.ch'),function(el){
    var strip=document.createElement('div');strip.className='strip';strip.setAttribute('aria-hidden','true');
    var scale='<div class="scale">'+TICKS.map(function(t){
      return '<span'+(t===0?' class="z"':'')+' style="bottom:'+dbToPct(t)+'%">'+tickLabel(t)+'</span>';}).join('')+'</div>';
    var segs='';for(var i=0;i<SEGS;i++){segs+='<i class="'+(i>=SEGS-3?'r':i>=SEGS-7?'y':'')+'"></i>';}
    strip.innerHTML=scale+'<div class="track"><div class="cap"></div></div><div class="meter">'+segs+'</div>';
    var read=document.createElement('span');read.className='read';read.setAttribute('aria-hidden','true');
    el.appendChild(strip);el.appendChild(read);
    var db=parseFloat(el.dataset.db);
    el.setAttribute('aria-label',el.dataset.name+': nivel '+(db>0?'+':'')+db+' dB');
    return {el:el,cap:strip.querySelector('.cap'),segs:strip.querySelectorAll('.meter i'),read:read,target:dbToPct(db),db:db,p:0};
  });

  function draw(c,p,live){
    c.cap.style.bottom=p+'%';
    var db=pctToDb(p);
    c.read.textContent=(db===-Infinity)?'-∞ dB':((db>0?'+':'')+db.toFixed(1)+' dB');
    var lit=Math.round(p/100*SEGS);
    if(live) lit=Math.max(0,lit+Math.round((Math.random()-.5)*3));
    for(var i=0;i<SEGS;i++) c.segs[i].classList.toggle('on',i<lit);
  }

  chans.forEach(function(c){draw(c,reduce?c.target:0,false);});

  var played=false,idle=null;
  function play(){
    if(played)return;played=true;
    if(reduce)return;
    var T=1800,t0=performance.now();
    (function frame(now){
      var done=true;
      chans.forEach(function(c,i){
        var t=Math.min(1,Math.max(0,(now-t0-i*130)/T));
        if(t<1)done=false;
        c.p=c.target*easeOutBack(t);
        draw(c,Math.max(0,c.p),false);
      });
      if(!done)requestAnimationFrame(frame);
      else idle=setInterval(function(){chans.forEach(function(c){draw(c,c.target,true);});},140);
    })(t0);
  }
  new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)play();});},{threshold:.4})
    .observe(document.getElementById("faders"));
})();
