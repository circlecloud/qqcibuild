FROM node:10-alpine

WORKDIR /qqcibuild/

COPY . /qqcibuild/

# RUN tar xf node-v10.6.0-linux-x64.tar.xz
# RUN rm node-v10.6.0-linux-x64.tar.xz
# RUN node-v10.6.0-linux-x64/bin/node -v
# RUN pwd
RUN \
    echo "finish"

ENTRYPOINT ["node", "/qqcibuild/script/orange.js" ]
