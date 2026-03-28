# Sudoku - Pure JavaScript Game

A performance-first, distraction-free Sudoku web application built with vanilla JavaScript.

## Features

- 🎮 **Dynamic Puzzle Generation** — 150 puzzles per session (Easy, Medium, Hard)
- ⚡ **Zero Lag Input** — <16ms response time
- 🎯 **Real-time Validation** — Instant conflict highlighting
- ⏱️ **Game Controls** — Undo, New Game
- 📱 **Responsive Design** — Desktop and mobile optimized
- ⌨️ **Keyboard & Touch** — Full keyboard support (1-9, Backspace)

## Quick Start

1. **Open the game**
   ```bash
   # Option 1: Direct (no server needed)
   open index.html
   
   # Option 2: With live server (requires Live Server extension in VS Code)
   Right-click index.html → Open with Live Server
   ```

2. **Select difficulty** (Easy, Medium, Hard)
3. **Play** — Click cells to select, use number buttons or keyboard (1-9)
4. **Controls**
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

## Performance Targets

| Operation | Target |
|-----------|--------|
| Initial load | <2 seconds |
| Number input | <16ms |
| Conflict highlighting | <50ms |
| Undo operation | <50ms |
| Puzzle swap | <300ms |

## Game Rules

- Fill the 9×9 grid so each row, column, and 3×3 box contains numbers 1-9
- Clue cells (gray background) cannot be edited
- Duplicate numbers are highlighted in red
- Solve completely to see completion celebration

## Development

### Puzzle Generation

- **Easy**: 44-52 clues (easier to solve)
- **Medium**: 28-35 clues (balanced difficulty)
- **Hard**: 17-26 clues (challenging)

The generator creates 50 puzzles per difficulty on startup and cycles through them.

### Future Phases (Post-MVP)

- **Phase 2**: Hint system, candidate notes, statistics tracking
- **Phase 3**: Puzzle persistence, sharing, community features

## License

Personal project. Built for craft and learning in Sudoku.
