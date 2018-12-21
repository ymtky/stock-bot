FROM node:latest

COPY . /src/stock_bot/
WORKDIR /src/stock_bot

RUN npm install