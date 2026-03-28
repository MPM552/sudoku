# Sudoku - Pure JavaScript Game

A performance-first, distraction-free Sudoku web application built with vanilla JavaScript.

## Features

- 🎮 **Dynamic Puzzle Generation** — 150 puzzles per session (Easy, Medium, Hard)
- ⚡ **Zero Lag Input** — <16ms response time
- 🎯 **Real-time Validation** — Instant conflict highlighting
- ⏱️ **Game Controls** — Undo, New Game
- 📱 **Responsive Design** — Browser optimized
- ⌨️ **Keyboard** — Full keyboard support (1-9, Backspace)

## Quick Start
1. **Download Zip**
2. **Open the game**
   ```bash
   # Option 1: Direct (no server needed)
   open index.html
   
   # Option 2: With live server (requires Live Server extension in VS Code)
   Right-click index.html → Open with Live Server
   ```

3. **Select difficulty** (Easy, Medium, Hard)
4. **Play** — Click cells to select, use number buttons or keyboard (1-9)
5. **Controls**
   - **Undo** — Revert last move
   - **New Game** — Return to difficulty picker
   - **Backspace/Delete** — Clear cell

## Project Structure

```
Sudoku-js/
├── src/
│   ├── js/
│   │   ├── game.js          # Core game logic
│   │   ├── ui.js            # DOM interactions and rendering
│   │   └── generator.js     # Sudoku puzzle generator
│   └── css/
│       └── style.css        # Responsive styling
├── docs/
│   └── prd.md               # Product requirements document
├── index.html               # Main entry point
└── README.md                # This file
```

## Technical Stack

- **Language**: Vanilla JavaScript (ES6+)
- **Styling**: CSS3
- **Architecture**: Module pattern (no frameworks)
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
