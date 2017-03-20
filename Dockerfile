FROM node:7
RUN mkdir -p /usr/src/srnet
WORKDIR /usr/src/srnet

COPY package.json /usr/src/srnet/
RUN npm i

COPY . /usr/src/srnet

EXPOSE 3000

CMD ["npm", "start"]
