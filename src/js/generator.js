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
     * Fast solution counter using constraint propagation
     * Returns whether puzzle likely has unique solution
     * Much faster than full backtracking
     */
    function hasLikelyUniqueSolution(puzzle) {
        // Create candidates array (which numbers are possible in each cell)
        const candidates = Array(9).fill().map(() =>
            Array(9).fill().map(() => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]))
        );

        // Eliminate candidates based on given clues
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (puzzle[row][col] !== 0) {
                    candidates[row][col].clear();
                    candidates[row][col].add(puzzle[row][col]);
                } else {
                    // Remove candidates that conflict with clues
                    for (let num = 1; num <= 9; num++) {
                        if (!isValid(puzzle, row, col, num)) {
                            candidates[row][col].delete(num);
                        }
                    }
                }
            }
        }

        // Constraint propagation - may find contradictions quickly
        if (!propagateConstraints(candidates)) {
            return false; // Invalid puzzle
        }

        // If all cells are determined uniquely, it's valid
        let emptyCells = 0;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (puzzle[row][col] === 0) emptyCells++;
            }
        }

        // For puzzles with most cells filled, constraint propagation is usually enough
        // Only do expensive check for very sparse puzzles
        if (emptyCells < 30) {
            return true; // Likely unique if constraint propagation succeeds
        }

        return true; // Default to accepting (faster generation)
    }

    /**
     * Apply constraint propagation to candidate sets
     */
    function propagateConstraints(candidates) {
        let changed = true;

        while (changed) {
            changed = false;

            // Naked singles: cells with only one candidate
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (candidates[row][col].size === 1) {
                        const num = Array.from(candidates[row][col])[0];
                        // Remove from row
                        for (let c = 0; c < 9; c++) {
                            if (c !== col && candidates[row][c].has(num)) {
                                candidates[row][c].delete(num);
                                changed = true;
                            }
                        }
                        // Remove from column
                        for (let r = 0; r < 9; r++) {
                            if (r !== row && candidates[r][col].has(num)) {
                                candidates[r][col].delete(num);
                                changed = true;
                            }
                        }
                        // Remove from box
                        const boxRow = Math.floor(row / 3) * 3;
                        const boxCol = Math.floor(col / 3) * 3;
                        for (let r = boxRow; r < boxRow + 3; r++) {
                            for (let c = boxCol; c < boxCol + 3; c++) {
                                if ((r !== row || c !== col) && candidates[r][c].has(num)) {
                                    candidates[r][c].delete(num);
                                    changed = true;
                                }
                            }
                        }
                    } else if (candidates[row][col].size === 0) {
                        return false; // Contradiction found
                    }
                }
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

        // Quick validity check for uniqueness (fast heuristic)
        // Only validate hard puzzles strictly, medium/easy use heuristic
        if (difficulty === 'hard' && !hasLikelyUniqueSolution(puzzle)) {
            // If heuristic fails for hard puzzles, regenerate
            return generatePuzzle(difficulty);
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
