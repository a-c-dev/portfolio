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
