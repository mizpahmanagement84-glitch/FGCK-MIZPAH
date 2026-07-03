FROM node:20-slim

WORKDIR /app

# Copy all source files
COPY . .

# Install all dependencies
RUN npm ci --workspaces

# Build the frontend
RUN npm run build

# Expose port
EXPOSE 4000

# Set production environment
ENV NODE_ENV=production

# Start the server
CMD ["npm", "--workspace", "server", "run", "start"]
