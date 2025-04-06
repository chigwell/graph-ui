FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps  # Force install peer dependencies
COPY . .
EXPOSE 3000
CMD ["npm", "start"]