# Stage 1: Install Composer dependencies
FROM composer:latest AS composer
WORKDIR /app
COPY . .
# We remove the .git and other junk here to ensure the "copy-from" is clean
RUN rm -rf .git node_modules storage/logs/* database/*.sqlite
RUN composer install \
    --optimize-autoloader \
    --no-dev \
    --no-scripts \
    --ignore-platform-reqs

# Stage 2: FrankenPHP Static Builder
FROM dunglas/frankenphp:static-builder-gnu

# 1. Create a dedicated, isolated directory for the app
RUN mkdir -p /embed-root/app

# 2. Copy ONLY the necessary files from the composer stage
# This ensures we don't accidentally pull in build tools from the composer image
COPY --from=composer /app /embed-root/app

# 3. Build the static binary
# CRITICAL: We point EMBED to /embed-root/app. 
# Because this folder is isolated, FrankenPHP's build tools (which live in /go/src/app)
# won't be accidentally sucked into the Go 'embed' directive.
RUN EMBED=/embed-root/app \
    PHP_EXTENSIONS=bcmath,ctype,curl,dom,fileinfo,filter,hash,iconv,mbstring,opcache,openssl,pcntl,pdo,pdo_sqlite,phar,posix,session,sockets,sqlite3,tokenizer,zip,zlib \
    ./build-static.sh

# 4. Clean up the massive build artifacts AFTER the binary is created 
# but BEFORE the layer is finished, to keep the image size down.
RUN rm -rf /embed-root /go/src/app/static-php-cli