FROM node:20-alpine

# Install dependencies for sharp and tesseract
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    tesseract-ocr \
    tesseract-ocr-data-eng

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3012

CMD ["npm", "start"]
