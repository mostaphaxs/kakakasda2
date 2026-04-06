FROM dunglas/frankenphp:static-builder-gnu

# Standard Laravel extensions + SQLite + Performance
ENV PHP_EXTENSIONS="bcmath calendar dom exif gd gettext intl mbstring mysqli opcache pcntl pdo_mysql pdo_sqlite phar posix readline session shmop simplexml soap sockets sqlite3 sysvmsg sysvsem sysvshm tokenizer xml xmlreader xmlwriter xsl zip zlib"

# Copy your backend source into the builder
COPY . /go/src/app/

# Build the static binary
RUN ./build-static.sh
