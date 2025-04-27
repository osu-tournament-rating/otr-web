FROM node:22
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

EXPOSE 3000
ENTRYPOINT ["npm", "run", "start"]