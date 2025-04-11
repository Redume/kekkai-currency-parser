FROM node:20-alpine

WORKDIR /

COPY /package*.json .

RUN npm install

COPY /node_modules /node_modules

COPY . .

CMD ["node", "main.js"]
