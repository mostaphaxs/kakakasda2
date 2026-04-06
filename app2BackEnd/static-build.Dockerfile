# 1. Composer Stage to get vendor dependencies without requiring user's machine to have it synced
FROM composer:latest AS composer
COPY . /app
RUN cd /app && composer install --optimize-autoloader --no-dev --ignore-platform-reqs

# 2. FrankenPHP Static Builder Stage
FROM dunglas/frankenphp:static-builder-gnu

# Copy your prepared Laravel project with vendor/
COPY --from=composer /app /go/src/app/dist

# Build the binary with minimalistic extensions (Laravel + SQLite) to avoid OOM / Timeouts on GitHub Actions
RUN EMBED=/go/src/app/dist \
    PHP_EXTENSIONS=bcmath,ctype,curl,dom,fileinfo,filter,gd,hash,iconv,intl,mbstring,opcache,openssl,pcntl,pcre,pdo,pdo_sqlite,phar,posix,readline,session,simplexml,sockets,sqlite3,tokenizer,xml,xmlreader,xmlwriter,zip,zlib \
    ./build-static.sh
