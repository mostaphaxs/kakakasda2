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
# We use /embed-root to keep the build context away from Go's 2GB limit
RUN mkdir -p /embed-root/app
COPY --from=composer /app /embed-root/app

# 2. THE DOUBLE SURGICAL STRIKE
# We delete libcurl (to fix LDAP errors) and libzip (to fix ZSTD/Linker errors).
# Deleting these forces 'static-php-cli' to rebuild them from source
# in a way that is 100% compatible with your chosen PHP extensions.
RUN rm -rf /go/src/app/dist/static-php-cli/buildroot/lib/libcurl.a \
           /go/src/app/dist/static-php-cli/buildroot/include/curl \
           /go/src/app/dist/static-php-cli/buildroot/lib/libzip.a \
           /go/src/app/dist/static-php-cli/buildroot/include/zip.h && \
    /bin/bash -c "EMBED=/embed-root/app \
    SKIP_LIBS=ldap,libldap,zstd,libzstd \
    SKIP_EXTS=ldap \
    PHP_EXTENSIONS=bcmath,ctype,curl,dom,fileinfo,filter,hash,iconv,mbstring,opcache,openssl,pcntl,pdo,pdo_sqlite,phar,posix,session,sockets,sqlite3,tokenizer,zip,zlib \
    ./build-static.sh && \
    rm -rf /go/src/app/static-php-cli/buildroot && \
    rm -rf /go/src/app/static-php-cli/pkgroot && \
    rm -rf /embed-root/app/vendor/composer/cache"

# 3. Final cleanup of the embedding source folder
RUN rm -rf /embed-root