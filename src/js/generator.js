// Sudoku Puzzle Generator
// Generates random valid Sudoku puzzles with configurable difficulty

const PuzzleGenerator = (() => {
    const BOARD_SIZE = 9;
    const BOX_SIZE = 3;

    // Difficulty settings: number of cells to remove for each difficulty
    const DIFFICULTY_SETTINGS = {
        easy: { min: 37, max: 45 },      // 44-52 clues remaining
        medium: { min: 46, max: 53 },    // 28-35 clues remaining
        hard: { min: 55, max: 64 }       // 17-26 clues remaining
    };

    /**
     * Generate a complete, solved Sudoku board
     */
    function generateSolvedBoard() {
        const board = Array(9).fill().map(() => Array(9).fill(0));
        fillBoard(board);
        return board;
    }

    /**
     * Find the next empty cell and fill board using backtracking
     */
    function fillBoard(board) {
        // Find next empty cell
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (board[row][col] === 0) {
                    // Try numbers 1-9 in random order
                    const numbers = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);

                    for (let num of numbers) {
                        if (isValid(board, row, col, num)) {
                            board[row][col] = num;

                            if (fillBoard(board)) {
                                return true;
                            }

                            board[row][col] = 0; // Backtrack
                        }
                    }
                    return false;
                }
            }
        }
        return true; // Board is complete
    }

    /**
     * Check if a number is valid at a position
     */
    function isValid(board, row, col, num) {
        // Check row
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[row][c] === num) return false;
        }

        // Check column
        for (let r = 0; r < BOARD_SIZE; r++) {
            if (board[r][col] === num) return false;
        }

        // Check 3x3 box
        const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
        const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
        for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
            for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
                if (board[r][c] === num) return false;
            }
        }

        return true;
    }

    /**
     * Generate a puzzle with specified difficulty
     * Difficulty: 'easy', 'medium', 'hard'
     */
    function generatePuzzle(difficulty = 'medium') {
        // Generate solved board
        const solved = generateSolvedBoard();
        if (!solved) return null;

        // Create a copy to work with
        const puzzle = solved.map(row => [...row]);

        // Get difficulty settings
        const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
        const cellsToRemove = getRandomInt(settings.min, settings.max);

        // Randomly remove cells
        const removed = new Set();
        while (removed.size < cellsToRemove) {
            const row = getRandomInt(0, 8);
            const col = getRandomInt(0, 8);
            const key = `${row},${col}`;

            if (!removed.has(key)) {
                puzzle[row][col] = 0;
                removed.add(key);
            }
        }

        return puzzle;
    }

    /**
     * Generate multiple puzzles
     */
    function generatePuzzles(count = 10, difficulty = 'medium') {
        const puzzles = [];
        for (let i = 0; i < count; i++) {
            const puzzle = generatePuzzle(difficulty);
            if (puzzle) {
                puzzles.push(puzzle);
            }
        }
        return puzzles;
    }

    /**
     * Shuffle array (Fisher-Yates)
     */
    function shuffleArray(arr) {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Get random integer between min and max (inclusive)
     */
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Public API
    return {
        generatePuzzle,
        generatePuzzles,
        generateSolvedBoard
    };
})();
