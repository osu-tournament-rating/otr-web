FROM node:22-slim AS builder
WORKDIR /usr/src/app

RUN ls
COPY ./quartz/package.json ./quartz/package-lock.json* ./
RUN npm ci

FROM node:22-slim
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/ /usr/src/app/
COPY ./quartz .
COPY ./docs ./content

CMD ["npx", "quartz", "build", "--serve"]