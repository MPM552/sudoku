// Game Logic Module
const Game = (() => {
    // Private state - unified cell-based structure
    let grid = null;        // 9x9 grid of cell objects with {value, notes, isLocked}
    let history = [];       // Undo history
    let difficulty = null;
    let isComplete = false;
    let timerInterval = null;
    let elapsedSeconds = 0;

    // Puzzle cache for performance (pre-generate puzzles)
    let puzzleCache = {
        easy: [],
        medium: [],
        hard: []
    };
    let cacheIndices = {
        easy: 0,
        medium: 0,
        hard: 0
    };

    // Constants
    const MAX_HISTORY = 100;
    const BOARD_SIZE = 9;
    const BOX_SIZE = 3;
    const PUZZLES_PER_DIFFICULTY = 50;

    /**
     * Create an empty cell object
     */
    function createCell(value = 0, isLocked = false) {
        return {
            value: value,           // 0-9 (0 means empty)
            notes: [false, false, false, false, false, false, false, false, false], // 9 booleans for notes 1-9
            isLocked: isLocked      // Can't be changed if locked
        };
    }

    /**
     * Initialize puzzle cache on app load
     */
    function initializePuzzleCache() {
        console.log('Generating puzzle cache...');
        puzzleCache.easy = PuzzleGenerator.generatePuzzles(PUZZLES_PER_DIFFICULTY, 'easy');
        puzzleCache.medium = PuzzleGenerator.generatePuzzles(PUZZLES_PER_DIFFICULTY, 'medium');
        puzzleCache.hard = PuzzleGenerator.generatePuzzles(PUZZLES_PER_DIFFICULTY, 'hard');
        console.log('Puzzle cache ready:', {
            easy: puzzleCache.easy.length,
            medium: puzzleCache.medium.length,
            hard: puzzleCache.hard.length
        });
    }

    /**
     * Get next puzzle from cache (or generate if cache exhausted)
     */
    function getPuzzle(difficulty) {
        if (puzzleCache[difficulty].length === 0) {
            // Cache exhausted, generate a new one
            console.log(`Cache exhausted for ${difficulty}, generating new puzzle`);
            return PuzzleGenerator.generatePuzzle(difficulty);
        }

        const puzzle = puzzleCache[difficulty][cacheIndices[difficulty]];
        cacheIndices[difficulty] = (cacheIndices[difficulty] + 1) % puzzleCache[difficulty].length;
        return puzzle;
    }

    /**
     * Initialize a new game with selected difficulty
     */
    function init(diff) {
        difficulty = diff;
        const puzzle = getPuzzle(difficulty);
        
        // Validate puzzle is a proper 9x9 array
        if (!puzzle || puzzle.length !== 9 || !puzzle[0] || puzzle[0].length !== 9) {
            console.error('Invalid puzzle format:', puzzle);
            return;
        }
        
        // Initialize grid with cell objects
        grid = Array.from({ length: 9 }, (_, row) =>
            Array.from({ length: 9 }, (_, col) => {
                const value = puzzle[row][col];
                const isLocked = value !== 0;
                return createCell(value, isLocked);
            })
        );
        
        // Clear history
        history = [];
        isComplete = false;
        elapsedSeconds = 0;
        
        if (timerInterval) clearInterval(timerInterval);
        startTimer();
    }

    /**
     * Place a number in a cell
     */
    function setCell(row, col, num) {
        const cell = grid[row][col];
        
        // Only allow changes to non-locked cells
        if (cell.isLocked) {
            return false;
        }

        // Save current state to history BEFORE making change
        saveToHistory();

        cell.value = num;
        // Clear notes when a value is entered
        cell.notes = [false, false, false, false, false, false, false, false, false];
        return true;
    }

    /**
     * Add a note to a cell
     */
    function addNote(row, col, num) {
        const cell = grid[row][col];
        
        // Can't add notes if locked or if cell has a value
        if (cell.isLocked || cell.value !== 0) {
            return false;
        }

        saveToHistory();

        // Toggle the note (index is num-1 because array is 0-indexed for 1-9)
        cell.notes[num - 1] = true;
        return true;
    }

    /**
     * Remove a note from a cell
     */
    function removeNote(row, col, num) {
        const cell = grid[row][col];
        
        if (!cell.notes[num - 1]) {
            return false;
        }

        saveToHistory();
        cell.notes[num - 1] = false;
        return true;
    }

    /**
     * Clear all notes from a cell
     */
    function clearNotes(row, col) {
        const cell = grid[row][col];
        
        if (!cell.notes.some(note => note === true)) {
            return false;
        }

        saveToHistory();
        cell.notes = [false, false, false, false, false, false, false, false, false];
        return true;
    }

    /**
     * Get notes for a cell as an array of note numbers
     */
    function getNotes(row, col) {
        const cell = grid[row][col];
        const noteArray = [];
        for (let i = 0; i < 9; i++) {
            if (cell.notes[i]) {
                noteArray.push(i + 1);
            }
        }
        return noteArray;
    }

    /**
     * Clear a cell (remove the value but keep notes)
     * Clears without affecting undo history
     */
    function clearCell(row, col) {
        const cell = grid[row][col];
        
        if (cell.isLocked) {
            return false;
        }

        cell.value = 0;
        return true;
    }

    /**
     * Check if a cell has conflicts (duplicates in row/col/box)
     */
    function hasConflicts(row, col) {
        const value = grid[row][col].value;
        if (value === 0) return false;
        // Check row
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (c !== col && grid[row][c].value === value) {
                return true;
            }
        }

        // Check column
        for (let r = 0; r < BOARD_SIZE; r++) {
            if (r !== row && grid[r][col].value === value) {
                return true;
            }
        }

        // Check 3x3 box
        const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
        const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

        for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
            for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
                if ((r !== row || c !== col) && grid[r][c].value === value) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if the entire board is solved correctly
     * Uses Set-based validation for O(n) performance
     */
    function isSolved() {
        // Check all rows have 1-9
        for (let r = 0; r < BOARD_SIZE; r++) {
            const rowSet = new Set();
            for (let c = 0; c < BOARD_SIZE; c++) {
                rowSet.add(grid[r][c].value);
            }
            if (rowSet.size !== BOARD_SIZE || rowSet.has(0)) {
                return false;
            }
        }

        // Check all columns have 1-9
        for (let c = 0; c < BOARD_SIZE; c++) {
            const colSet = new Set();
            for (let r = 0; r < BOARD_SIZE; r++) {
                colSet.add(grid[r][c].value);
            }
            if (colSet.size !== BOARD_SIZE || colSet.has(0)) {
                return false;
            }
        }

        // Check all 3x3 boxes have 1-9
        for (let boxRow = 0; boxRow < BOARD_SIZE; boxRow += BOX_SIZE) {
            for (let boxCol = 0; boxCol < BOARD_SIZE; boxCol += BOX_SIZE) {
                const boxSet = new Set();
                for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
                    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
                        boxSet.add(grid[r][c].value);
                    }
                }
                if (boxSet.size !== BOARD_SIZE || boxSet.has(0)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Mark as complete and stop timer
     */
    function markComplete() {
        isComplete = true;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    /**
     * Undo last move
     */
    function undo() {
        if (history.length === 0) return false;

        const previousState = history.pop();
        // Deep copy the grid state back
        grid = previousState.map(row =>
            row.map(cell => ({
                value: cell.value,
                notes: [...cell.notes],
                isLocked: cell.isLocked
            }))
        );
        return true;
    }

    /**
     * Reset current game
     */
    function reset() {
        // Reinitialize grid to original puzzle state
        grid = grid.map(row =>
            row.map(cell => ({
                value: cell.isLocked ? cell.value : 0,
                notes: [false, false, false, false, false, false, false, false, false],
                isLocked: cell.isLocked
            }))
        );
        history = [];
        isComplete = false;
        elapsedSeconds = 0;
        if (timerInterval) clearInterval(timerInterval);
        startTimer();
    }

    /**
     * Save current grid state to history
     */
    function saveToHistory() {
        if (history.length >= MAX_HISTORY) {
            history.shift(); // Remove oldest entry
        }
        // Deep copy the current grid state
        history.push(grid.map(row =>
            row.map(cell => ({
                value: cell.value,
                notes: [...cell.notes],
                isLocked: cell.isLocked
            }))
        ));
    }

    /**
     * Start the game timer
     */
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            elapsedSeconds++;
        }, 1000);
    }

    /**
     * Get formatted time string
     */
    function getTimeString() {
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /**
     * Get current game state
     */
    function getState() {
        return {
            difficulty: difficulty,
            isComplete: isComplete,
            elapsedSeconds: elapsedSeconds,
            canUndo: history.length > 0
        };
    }

    /**
     * Get cell info
     */
    function getCell(row, col) {
        if (!grid || !grid[row] || !grid[row][col]) {
            console.error(`Grid not initialized or invalid cell ${row},${col}`, grid);
            return {
                value: 0,
                isLocked: false,
                hasConflict: false,
                notes: []
            };
        }
        
        const cell = grid[row][col];
        return {
            value: cell.value,
            isLocked: cell.isLocked,
            hasConflict: hasConflicts(row, col),
            notes: getNotes(row, col)
        };
    }

    /**
     * Stop timer (for cleanup)
     */
    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    // Public API
    return {
        init,
        setCell,
        clearCell,
        addNote,
        removeNote,
        clearNotes,
        getNotes,
        hasConflicts,
        isSolved,
        markComplete,
        undo,
        reset,
        getState,
        getCell,
        getTimeString,
        stopTimer,
        initializePuzzleCache
    };
})();
