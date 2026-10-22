# AM32 ESC Configurator

Web-based configurator for AM32 ESC firmware. Supports 4-way interface and direct USB connection.

## Requirements

- [Node.js](https://nodejs.org/) v18+ or [Bun](https://bun.sh/) (recommended)
- Git
- A modern browser with Web Serial API support (Chrome / Edge)

## Getting started on a new machine

### 1. Clone the repository

```bash
git clone https://github.com/RRegulo/am32-configurator.git
cd am32-configurator
```

### 2. Install dependencies

```bash
# using bun (recommended)
bun install

# or using npm
npm install
```

### 3. Start the development server

```bash
# using bun
bun run dev

# or using npm
npm run dev
```

The app will be available at `http://localhost:3000`.

## Production build

```bash
# build
bun run build

# preview the production build locally
bun run preview
```

## VS Code

The repository includes VS Code tasks for convenience. Use `Ctrl+Shift+P` → **Tasks: Run Task** → **nuxt: dev** to start the dev server.

## Notes

- Web Serial API is only available in **Chrome** or **Edge** (not Firefox/Safari)
- Connect your ESC via USB or serial adapter before opening the configurator
- If flashing fails, try **Ignore current MCU layout** option in the Flash Firmware dialog
