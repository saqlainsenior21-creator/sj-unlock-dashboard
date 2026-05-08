FROM node:20-slim
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Build frontend dashboard
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Build website
COPY website/package*.json ./website/
RUN cd website && npm install
COPY website/ ./website/
RUN cd website && npm run build

# Install backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production
COPY backend/ ./backend/

WORKDIR /usr/src/app/backend
EXPOSE 3005
CMD ["node", "server.js"]
