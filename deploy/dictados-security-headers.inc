# Cabeceras de seguridad de dictados.edumind.es.
# Se incluye DENTRO de cada location que declare add_header propio: nginx
# descarta las cabeceras heredadas del server en cuanto un bloque hijo declara la suya.
#
# CSP: la presentación es un único HTML autónomo con su script y su CSS dentro, y
# con las fuentes y el audio incrustados como data: (requisito de uso sin conexión).
# Por eso script-src y style-src admiten 'unsafe-inline' y font/media admiten data:.
# No se carga nada de terceros.

add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self' data:; media-src 'self' data: blob:; worker-src 'self'; manifest-src 'self'; form-action 'self';" always;
