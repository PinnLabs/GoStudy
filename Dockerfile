# Build step
FROM node:20-alpine as build

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

# Production step
FROM node:20-alpine

WORKDIR /app

COPY --from=build /app ./

RUN npm install --omit=dev

EXPOSE 3000

CMD ["npm", "start"]
