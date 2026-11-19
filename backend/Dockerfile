# syntax=docker/dockerfile:1
# Multi-stage build: static musl binary -> `scratch` image (no shell, no libc, no CA bundle:
# reqwest uses rustls with the webpki roots compiled in). Build context: backend/
#
#   docker build -t navikarier-backend backend/
#   docker run --rm -e DATABASE_URL=postgresql://... -e JWT_SECRET=... -p 8000:8000 navikarier-backend
#
# Env: DATABASE_URL JWT_SECRET OAUTH_BRIDGE_SECRET ANTHROPIC_API_KEY RESEND_API_KEY FROM_EMAIL
#      CONTACT_EMAIL FRONTEND_URL CORS_ORIGINS (+ PORT, default 8000). Skema dibuat otomatis saat start.

FROM rust:1-alpine AS build
RUN apk add --no-cache musl-dev gcc
WORKDIR /src

# Dependency layer: build once against a stub crate so source edits don't refetch/recompile deps.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs && touch src/lib.rs \
    && cargo build --release --locked ; rm -rf src

COPY data ./data
COPY src ./src
RUN touch src/lib.rs src/main.rs && cargo build --release --locked \
    && cp target/release/navikarier-backend /navikarier-backend

FROM scratch
COPY --from=build /navikarier-backend /navikarier-backend
USER 10001:10001
ENV PORT=8000
EXPOSE 8000
ENTRYPOINT ["/navikarier-backend"]
