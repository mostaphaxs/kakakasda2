# Stage 1: Install Composer dependencies
FROM composer:latest AS composer
COPY . /app
RUN cd /app && composer install \
    --optimize-autoloader \
    --no-dev \
    --no-scripts \
    --ignore-platform-reqs

# Stage 2: FrankenPHP Static Builder
# Uses the GNU variant which is more compatible with GitHub Actions runners
FROM dunglas/frankenphp:static-builder-gnu

# Copy the prepared Laravel project (with vendor/) into the expected embed path
COPY --from=composer /app /go/src/app/dist

# Build the static binary with a MINIMAL extension set.
# Heavy extensions removed to stay within the ~7 GB RAM of free GitHub Actions runners:
#   - intl  → compiles ICU from source (~500 MB peak RAM)
#   - gd    → requires libpng/libjpeg compilation
#   - xml*  → simplexml, xmlreader, xmlwriter pulled in via dom anyway
#   - readline → not needed in production CLI
# dom/libxml are implicitly included by core; zlib/openssl are statically linked.
RUN EMBED=/go/src/app/dist \
    PHP_EXTENSIONS=bcmath,ctype,curl,dom,fileinfo,filter,hash,iconv,mbstring,opcache,openssl,pcntl,pdo,pdo_sqlite,phar,posix,session,sockets,sqlite3,tokenizer,zip,zlib \
    ./build-static.sh
