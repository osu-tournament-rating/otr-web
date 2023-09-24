# Specify a base image
FROM node:18

# Set a working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build the app
RUN npm run build

# Install serve
RUN npm install -g serve

# set http server port
EXPOSE 5000

# start the application
CMD ["serve", "-s", "build"]
