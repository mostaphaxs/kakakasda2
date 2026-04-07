# Stage 1: Install Composer dependencies
FROM composer:latest AS composer
WORKDIR /app
COPY . .
# Aggressive pre-clean
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

# 2. Build AND Clean in a single RUN command
# This is the "Magic Fix". We run the build, then immediately 
# wipe the heavy source tools so the Go compiler has "breathing room."
RUN EMBED=/embed-root/app \
    PHP_EXTENSIONS=bcmath,ctype,curl,dom,fileinfo,filter,hash,iconv,mbstring,opcache,openssl,pcntl,pdo,pdo_sqlite,phar,posix,session,sockets,sqlite3,tokenizer,zip,zlib \
    /bin/bash -c "./build-static.sh && \
    rm -rf /go/src/app/static-php-cli/buildroot && \
    rm -rf /go/src/app/static-php-cli/pkgroot && \
    rm -rf /embed-root/app/vendor/composer/cache"

# 3. Final cleanup of the embedding source
RUN rm -rf /embed-root