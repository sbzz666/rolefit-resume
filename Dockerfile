FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY dist ./dist
COPY scripts ./scripts
ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 4173
CMD ["npm", "start"]

