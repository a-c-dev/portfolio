// Aviso de cookies: Google Analytics solo se carga si el visitante lo acepta.
// La decisión se guarda en localStorage y se puede cambiar desde el pie de página.
(function () {
	var GA_ID = 'G-2VQ8D5B0QG';
	var KEY = 'cookie-consent';
	var banner = null;

	function read() {
		try { return localStorage.getItem(KEY); } catch (e) { return null; }
	}
	function write(value) {
		try { localStorage.setItem(KEY, value); } catch (e) { /* sin almacenamiento: se vuelve a preguntar */ }
	}

	function loadAnalytics() {
		if (window.__gaLoaded) return;
		window.__gaLoaded = true;
		window['ga-disable-' + GA_ID] = false;
		window.dataLayer = window.dataLayer || [];
		window.gtag = function () { window.dataLayer.push(arguments); };
		window.gtag('js', new Date());
		window.gtag('config', GA_ID);
		var s = document.createElement('script');
		s.async = true;
		s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
		document.head.appendChild(s);
	}

	function removeAnalyticsCookies() {
		window['ga-disable-' + GA_ID] = true;
		var host = location.hostname.split('.');
		var domains = [location.hostname, '.' + location.hostname, host.length > 2 ? '.' + host.slice(-2).join('.') : ''];
		document.cookie.split(';').forEach(function (c) {
			var name = c.split('=')[0].trim();
			if (name.indexOf('_ga') !== 0) return;
			domains.forEach(function (d) {
				document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
			});
		});
	}

	function close() {
		if (banner) { banner.parentNode.removeChild(banner); banner = null; }
	}

	function choose(value) {
		write(value);
		close();
		if (value === 'granted') loadAnalytics(); else removeAnalyticsCookies();
	}

	function open() {
		if (banner) return;
		banner = document.createElement('div');
		banner.className = 'cookie-banner';
		banner.setAttribute('role', 'dialog');
		banner.setAttribute('aria-label', 'Aviso de cookies');
		banner.innerHTML =
			'<p>Uso <strong>Google Analytics</strong> para medir las visitas de forma anónima y mejorar la web. ' +
			'Solo se activa si lo aceptas, y puedes cambiarlo cuando quieras desde el pie de página.</p>' +
			'<div class="cookie-actions">' +
			'<button type="button" class="button outline" data-choice="denied">Rechazar</button>' +
			'<button type="button" class="button" data-choice="granted">Aceptar</button>' +
			'</div>';
		banner.addEventListener('click', function (event) {
			var btn = event.target.closest('[data-choice]');
			if (btn) choose(btn.getAttribute('data-choice'));
		});
		document.body.appendChild(banner);
	}

	document.addEventListener('click', function (event) {
		if (event.target.closest('[data-cookie-settings]')) open();
	});

	function init() {
		var stored = read();
		if (stored === 'granted') loadAnalytics();
		else if (stored !== 'denied') open();
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();
