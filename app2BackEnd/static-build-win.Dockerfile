# Stage 1: Install Composer dependencies
FROM composer:latest AS composer
WORKDIR /app
COPY . .
RUN rm -rf .git node_modules storage/logs/* database/*.sqlite tests/
RUN composer install --optimize-autoloader --no-dev --no-scripts --ignore-platform-reqs

# Stage 2: FrankenPHP Static Builder for Windows (MSVC)
FROM dunglas/frankenphp:static-builder-msvc

# 1. Prepare isolated app directory
RUN mkdir -p /embed-root/app
COPY --from=composer /app /embed-root/app

# 2. Build the static binary for Windows
# We use a clean build logic
RUN EMBED=/embed-root/app \
    PHP_EXTENSIONS=bcmath,ctype,curl,dom,fileinfo,filter,hash,iconv,mbstring,mbregex,opcache,openssl,pcntl,pdo,pdo_sqlite,phar,posix,session,simplexml,sockets,sqlite3,tokenizer,xml,xmlreader,xmlwriter,zip,zlib \
    ./build-static.sh

    
# 3. Final cleanup
RUN rm -rf /go/src/app/static-php-cli/buildroot && \
    rm -rf /go/src/app/static-php-cli/pkgroot && \
    rm -rf /embed-root
