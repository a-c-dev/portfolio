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

// Carrusel horizontal de las galerías: avanza una foto cada 2 segundos con
// transición suave, se pausa mientras el mouse está encima, y se puede
// arrastrar con el mouse o el dedo en cualquier momento.
(function () {

	var STEP_INTERVAL_MS = 3000;
	var SCROLL_DURATION_MS = 500; // duración aproximada de la transición suave

	var scrollers = document.querySelectorAll('.gallery-scroll');

	Array.prototype.forEach.call(scrollers, function (scroller) {

		var track = scroller.querySelector('.row');
		if (!track) return;

		// Duplica los ítems dentro de la MISMA fila (en vez de clonar la fila
		// entera y ponerla al lado): así el espacio entre la última foto
		// original y la primera copiada usa el mismo gutter que el resto,
		// sin el margen negativo propio de cada fila comiéndose el hueco.
		var singleSetWidth = track.scrollWidth;
		Array.prototype.slice.call(track.children).forEach(function (item) {
			track.appendChild(item.cloneNode(true));
		});

		var paused = false;
		var dragging = false;
		var dragMoved = false;
		var dragStartX = 0;
		var dragStartScroll = 0;
		var intervalId = null;
		var animIntervalId = null;
		var ANIM_STEP_MS = 16;

		// Distancia de un ítem (ancho + separación), medida sobre el DOM real
		// en vez de recalcularla a mano, para no depender de los valores del CSS.
		function stepDistance() {
			var items = track.querySelectorAll('.gallery-item');
			if (items.length < 2) return track.scrollWidth;
			return items[1].offsetLeft - items[0].offsetLeft;
		}

		// Anima scrollLeft a mano (en vez de scrollBy con behavior:'smooth')
		// para no depender del soporte/comportamiento de scroll suave del navegador.
		function advance(direction) {
			clearInterval(animIntervalId);

			var startLeft = scroller.scrollLeft;
			var delta = stepDistance() * direction;
			var startTime = Date.now();

			animIntervalId = setInterval(function () {
				var t = Math.min((Date.now() - startTime) / SCROLL_DURATION_MS, 1);
				scroller.scrollLeft = startLeft + delta * t;

				if (t >= 1) {
					clearInterval(animIntervalId);
					if (scroller.scrollLeft >= singleSetWidth) {
						scroller.scrollLeft -= singleSetWidth;
					} else if (scroller.scrollLeft < 0) {
						scroller.scrollLeft += singleSetWidth;
					}
				}
			}, ANIM_STEP_MS);
		}

		function startAutoplay() {
			intervalId = setInterval(function () {
				if (paused || dragging) return;
				advance(1);
			}, STEP_INTERVAL_MS);
		}
		startAutoplay();

		// Un click manual en las flechas reinicia la cuenta regresiva del
		// autoplay, para que no se sienta como si "saltara" un paso de más.
		function restartAutoplay() {
			clearInterval(intervalId);
			startAutoplay();
		}

		var carousel = scroller.closest('.gallery-carousel');
		var prevButton = carousel && carousel.querySelector('.gallery-prev');
		var nextButton = carousel && carousel.querySelector('.gallery-next');

		if (prevButton) prevButton.addEventListener('click', function () { advance(-1); restartAutoplay(); });
		if (nextButton) nextButton.addEventListener('click', function () { advance(1); restartAutoplay(); });

		scroller.addEventListener('mouseenter', function () { paused = true; });
		scroller.addEventListener('mouseleave', function () { paused = false; });

		scroller.addEventListener('pointerdown', function (event) {
			clearInterval(animIntervalId);
			dragging = true;
			dragMoved = false;
			dragStartX = event.clientX;
			dragStartScroll = scroller.scrollLeft;
			scroller.classList.add('is-dragging');
		});

		window.addEventListener('pointermove', function (event) {
			if (!dragging) return;
			var delta = event.clientX - dragStartX;
			if (Math.abs(delta) > 3) dragMoved = true;
			scroller.scrollLeft = dragStartScroll - delta;
		});

		window.addEventListener('pointerup', function () {
			if (!dragging) return;
			dragging = false;
			scroller.classList.remove('is-dragging');

			// Mantiene scrollLeft dentro de un solo set para que el loop siga
			// funcionando después de arrastrar.
			if (scroller.scrollLeft >= singleSetWidth) scroller.scrollLeft -= singleSetWidth;
			if (scroller.scrollLeft < 0) scroller.scrollLeft += singleSetWidth;
		});

		// Si el usuario arrastró en vez de hacer click, cancela el click para
		// que no dispare el lightbox ni el enlace por accidente.
		scroller.addEventListener('click', function (event) {
			if (dragMoved) {
				event.preventDefault();
				event.stopPropagation();
				dragMoved = false;
			}
		}, true);

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
