FROM dunglas/frankenphp:static-builder-gnu

# Standard Laravel extensions + SQLite + Performance
ENV PHP_EXTENSIONS="bcmath calendar dom exif gd gettext intl mbstring mysqli opcache pcntl pdo_mysql pdo_sqlite phar posix readline session shmop simplexml soap sockets sqlite3 sysvmsg sysvsem sysvshm tokenizer xml xmlreader xmlwriter xsl zip zlib"

# Copy your prepared Laravel project
COPY . /go/src/app/dist

# Build the binary with all Laravel + SQLite extensions
RUN EMBED=/go/src/app/dist \
    PHP_EXTENSIONS=bcmath,calendar,ctype,curl,dom,exif,filter,fileinfo,gd,gettext,hash,iconv,intl,json,mbstring,mysqli,openssl,opcache,pcntl,pcre,pdo,pdo_mysql,pdo_sqlite,phar,posix,readline,session,shmop,simplexml,soap,sockets,spl,standard,sysvmsg,sysvsem,sysvshm,tokenizer,xml,xmlreader,xmlwriter,xsl,zip,zlib \
    ./build-static.sh
