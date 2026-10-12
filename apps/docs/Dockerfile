# Quartz is upstream's v5 branch at this commit, used unmodified. To update
# Quartz, change the commit, build the image, and look over the site.
ARG QUARTZ_REF=97a2d05f80c4c50534959b1d0d41cc4b3895625e

FROM node:22-slim AS build
ARG QUARTZ_REF
WORKDIR /usr/src/app
ADD https://github.com/jackyzha0/quartz.git#${QUARTZ_REF} .
RUN npm ci --no-audit --no-fund

# Our files go on top of Quartz: the config, the footer plugin it names, the
# icon and link-preview image, and docs/ as the content.
COPY quartz.config.yaml ./
COPY plugins ./plugins
COPY static/ ./quartz/static/
COPY docs ./content
RUN npx quartz build

FROM nginx:1.30.5-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/public /usr/share/nginx/html
