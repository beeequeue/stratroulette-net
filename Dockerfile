FROM node:7
RUN mkdir -p /usr/src/srnet
WORKDIR /usr/src/srnet

COPY package.json /usr/src/srnet/
RUN npm i
RUN npm i -g forever

COPY . /usr/src/srnet

EXPOSE 3000

CMD ["forever", "bin/www"]
