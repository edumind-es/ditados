# Despliegue de dictados.edumind.es

El sitio es estático: Nginx sirve la carpeta `dist/` compilada. No hay proceso en marcha, ni base de datos, ni cookies.

**Instalado el 2026-10-21** con `sudo python3 /var/www/.edumind_ops/dictados_site_install.py`, que copia `deploy/dictados.edumind.es.conf` y `deploy/dictados-security-headers.inc` (los ficheros vivos del repo; el bloque de abajo es la propuesta original). Para publicar una compilación nueva basta con `node bin/ditados.js build`: Nginx sirve `dist/` directamente.

## Pasos (los hace Luis o se piden expresamente)

1. DNS: registro A/AAAA de `dictados.edumind.es` al servidor.
2. Certificado: con el script de certbot de `.edumind_ops`.
3. Vhost: el de abajo, en `/etc/nginx/sites-available/dictados.edumind.es`, enlazado en `sites-enabled` y `nginx -t && systemctl reload nginx`.
4. Compilar: `cd /var/www/ditados && node bin/ditados.js build`.

## Vhost propuesto

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name dictados.edumind.es;
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
    server_name dictados.edumind.es;
    return 301 https://$host$request_uri;
}
```

Nota: `script-src 'unsafe-inline'` hace falta porque la presentación es un único fichero autónomo con su script dentro (requisito de uso sin conexión). Si se quiere una CSP más estricta, se puede añadir un hash del script en la fase 2.

## Editor del autor (fase 2)

El editor es un servicio Node sin dependencias que escucha solo en `127.0.0.1:9170`. Nginx lo expone en `https://dictados.edumind.es/editor/` detrás de Authentik, igual que las demás apps: la sesión la gestiona Authentik y el servicio solo acepta peticiones con la cabecera `X-Authentik-Username` de un usuario de la lista `DITADOS_AUTORES`.

### Unidad systemd propuesta (`/etc/systemd/system/ditados-editor.service`)

```ini
[Unit]
Description=Ditados EDUmind - editor del autor
After=network-online.target

[Service]
Type=simple
User=nuevoadmin
Group=dev-www
WorkingDirectory=/var/www/ditados
Environment=DITADOS_PUERTO=9170
Environment=DITADOS_AUTORES=luis
# Opcional: Environment=DITADOS_LANGUAGETOOL_URL=http://127.0.0.1:8010
ExecStart=/usr/bin/node bin/ditados.js servir
Restart=on-failure
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Bloque de nginx (dentro del `server` de dictados.edumind.es)

```nginx
    # Editor: solo con sesión de Authentik (auth_request, como en las otras apps)
    location /editor/ {
        auth_request /outpost.goauthentik.io/auth/nginx;
        error_page 401 = @goauthentik_proxy_signin;
        auth_request_set $authentik_username $upstream_http_x_authentik_username;
        proxy_set_header X-Authentik-Username $authentik_username;
        proxy_pass http://127.0.0.1:9170;
    }
    location /api/ {
        auth_request /outpost.goauthentik.io/auth/nginx;
        error_page 401 = @goauthentik_proxy_signin;
        auth_request_set $authentik_username $upstream_http_x_authentik_username;
        proxy_set_header X-Authentik-Username $authentik_username;
        proxy_pass http://127.0.0.1:9170;
        client_max_body_size 2m;
    }
```

Los bloques `/outpost.goauthentik.io/` y `@goauthentik_proxy_signin` son los mismos que usan board, pasos y motion. En Authentik hace falta dar de alta la aplicación `ditados` con proveedor proxy (forward auth, single application) y asignarla solo al grupo del autor.

### Qué hace el editor al cambiar de estado

- `borrador → revisado`: valida, pasa LanguageTool si está configurado, y lanza `build --solo <id>` en segundo plano (audio con la voz elegida, PDF, MiClase). El registro se ve en el propio editor.
- `revisado → publicado`: vuelve a lanzar la generación. El dictado aparece en la web en esa compilación. La compilación del catálogo completo (`build`) se hace a mano o por cron.
- `→ borrador`: deja de publicarse en la siguiente compilación completa.

### LanguageTool (opcional)

El contenedor oficial `erikvl87/languagetool` escucha en 8010 y tiene gallego y castellano. Si se arranca, basta con `DITADOS_LANGUAGETOOL_URL=http://127.0.0.1:8010` en la unidad. No está instalado: pedir permiso antes.

### ODT (pendiente)

Generar ODT exige LibreOffice (`libreoffice-writer` sin interfaz, unos 300 MB) para convertir los HTML de impresión. No está instalado: pedir permiso antes. La alternativa sin instalar nada es la API de conversión del ONLYOFFICE que ya corre para Nextcloud, pero acopla los dos sistemas.
