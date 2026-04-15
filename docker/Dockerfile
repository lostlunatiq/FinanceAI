FROM python:3.14-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  libpq-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# install uv
RUN pip install uv

# copy only dependency files first (cache optimization)
COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-install-project

# now copy rest
COPY . .

EXPOSE 8000

CMD ["uv", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]
