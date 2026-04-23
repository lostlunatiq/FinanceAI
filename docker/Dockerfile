FROM python:3.14-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  libpq-dev \
  libcairo2 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libgdk-pixbuf-2.0-0 \
  libffi-dev \
  shared-mime-info \
  poppler-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# install uv
RUN pip install uv

# packages land in /usr/local so they survive volume mounts in dev
ENV UV_PROJECT_ENVIRONMENT=/usr/local/

# copy only dependency files first (cache optimization)
COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-install-project

# now copy rest
COPY . .

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uv", "run", "uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--reload"]
