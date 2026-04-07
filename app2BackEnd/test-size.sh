#!/bin/bash
docker build --target composer -t test-size -f static-build.Dockerfile .
docker create --name temp-test test-size
docker cp temp-test:/app ./temp-app
du -sh ./temp-app
rm -rf ./temp-app
docker rm temp-test
