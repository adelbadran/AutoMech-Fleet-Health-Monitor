# AutoMech Dashboard

React + Express web application for the Fleet Health Monitor.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:5001

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PYTHON_PATH` | `python` | Python executable for inference |
| `PORT` | `5001` | Express server port |
| `PROJECT_ROOT` | `..` | Repository root |
| `ARTIFACTS_DIR` | `../artifacts` | Model & summary files |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite + Express |
| `npm run build` | Production build |
| `npm run convert-model` | Convert OBJ → GLB |
