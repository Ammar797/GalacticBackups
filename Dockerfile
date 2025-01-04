# Step 1: Use a Node.js image as the base
FROM node:18

# Step 2: Set the working directory inside the container
WORKDIR /app

# Step 3: Copy all files from your repository into the container
COPY . .

# Step 4: Install dependencies for the main app
RUN npm install

# Step 5: Install client-side dependencies and build the client
WORKDIR /app/client
RUN npm install
RUN npm run build

# Step 6: Set the working directory back to the main app
WORKDIR /app

# Step 7: Expose the port that your app runs on (if needed)
EXPOSE 3000

# Step 8: Start your Node.js app (server)
CMD ["npm", "start"]
