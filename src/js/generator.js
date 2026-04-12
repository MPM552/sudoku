// Sudoku Puzzle Generator
// Generates random valid Sudoku puzzles with configurable difficulty
// Uses backward generation with uniqueness verification

const PuzzleGenerator = (() => {
    const BOARD_SIZE = 9;
    const BOX_SIZE = 3;

    // Difficulty settings: target clue counts
    // Easy = old medium (solid, reliable puzzles)
    // Medium = requires hidden singles, not just single-candidate logic
    // Hard = requires advanced techniques, not just sparse clues
    const DIFFICULTY_SETTINGS = {
        easy:   { minClues: 30, maxClues: 36, minTechnique: 0 },
        medium: { minClues: 26, maxClues: 32, minTechnique: 1 },
        hard:   { minClues: 24, maxClues: 30, minTechnique: 2 }
    };

    // Multi-sample selection: how many candidates to generate before picking the best
    // Hard samples are more expensive, so we use fewer but filter by technique
    const SAMPLE_COUNTS = {
        easy: 5,
        medium: 8,
        hard: 8
    };

    // Maximum solutions to count before giving up (optimization: if we find this many, it's not unique)
    const MAX_SOLUTIONS_TO_CHECK = 2;

    /**
     * Generate a complete, solved Sudoku board
     */
    function generateSolvedBoard() {
        const board = Array(9).fill().map(() => Array(9).fill(0));
        fillBoard(board);
        return board;
    }

    /**
     * Fill board using backtracking with randomized number order
     */
    function fillBoard(board) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (board[row][col] === 0) {
                    const numbers = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);

                    for (let num of numbers) {
                        if (isValid(board, row, col, num)) {
                            board[row][col] = num;

                            if (fillBoard(board)) {
                                return true;
                            }

                            board[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
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
     * Count exact number of solutions using optimized backtracking with MRV ordering
     * Stops early once MAX_SOLUTIONS_TO_CHECK is reached
     * Uses a flat board array for maximum speed
     * MRV: picks cell with fewest valid options first for dramatic speedup
     */
    function countSolutions(puzzle) {
        const board = new Int8Array(81);
        for (let i = 0; i < 81; i++) {
            const r = Math.floor(i / 9), c = i % 9;
            board[i] = puzzle[r][c];
        }
        let solutionCount = 0;

        function solve() {
            if (solutionCount >= MAX_SOLUTIONS_TO_CHECK) return;

            // Find empty cell with fewest valid numbers (MRV)
            let bestIdx = -1, bestCount = 10;
            for (let i = 0; i < 81; i++) {
                if (board[i] === 0) {
                    let count = 0;
                    const r = Math.floor(i / 9), c = i % 9;
                    for (let num = 1; num <= 9; num++) {
                        if (isValidOnBoard(board, r, c, num)) count++;
                    }
                    if (count === 0) return; // Dead end
                    if (count < bestCount) {
                        bestCount = count;
                        bestIdx = i;
                        if (count === 1) break; // Can't do better
                    }
                }
            }

            if (bestIdx === -1) { solutionCount++; return; }

            const row = Math.floor(bestIdx / 9), col = bestIdx % 9;

            for (let num = 1; num <= 9; num++) {
                if (isValidOnBoard(board, row, col, num)) {
                    board[bestIdx] = num;
                    solve();
                    if (solutionCount >= MAX_SOLUTIONS_TO_CHECK) return;
                    board[bestIdx] = 0;
                }
            }
        }

        solve();
        return solutionCount;
    }

    /**
     * Check validity on a flat Int8Array board
     */
    function isValidOnBoard(board, row, col, num) {
        // Check row
        const rowStart = row * 9;
        for (let c = 0; c < 9; c++) {
            if (board[rowStart + c] === num) return false;
        }
        // Check column
        for (let r = 0; r < 9; r++) {
            if (board[r * 9 + col] === num) return false;
        }
        // Check box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let r = boxRow; r < boxRow + 3; r++) {
            for (let c = boxCol; c < boxCol + 3; c++) {
                if (board[r * 9 + c] === num) return false;
            }
        }
        return true;
    }

    /**
     * Check if a puzzle has exactly one unique solution
     */
    function hasUniqueSolution(puzzle) {
        return countSolutions(puzzle) === 1;
    }

    /**
     * Solve a puzzle and return the solution board (or null if not solvable)
     * Used for difficulty analysis
     */
    function solvePuzzle(puzzle) {
        const board = puzzle.map(row => [...row]);

        function solve() {
            let row = -1, col = -1;
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (board[r][c] === 0) {
                        row = r;
                        col = c;
                        break;
                    }
                }
                if (row !== -1) break;
            }

            if (row === -1) return true;

            for (let num = 1; num <= 9; num++) {
                if (isValid(board, row, col, num)) {
                    board[row][col] = num;
                    if (solve()) return true;
                    board[row][col] = 0;
                }
            }
            return false;
        }

        if (solve()) return board;
        return null;
    }

    /**
     * Analyze solving difficulty by simulating human-like solving techniques
     * Returns a difficulty score: 0 = very easy, higher = harder
     */
    function analyzeSolvingDifficulty(puzzle, solvedBoard) {
        let maxTechniqueNeeded = 0; // 0 = single-candidate only, 1 = hidden singles, 2 = pointing/claiming, 3+ = harder

        // Work with candidates
        const candidates = Array(9).fill().map(() =>
            Array(9).fill().map(() => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]))
        );

        // Initialize candidates from puzzle
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (puzzle[row][col] !== 0) {
                    candidates[row][col].clear();
                    candidates[row][col].add(puzzle[row][col]);
                } else {
                    for (let num = 1; num <= 9; num++) {
                        if (!isValid(puzzle, row, col, num)) {
                            candidates[row][col].delete(num);
                        }
                    }
                }
            }
        }

        let stepsNeedingMoreThanSingles = 0;
        let totalSteps = 0;
        let emptyCells = 0;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (puzzle[r][c] === 0) emptyCells++;
            }
        }

        // Simulate solving with single-candidate and hidden singles
        const workingPuzzle = puzzle.map(row => [...row]);

        while (true) {
            let progress = false;

            // Single-candidate: cells with only one candidate
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (workingPuzzle[row][col] === 0 && candidates[row][col].size === 1) {
                        const num = Array.from(candidates[row][col])[0];
                        workingPuzzle[row][col] = num;
                        eliminateCandidate(candidates, row, col, num);
                        progress = true;
                        totalSteps++;
                    }
                }
            }

            if (progress) continue;

            // Hidden singles: a number that can only go in one cell in a row/col/box
            let foundHidden = findHiddenSingles(workingPuzzle, candidates);
            if (foundHidden) {
                maxTechniqueNeeded = Math.max(maxTechniqueNeeded, 1);
                totalSteps++;
                continue;
            }

            // If we get here, no basic technique works
            // Check if puzzle is solved
            let solved = true;
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (workingPuzzle[r][c] === 0) {
                        solved = false;
                        break;
                    }
                }
                if (!solved) break;
            }

            if (solved) break;

            // Need more than basic techniques
            maxTechniqueNeeded = Math.max(maxTechniqueNeeded, 2);
            stepsNeedingMoreThanSingles++;
            break; // Can't simulate further without complex techniques
        }

        // Score based on technique needed and clue count
        const clueCount = countClues(puzzle);
        let score = maxTechniqueNeeded * 10 + stepsNeedingMoreThanSingles * 3;

        // Fewer clues = inherently harder
        if (clueCount < 25) score += 5;
        else if (clueCount < 30) score += 2;

        return { score, techniqueLevel: maxTechniqueNeeded, clueCount };
    }

    /**
     * Eliminate a candidate from a cell's peers
     */
    function eliminateCandidate(candidates, row, col, num) {
        // Remove from row
        for (let c = 0; c < 9; c++) {
            if (c !== col) candidates[row][c].delete(num);
        }
        // Remove from column
        for (let r = 0; r < 9; r++) {
            if (r !== row) candidates[r][col].delete(num);
        }
        // Remove from box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let r = boxRow; r < boxRow + 3; r++) {
            for (let c = boxCol; c < boxCol + 3; c++) {
                if (r !== row || c !== col) candidates[r][c].delete(num);
            }
        }
    }

    /**
     * Find hidden singles in the current state
     * Returns true if one was found and placed
     */
    function findHiddenSingles(puzzle, candidates) {
        // Check rows
        for (let row = 0; row < 9; row++) {
            for (let num = 1; num <= 9; num++) {
                let positions = [];
                for (let col = 0; col < 9; col++) {
                    if (puzzle[row][col] === 0 && candidates[row][col].has(num)) {
                        positions.push(col);
                    }
                }
                if (positions.length === 1) {
                    const col = positions[0];
                    puzzle[row][col] = num;
                    eliminateCandidate(candidates, row, col, num);
                    return true;
                }
            }
        }

        // Check columns
        for (let col = 0; col < 9; col++) {
            for (let num = 1; num <= 9; num++) {
                let positions = [];
                for (let row = 0; row < 9; row++) {
                    if (puzzle[row][col] === 0 && candidates[row][col].has(num)) {
                        positions.push(row);
                    }
                }
                if (positions.length === 1) {
                    const row = positions[0];
                    puzzle[row][col] = num;
                    eliminateCandidate(candidates, row, col, num);
                    return true;
                }
            }
        }

        // Check boxes
        for (let boxRow = 0; boxRow < 9; boxRow += 3) {
            for (let boxCol = 0; boxCol < 9; boxCol += 3) {
                for (let num = 1; num <= 9; num++) {
                    let positions = [];
                    for (let r = boxRow; r < boxRow + 3; r++) {
                        for (let c = boxCol; c < boxCol + 3; c++) {
                            if (puzzle[r][c] === 0 && candidates[r][c].has(num)) {
                                positions.push([r, c]);
                            }
                        }
                    }
                    if (positions.length === 1) {
                        const [row, col] = positions[0];
                        puzzle[row][col] = num;
                        eliminateCandidate(candidates, row, col, num);
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Count the number of clues (given cells) in a puzzle
     */
    function countClues(puzzle) {
        let count = 0;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (puzzle[row][col] !== 0) count++;
            }
        }
        return count;
    }

    /**
     * Generate a single puzzle using backward generation with uniqueness verification
     * Removes cells one at a time, verifying uniqueness after each removal
     * Uses symmetrical removal for visual quality
     */
    function generateSinglePuzzle(difficulty) {
        const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
        const targetClues = getRandomInt(settings.minClues, settings.maxClues);
        const cellsToRemove = 81 - targetClues;

        let solvedBoard;
        let puzzle;

        // Try to generate a puzzle; may need multiple attempts
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            attempts++;
            solvedBoard = generateSolvedBoard();
            puzzle = solvedBoard.map(row => [...row]);

            // Build symmetrical pairs + center
            const symPairs = [];
            const centerCells = [];
            const seen = new Set();

            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    const symRow = 8 - row;
                    const symCol = 8 - col;
                    if (row === symRow && col === symCol) {
                        centerCells.push([row, col]);
                    } else {
                        const key = `${row},${col}`;
                        const symKey = `${symRow},${symCol}`;
                        if (!seen.has(key) && !seen.has(symKey)) {
                            symPairs.push([[row, col], [symRow, symCol]]);
                            seen.add(key);
                            seen.add(symKey);
                        }
                    }
                }
            }

            shuffleArrayInPlace(symPairs);
            shuffleArrayInPlace(centerCells);

            let removed = 0;

            // Phase 1: Remove symmetrical pairs (both cells at once)
            for (const [[r1, c1], [r2, c2]] of symPairs) {
                if (removed + 2 > cellsToRemove) break;

                const val1 = puzzle[r1][c1];
                const val2 = puzzle[r2][c2];

                puzzle[r1][c1] = 0;
                puzzle[r2][c2] = 0;

                if (hasUniqueSolution(puzzle)) {
                    removed += 2;
                } else {
                    puzzle[r1][c1] = val1;
                    puzzle[r2][c2] = val2;
                }
            }

            // Phase 2: If we still need more removals, try individual cells
            // (including breaking symmetry for the remaining cells)
            if (removed < cellsToRemove) {
                // Collect all remaining filled cells
                const remaining = [];
                for (let row = 0; row < 9; row++) {
                    for (let col = 0; col < 9; col++) {
                        if (puzzle[row][col] !== 0) {
                            remaining.push([row, col]);
                        }
                    }
                }
                shuffleArrayInPlace(remaining);

                for (const [r, c] of remaining) {
                    if (removed >= cellsToRemove) break;

                    const val = puzzle[r][c];
                    puzzle[r][c] = 0;

                    if (hasUniqueSolution(puzzle)) {
                        removed++;
                    } else {
                        puzzle[r][c] = val;
                    }
                }
            }

            // Accept if we're close enough (within 1 cell of target)
            if (removed >= cellsToRemove - 1) {
                return { puzzle, solved: solvedBoard };
            }
        }

        // Fallback: return whatever we have
        return { puzzle, solved: solvedBoard };
    }

    /**
     * Score a puzzle for quality (higher = better)
     */
    function scorePuzzle(puzzle, difficulty) {
        const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
        const clueCount = countClues(puzzle);
        const targetMid = (settings.minClues + settings.maxClues) / 2;

        // Prefer clue counts near the middle of the target range
        const clueScore = 10 - Math.abs(clueCount - targetMid);

        // Check solving difficulty alignment
        const difficultyAnalysis = analyzeSolvingDifficulty(puzzle, null);

        let difficultyAlignment = 0;
        if (difficulty === 'easy') {
            // Easy: prefer technique level 0, high clue count
            difficultyAlignment = difficultyAnalysis.techniqueLevel === 0 ? 20 : 0;
        } else if (difficulty === 'medium') {
            // Medium: technique level 0-1 is fine
            difficultyAlignment = difficultyAnalysis.techniqueLevel <= 1 ? 15 : 5;
        } else {
            // Hard: prefer technique level 1+, fewer clues
            difficultyAlignment = difficultyAnalysis.techniqueLevel >= 1 ? 15 : 5;
            if (clueCount <= 25) difficultyAlignment += 10;
        }

        return clueScore + difficultyAlignment;
    }

    /**
     * Generate a puzzle with specified difficulty
     * Uses multi-sample selection: generates N candidates, picks the best
     * Enforces minimum technique threshold for the difficulty
     */
    function generatePuzzle(difficulty = 'medium') {
        const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
        const sampleCount = SAMPLE_COUNTS[difficulty] || SAMPLE_COUNTS.medium;
        const minTechnique = settings.minTechnique || 0;

        let bestPuzzle = null;
        let bestScore = -Infinity;

        for (let i = 0; i < sampleCount; i++) {
            const result = generateSinglePuzzle(difficulty);
            if (!result || !result.puzzle) continue;

            const analysis = analyzeSolvingDifficulty(result.puzzle, null);

            // Reject if technique level is below minimum
            if (analysis.techniqueLevel < minTechnique) continue;

            const score = scorePuzzle(result.puzzle, difficulty);
            if (score > bestScore) {
                bestScore = score;
                bestPuzzle = result.puzzle;
            }
        }

        // If no puzzle met the technique threshold, generate one more time
        // without filtering (guarantees we always return something)
        if (!bestPuzzle) {
            const result = generateSinglePuzzle(difficulty);
            if (result && result.puzzle) bestPuzzle = result.puzzle;
        }

        return bestPuzzle;
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
     * Shuffle array (Fisher-Yates) - returns new array
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
     * Shuffle array in place (Fisher-Yates)
     */
    function shuffleArrayInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
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
        generateSolvedBoard,
        // Exposed for testing
        hasUniqueSolution,
        countSolutions,
        countClues,
        analyzeSolvingDifficulty
    };
})();
