FROM node:24-alpine AS web

WORKDIR /web/

COPY ui-web/package.json ui-web/package-lock.json ./

RUN npm ci

COPY ui-web/ .

RUN npm run build

FROM golang:1-alpine AS go_builder

# for sqlite
ENV CGO_ENABLED=1

RUN apk update &&  \
    apk add --no-cache gcc musl-dev

WORKDIR /app

#  deps caching
COPY core/go.mod core/go.sum ./
RUN go mod download

COPY core/ .

RUN go build -ldflags "-s -w"  \
      -o mazechase  \
    ./cmd/server

FROM alpine:latest

# Install ca-certificates for HTTPS
RUN apk add --no-cache ca-certificates

WORKDIR /app/

# Create data directory for SQLite database (must match volume mount)
RUN mkdir -p /appdata/config

# Set environment to use /appdata for database
ENV IS_DOCKER=true

COPY --from=web /web/dist ./dist

COPY --from=go_builder /app/mazechase .

# Default port
EXPOSE 8080

ENTRYPOINT ["./mazechase"]
