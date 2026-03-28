// Game Logic Module
const Game = (() => {
    // Private state
    let board = null;        // Current board state (user entries)
    let original = null;     // Original puzzle state (locked cells)
    let history = [];        // Undo history
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
        
        // Copy puzzle to original (locked cells)
        original = puzzle.map(row => [...row]);
        
        // Initialize board with locked cells filled in
        board = puzzle.map(row => [...row]);
        
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
        // Only allow changes to non-locked cells
        if (original[row][col] !== 0) {
            return false;
        }

        // Save current state to history BEFORE making change
        saveToHistory();

        const oldValue = board[row][col];
        board[row][col] = num;

        // Check for duplicates/conflicts
        const hasConflict = hasConflicts(row, col);

        return true;
    }

    /**
     * Clear a cell
     */
    function clearCell(row, col) {
        if (original[row][col] !== 0) {
            return false;
        }

        saveToHistory();
        board[row][col] = 0;
        return true;
    }

    /**
     * Check if a cell has conflicts (duplicates in row/col/box)
     */
    function hasConflicts(row, col) {
        const value = board[row][col];
        if (value === 0) return false;

        // Check row
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (c !== col && board[row][c] === value) {
                return true;
            }
        }

        // Check column
        for (let r = 0; r < BOARD_SIZE; r++) {
            if (r !== row && board[r][col] === value) {
                return true;
            }
        }

        // Check 3x3 box
        const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
        const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

        for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
            for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
                if ((r !== row || c !== col) && board[r][c] === value) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if the entire board is solved correctly
     */
    function isSolved() {
        // All cells must be filled
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] === 0) {
                    return false;
                }
            }
        }

        // Check for any conflicts
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (hasConflicts(r, c)) {
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
        board = previousState.map(row => [...row]);
        return true;
    }

    /**
     * Reset current game
     */
    function reset() {
        board = original.map(row => [...row]);
        history = [];
        isComplete = false;
        elapsedSeconds = 0;
        if (timerInterval) clearInterval(timerInterval);
        startTimer();
    }

    /**
     * Save current board state to history
     */
    function saveToHistory() {
        if (history.length >= MAX_HISTORY) {
            history.shift(); // Remove oldest entry
        }
        history.push(board.map(row => [...row]));
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
            board: board.map(row => [...row]),
            original: original.map(row => [...row]),
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
        return {
            value: board[row][col],
            isLocked: original[row][col] !== 0,
            hasConflict: hasConflicts(row, col)
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
