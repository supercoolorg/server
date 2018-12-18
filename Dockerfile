# Choose image 
FROM node:11

# Create dir containing the app
WORKDIR /urs/src/app

COPY package*.json ./

RUN npm install 
# --only=production

# Bundle app source
COPY . .

EXPOSE 50999-51100
CMD ["npm", "start"]
