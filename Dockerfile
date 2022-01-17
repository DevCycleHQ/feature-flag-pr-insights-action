FROM node:14.4.0-buster-slim

COPY . .

RUN yarn build

ENTRYPOINT ["node", "/dist/index.js"]