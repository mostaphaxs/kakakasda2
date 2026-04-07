# Stage 1: Install Composer dependencies (Unchanged)
FROM composer:latest AS composer
WORKDIR /app
COPY . .
RUN rm -rf .git node_modules storage/logs/* database/*.sqlite tests/
RUN composer install \
    --optimize-autoloader \
    --no-dev \
    --no-scripts \
    --ignore-platform-reqs

# Stage 2: FrankenPHP Static Builder
FROM dunglas/frankenphp:static-builder-gnu

# 1. Prepare isolated app directory
RUN mkdir -p /embed-root/app
COPY --from=composer /app /embed-root/app

# 2. Build AND Clean
# Added: --with-curl-options="--without-ldap --without-lber" to kill the Curl dependency
RUN /bin/bash -c "EMBED=/embed-root/app \
    SKIP_LIBS=ldap,libldap \
    SKIP_EXTS=ldap \
    PHP_EXTENSIONS=bcmath,ctype,curl,dom,fileinfo,filter,hash,iconv,mbstring,opcache,openssl,pcntl,pdo,pdo_sqlite,phar,posix,session,sockets,sqlite3,tokenizer,zip,zlib \
    ./build-static.sh --with-curl-options=\"--without-ldap --without-lber\" && \
    rm -rf /go/src/app/static-php-cli/buildroot && \
    rm -rf /go/src/app/static-php-cli/pkgroot && \
    rm -rf /embed-root/app/vendor/composer/cache"

# 3. Final cleanup
RUN rm -rf /embed-root