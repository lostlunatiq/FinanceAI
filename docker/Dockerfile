FROM python:3.12-slim

WORKDIR /app

# install uv
RUN pip install uv

# copy only dependency files first (cache optimization)
COPY pyproject.toml uv.lock ./

RUN uv sync

# now copy rest
COPY . .

EXPOSE 8000

CMD ["uv", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]
