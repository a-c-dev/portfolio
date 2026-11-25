// Navegación y menú móvil (JavaScript nativo, sin jQuery).
(function () {

	var body = document.body;
	var header = document.getElementById('header');
	var navLinks = Array.prototype.slice.call(document.querySelectorAll('#nav a'));

	// Quita is-preload tras la carga (evita animaciones durante el primer pintado).
	window.addEventListener('load', function () {
		setTimeout(function () { body.classList.remove('is-preload'); }, 100);
	});

	// --- Menú móvil (panel lateral) ---------------------------------------
	var toggle = document.createElement('div');
	toggle.id = 'headerToggle';
	toggle.innerHTML = '<button type="button" class="toggle" aria-label="Abrir menú" aria-controls="header" aria-expanded="false"></button>';
	body.appendChild(toggle);
	var toggleButton = toggle.firstChild;

	function setMenu(open) {
		body.classList.toggle('header-visible', open);
		toggleButton.setAttribute('aria-expanded', open ? 'true' : 'false');
		toggleButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
		if (!open && header) header.scrollTop = 0;
	}

	toggleButton.addEventListener('click', function (event) {
		event.stopPropagation();
		setMenu(!body.classList.contains('header-visible'));
	});

	// Clic fuera del panel, tecla Escape o deslizar hacia la izquierda lo cierran.
	document.addEventListener('click', function (event) {
		if (body.classList.contains('header-visible') && !header.contains(event.target)) {
			event.preventDefault();
			setMenu(false);
		}
	}, true);

	document.addEventListener('keydown', function (event) {
		if (event.key === 'Escape') setMenu(false);
	});

	var touchX = null;
	header.addEventListener('touchstart', function (event) { touchX = event.touches[0].clientX; }, { passive: true });
	header.addEventListener('touchmove', function (event) {
		if (touchX !== null && touchX - event.touches[0].clientX > 60) {
			touchX = null;
			setMenu(false);
		}
	}, { passive: true });

	// --- Enlaces del menú: activo + scroll suave --------------------------
	var lockedLink = null;
	var lockTimer = null;

	function setActive(link) {
		navLinks.forEach(function (a) { a.classList.toggle('active', a === link); });
		// Si el enlace está en un submenú, se marca también su elemento padre.
		var submenu = link.closest('.submenu');
		var parent = submenu && submenu.parentElement.querySelector(':scope > a');
		if (parent) parent.classList.add('active');
	}

	function sectionFor(link) {
		var href = link.getAttribute('href');
		if (!href || href.charAt(0) !== '#' || href.length < 2) return null;
		return document.getElementById(href.slice(1));
	}

	navLinks.forEach(function (link) {
		link.addEventListener('click', function (event) {
			setMenu(false);
			var section = sectionFor(link);
			if (!section) return; // enlace a otra página
			event.preventDefault();
			// Bloquea el enlace para que el observador no active otros mientras se desplaza.
			lockedLink = link;
			clearTimeout(lockTimer);
			// Se libera cuando termina el desplazamiento (o, como respaldo, a los 4 s).
			lockTimer = setTimeout(function () { lockedLink = null; }, 4000);
			setActive(link);
			section.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	});

	var scrollEndTimer = null;
	window.addEventListener('scroll', function () {
		if (!lockedLink) return;
		clearTimeout(scrollEndTimer);
		scrollEndTimer = setTimeout(function () { lockedLink = null; }, 200);
	}, { passive: true });

	if ('IntersectionObserver' in window) {
		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (!entry.isIntersecting) return;
				var link = navLinks.filter(function (a) { return sectionFor(a) === entry.target; })[0];
				if (!link) return;
				if (!lockedLink) {
					setActive(link);
				} else if (lockedLink === link) {
					lockedLink = null;
				}
			});
		}, { rootMargin: '-45% 0px -45% 0px' });

		navLinks.forEach(function (a) {
			var section = sectionFor(a);
			if (section) observer.observe(section);
		});
	}

})();
