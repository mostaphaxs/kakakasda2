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

# Copy the prepared Laravel project into a SEPARATE directory on the root
# Do NOT use 'dist' as it conflicts with FrankenPHP's internal build tools
COPY --from=composer /app /app-to-embed

# Build the static binary with a MINIMAL extension set.
# Heavy extensions removed to stay within the ~7 GB RAM of free GitHub Actions runners:
#   - intl  → compiles ICU from source (~500 MB peak RAM)
#   - gd    → requires libpng/libjpeg compilation
#   - xml*  → simplexml, xmlreader, xmlwriter pulled in via dom anyway
#   - readline → not needed in production CLI
# dom/libxml are implicitly included by core; zlib/openssl are statically linked.
# We point EMBED to the absolute path of our clean application folder.
RUN EMBED=/app-to-embed \
    PHP_EXTENSIONS=bcmath,ctype,curl,dom,fileinfo,filter,hash,iconv,mbstring,opcache,openssl,pcntl,pdo,pdo_sqlite,phar,posix,session,sockets,sqlite3,tokenizer,zip,zlib \
    ./build-static.sh
