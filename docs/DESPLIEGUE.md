# Despliegue de ditados.edumind.es

Propuesta, no aplicada. El sitio es estático: Nginx sirve la carpeta `dist/` compilada. No hay proceso en marcha, ni base de datos, ni cookies.

## Pasos (los hace Luis o se piden expresamente)

1. DNS: registro A/AAAA de `ditados.edumind.es` al servidor.
2. Certificado: con el script de certbot de `.edumind_ops`.
3. Vhost: el de abajo, en `/etc/nginx/sites-available/ditados.edumind.es`, enlazado en `sites-enabled` y `nginx -t && systemctl reload nginx`.
4. Compilar: `cd /var/www/ditados && node bin/ditados.js build`.

## Vhost propuesto

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ditados.edumind.es;
    # ssl_certificate / ssl_certificate_key: los del certbot

    root /var/www/ditados/dist;
    index index.html;

    # Denegación por defecto: solo lo compilado. Sin listados de directorio.
    autoindex off;
    location / { try_files $uri $uri/ =404; }

    # Las presentaciones llevan el audio dentro (2-3 MB): caché larga, nombres estables por dictado.
    location ~* \.(html)$ { add_header Cache-Control "public, max-age=3600"; }
    location ~* \.(woff2|mp3|pdf)$ { add_header Cache-Control "public, max-age=2592000, immutable"; }

    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
    # Sin terceros: la CSP solo permite el propio origen y los data: de fuentes y audio incrustados.
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; font-src 'self' data:; media-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'self'";

    # Privacidad: IP anonimizada como en el resto de sitios (ver project_privacy_first_logs_nginx)
    access_log /var/log/nginx/ditados.access.log privacy_log;
}
server {
    listen 80; listen [::]:80;
    server_name ditados.edumind.es;
    return 301 https://$host$request_uri;
}
```

Nota: `script-src 'unsafe-inline'` hace falta porque la presentación es un único fichero autónomo con su script dentro (requisito de uso sin conexión). Si se quiere una CSP más estricta, se puede añadir un hash del script en la fase 2.
