// UI Module - DOM Interactions and Rendering
const UI = (() => {
    // DOM element refs
    let elements = {
        puzzlePickerModal: null,
        gameView: null,
        gameBoard: null,
        difficultyDisplay: null,
        timerDisplay: null,
        undoBtn: null,
        newGameBtn: null,
        numberPad: null,
        completionModal: null
    };

    let selectedCell = null; // Track selected cell [row, col]
    let timerInterval = null;

    /**
     * Initialize all DOM elements and event listeners
     */
    function init() {
        Game.initializePuzzleCache(); // Generate puzzle cache on startup
        cacheElements();
        attachEventListeners();
    }

    /**
     * Cache DOM elements for performance
     */
    function cacheElements() {
        elements = {
            puzzlePickerModal: document.getElementById('puzzlePickerModal'),
            gameView: document.getElementById('gameView'),
            gameBoard: document.getElementById('gameBoard'),
            difficultyDisplay: document.getElementById('difficultyDisplay'),
            timerDisplay: document.getElementById('timerDisplay'),
            undoBtn: document.getElementById('undoBtn'),
            newGameBtn: document.getElementById('newGameBtn'),
            numberPad: document.querySelector('.number-pad'),
            completionModal: document.getElementById('completionModal'),
            playAgainBtn: document.getElementById('playAgainBtn'),
            newPuzzleBtn: document.getElementById('newPuzzleBtn'),
            completionTime: document.getElementById('completionTime')
        };
    }

    /**
     * Attach all event listeners
     */
    function attachEventListeners() {
        // Difficulty picker
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const difficulty = e.target.dataset.difficulty;
                startGame(difficulty);
            });
        });

        // Number pad
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const num = e.target.dataset.number;
                if (num === 'undo') {
                    handleUndo();
                } else {
                    handleNumberInput(parseInt(num));
                }
            });
        });

        // Control buttons
        elements.undoBtn.addEventListener('click', handleUndo);
        elements.newGameBtn.addEventListener('click', showPuzzlePicker);

        // Completion modal
        elements.playAgainBtn.addEventListener('click', () => {
            hideSwitchableModals();
            renderBoard();
            Game.reset();
            updateUI();
        });

        elements.newPuzzleBtn.addEventListener('click', () => {
            hideSwitchableModals();
            showPuzzlePicker();
        });

        // Keyboard input
        document.addEventListener('keydown', handleKeyboardInput);
    }

    /**
     * Handle keyboard input (1-9 for numbers, Backspace for delete)
     */
    function handleKeyboardInput(e) {
        if (!selectedCell || Game.getState().isComplete) return;

        const num = parseInt(e.key);
        
        // Only allow 1-9 (strictly no 0)
        if (num >= 1 && num <= 9) {
            e.preventDefault();
            handleNumberInput(num);
            return;
        }

        // Backspace or Delete to clear
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            Game.clearCell(selectedCell[0], selectedCell[1]);
            updateBoard();
            updateUI(); // Update button state after clear
            return;
        }
    }

    /**
     * Handle number pad or keyboard number input
     */
    function handleNumberInput(num) {
        if (!selectedCell) return;

        const [row, col] = selectedCell;
        Game.setCell(row, col, num);
        updateBoard();
        updateUI(); // Update button states after move

        // Check if solved
        if (Game.isSolved()) {
            Game.markComplete();
            showCompletion();
        }
    }

    /**
     * Handle undo button click
     */
    function handleUndo() {
        const state = Game.getState();
        if (!state.canUndo || state.isComplete) return;

        Game.undo();
        updateBoard();
        updateUI(); // Update button state after undo
    }

    /**
     * Show puzzle picker modal
     */
    function showPuzzlePicker() {
        Game.stopTimer();
        selectedCell = null;
        elements.puzzlePickerModal.classList.add('active');
        elements.gameView.classList.add('hidden');
        hideSwitchableModals();
    }

    /**
     * Hide switchable modals (completion modal)
     */
    function hideSwitchableModals() {
        elements.completionModal.classList.add('hidden');
        elements.completionModal.classList.remove('active');
    }

    /**
     * Hide puzzle picker and show game view
     */
    function hidePickerShowGame() {
        elements.puzzlePickerModal.classList.remove('active');
        elements.gameView.classList.remove('hidden');
        hideSwitchableModals();
    }

    /**
     * Start a new game with selected difficulty
     */
    function startGame(difficulty) {
        Game.init(difficulty);
        hidePickerShowGame();
        renderBoard();
        updateUI();
        startTimerDisplay();
    }

    /**
     * Render the entire board
     */
    function renderBoard() {
        selectedCell = null;
        elements.gameBoard.innerHTML = '';
        const state = Game.getState();

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = createCellElement(row, col);
                elements.gameBoard.appendChild(cell);
            }
        }

        // Enforce square aspect ratio (fixes intermittent crunching)
        enforceSquareGrid();
    }

    /**
     * Force grid to maintain perfect square aspect ratio
     */
    function enforceSquareGrid() {
        requestAnimationFrame(() => {
            const width = elements.gameBoard.getBoundingClientRect().width;
            elements.gameBoard.style.height = width + 'px';
        });
    }

    /**
     * Create a single cell DOM element
     */
    function createCellElement(row, col) {
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        const gameCell = Game.getCell(row, col);

        if (gameCell.isLocked) {
            cell.classList.add('locked');
        }

        if (gameCell.value !== 0) {
            cell.textContent = gameCell.value;
        }

        cell.addEventListener('click', () => selectCell(row, col));

        return cell;
    }

    /**
     * Select a cell (highlight it)
     */
    function selectCell(row, col) {
        if (Game.getState().isComplete) return;
        if (Game.getCell(row, col).isLocked) return;

        // Deselect previous
        if (selectedCell) {
            const oldCell = elements.gameBoard.querySelector(
                `[data-row="${selectedCell[0]}"][data-col="${selectedCell[1]}"]`
            );
            if (oldCell) oldCell.classList.remove('selected');
        }

        // Select new
        selectedCell = [row, col];
        const newCell = elements.gameBoard.querySelector(
            `[data-row="${row}"][data-col="${col}"]`
        );
        if (newCell) newCell.classList.add('selected');
    }

    /**
     * Update the entire board display
     */
    function updateBoard() {
        const cells = elements.gameBoard.querySelectorAll('.sudoku-cell');
        cells.forEach(cellEl => {
            const row = parseInt(cellEl.dataset.row);
            const col = parseInt(cellEl.dataset.col);
            const gameCell = Game.getCell(row, col);

            // Update text content
            cellEl.textContent = gameCell.value !== 0 ? gameCell.value : '';

            // Update conflict highlighting
            if (gameCell.value !== 0 && gameCell.hasConflict) {
                cellEl.classList.add('conflict');
            } else {
                cellEl.classList.remove('conflict');
            }
        });
    }

    /**
     * Update UI elements (difficulty, timer, buttons)
     */
    function updateUI() {
        const state = Game.getState();
        elements.difficultyDisplay.textContent = state.difficulty.charAt(0).toUpperCase() + state.difficulty.slice(1);
        elements.undoBtn.disabled = !state.canUndo || state.isComplete;

        // Update timer
        updateTimerDisplay();
    }

    /**
     * Start the timer display update interval
     */
    function startTimerDisplay() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(updateTimerDisplay, 100);
    }

    /**
     * Update the timer display
     */
    function updateTimerDisplay() {
        elements.timerDisplay.textContent = Game.getTimeString();
    }

    /**
     * Show completion modal
     */
    function showCompletion() {
        elements.completionTime.textContent = Game.getTimeString();
        elements.completionModal.classList.remove('hidden');
        elements.completionModal.classList.add('active'); // Make modal visible
    }

    /**
     * Cleanup (remove event listeners, clear intervals)
     */
    function cleanup() {
        if (timerInterval) clearInterval(timerInterval);
        document.removeEventListener('keydown', handleKeyboardInput);
    }

    // Public API
    return {
        init,
        startGame,
        cleanup
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
