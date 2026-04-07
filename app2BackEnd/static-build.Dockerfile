# Stage 1: Install Composer dependencies
FROM composer:latest AS composer
WORKDIR /app
COPY . .

# Aggressive pre-clean to keep the final binary lean
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

# 2. THE SURGICAL STRIKE
# We MUST delete the pre-built libcurl.a because it contains hardcoded LDAP references.
# This forces 'static-php-cli' to rebuild a version that respects our SKIP settings.
RUN rm -rf /go/src/app/dist/static-php-cli/buildroot/lib/libcurl.a \
           /go/src/app/dist/static-php-cli/buildroot/include/curl && \
    /bin/bash -c "EMBED=/embed-root/app \
    SKIP_LIBS=ldap,libldap \
    SKIP_EXTS=ldap \
    PHP_EXTENSIONS=bcmath,ctype,curl,dom,fileinfo,filter,hash,iconv,mbstring,opcache,openssl,pcntl,pdo,pdo_sqlite,phar,posix,session,sockets,sqlite3,tokenizer,zip,zlib \
    ./build-static.sh && \
    rm -rf /go/src/app/static-php-cli/buildroot && \
    rm -rf /go/src/app/static-php-cli/pkgroot && \
    rm -rf /embed-root/app/vendor/composer/cache"

# 3. Final cleanup
RUN rm -rf /embed-root