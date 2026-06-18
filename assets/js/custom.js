
function autoAdjustIframeWidth(Id) {

    const miIframe = document.getElementById('photo-frame');

    miIframe.addEventListener('load', function() {
                                // Le pide a la página de adentro su ancho real total
                                const anchoRealInterno = miIframe.contentWindow.document.body.scrollWidth;
                                const altoRealInterno = miIframe.contentWindow.document.body.scrollHeight;
                                // Ajusta el iframe exactamente a ese tamaño
                                miIframe.style.width = anchoRealInterno + 'px';
                                miIframe.style.height = altoRealInterno + 'px';
                            });

}

                        