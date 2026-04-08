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
        backspaceBtn: null,
        newGameBtn: null,
        settingsBtn: null,
        numberPad: null,
        completionModal: null,
        settingsModal: null,
        bgColorPicker: null,
        closeSettingsBtn: null,
        resetSettingsBtn: null,
        notesToggleBtn: null
    };

    let selectedCell = null; // Track selected cell [row, col]
    let timerInterval = null;
    let notesMode = false; // Track if in notes entry mode

    /**
     * Initialize all DOM elements and event listeners
     */
    function init() {
        Game.initializePuzzleCache(); // Generate puzzle cache on startup
        cacheElements();
        attachEventListeners();
        loadBackgroundColor(); // Load saved background color
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
            backspaceBtn: document.getElementById('backspaceBtn'),
            newGameBtn: document.getElementById('newGameBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            numberPad: document.querySelector('.number-pad'),
            completionModal: document.getElementById('completionModal'),
            playAgainBtn: document.getElementById('playAgainBtn'),
            newPuzzleBtn: document.getElementById('newPuzzleBtn'),
            completionTime: document.getElementById('completionTime'),
            settingsModal: document.getElementById('settingsModal'),
            bgColorPicker: document.getElementById('bgColorPicker'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            resetSettingsBtn: document.getElementById('resetSettingsBtn'),
            notesToggleBtn: document.getElementById('notesToggleBtn')
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
                if (num === 'backspace') {
                    handleBackspace();
                } else {
                    handleNumberInput(parseInt(num));
                }
            });
        });

        // Control buttons
        elements.undoBtn.addEventListener('click', handleUndo);
        elements.backspaceBtn.addEventListener('click', handleBackspace);
        elements.newGameBtn.addEventListener('click', showPuzzlePicker);
        elements.settingsBtn.addEventListener('click', showSettings);
        elements.notesToggleBtn.addEventListener('click', toggleNotesMode);

        // Settings modal
        elements.closeSettingsBtn.addEventListener('click', hideSettings);
        elements.resetSettingsBtn.addEventListener('click', resetBackgroundColor);
        elements.bgColorPicker.addEventListener('change', (e) => {
            const color = e.target.value;
            setBackgroundColor(color);
            localStorage.setItem('sudokuBgColor', color);
        });

        // Preset color buttons
        document.querySelectorAll('.preset-color').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                elements.bgColorPicker.value = color;
                setBackgroundColor(color);
                localStorage.setItem('sudokuBgColor', color);
            });
        });
        elements.playAgainBtn.addEventListener('click', () => {
            hideSwitchableModals();
            Game.reset();
            renderBoard();
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
     * Handle backspace/clear action
     */
    function handleBackspace() {
        if (!selectedCell || Game.getState().isComplete) return;

        if (notesMode) {
            Game.clearNotes(selectedCell[0], selectedCell[1]);
        } else {
            Game.clearCell(selectedCell[0], selectedCell[1]);
        }
        updateBoard();
        updateUI(); // Update button state after clear
        
        // Refresh highlights after clearing
        clearNumberHighlights();
        highlightMatchingNumbers(selectedCell[0], selectedCell[1]);
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
            handleBackspace();
            return;
        }
    }

    /**
     * Toggle notes mode on/off
     */
    function toggleNotesMode() {
        notesMode = !notesMode;
        elements.notesToggleBtn.style.opacity = notesMode ? '1' : '0.6';
        elements.notesToggleBtn.style.fontWeight = notesMode ? 'bold' : 'normal';
    }

    /**

     * Handle number pad or keyboard number input
     */
    function handleNumberInput(num) {
        if (!selectedCell) return;
        
        const [row, col] = selectedCell;
        
        // Don't allow input in locked cells
        if (Game.getCell(row, col).isLocked) return;

        if (notesMode) {
            // Handle notes mode
            const currentNotes = Game.getNotes(row, col);
            if (currentNotes.includes(num)) {
                Game.removeNote(row, col, num);
            } else {
                Game.addNote(row, col, num);
            }
        } else {
            // Handle normal mode
            Game.setCell(row, col, num);
        }

        updateBoard();
        
        // Refresh number highlights with newly entered value
        clearNumberHighlights();
        highlightMatchingNumbers(row, col);

        updateUI(); // Update button states after move

        // Check if solved (only in normal mode)
        if (!notesMode && Game.isSolved()) {
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

        // Refresh highlights after undo
        if (selectedCell) {
            clearNumberHighlights();
            highlightMatchingNumbers(selectedCell[0], selectedCell[1]);
        }
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
        notesMode = false; // Reset notes mode for new game
        elements.notesToggleBtn.style.opacity = '0.6';
        elements.notesToggleBtn.style.fontWeight = 'normal';
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
        } else if (gameCell.notes.length > 0) {
            // Create a container for notes
            const notesContainer = document.createElement('div');
            notesContainer.className = 'cell-notes';
            gameCell.notes.forEach(note => {
                const noteEl = document.createElement('span');
                noteEl.className = 'note';
                noteEl.textContent = note;
                notesContainer.appendChild(noteEl);
            });
            cell.appendChild(notesContainer);
        }

        cell.addEventListener('click', () => selectCell(row, col));

        return cell;
    }

    /**
     * Select a cell (highlight it)
     */
    function selectCell(row, col) {
        if (Game.getState().isComplete) return;

        // Deselect previous
        if (selectedCell) {
            const oldCell = elements.gameBoard.querySelector(
                `[data-row="${selectedCell[0]}"][data-col="${selectedCell[1]}"]`
            );
            if (oldCell) oldCell.classList.remove('selected');
            // Clear previous highlights
            clearNumberHighlights();
        }

        // Select new
        selectedCell = [row, col];
        const newCell = elements.gameBoard.querySelector(
            `[data-row="${row}"][data-col="${col}"]`
        );
        if (newCell) newCell.classList.add('selected');

        // Highlight all cells with matching number (works for locked and unlocked cells)
        highlightMatchingNumbers(row, col);
        
        // Update button states based on selected cell
        updateUI();
    }

    /**
     * Highlight all cells with the same number as the selected cell
     */
    function highlightMatchingNumbers(row, col) {
        const selectedValue = Game.getCell(row, col).value;
        if (selectedValue === 0) return; // Don't highlight if cell is empty

        const cells = elements.gameBoard.querySelectorAll('.sudoku-cell');
        cells.forEach(cellEl => {
            const cellRow = parseInt(cellEl.dataset.row);
            const cellCol = parseInt(cellEl.dataset.col);
            const cellValue = Game.getCell(cellRow, cellCol).value;

            if (cellValue === selectedValue) {
                cellEl.classList.add('matching');
            }
        });
    }

    /**
     * Clear all number highlights
     */
    function clearNumberHighlights() {
        const cells = elements.gameBoard.querySelectorAll('.sudoku-cell');
        cells.forEach(cellEl => {
            cellEl.classList.remove('matching');
        });
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

            // Clear cell content completely
            cellEl.innerHTML = '';

            // Update value or notes
            if (gameCell.value !== 0) {
                cellEl.textContent = gameCell.value;
            } else if (gameCell.notes.length > 0) {
                // Display notes only when cell has no value
                const notesContainer = document.createElement('div');
                notesContainer.className = 'cell-notes';
                gameCell.notes.forEach(note => {
                    const noteEl = document.createElement('span');
                    noteEl.className = 'note';
                    noteEl.textContent = note;
                    notesContainer.appendChild(noteEl);
                });
                cellEl.appendChild(notesContainer);
            }
            // If no value and no notes, cell remains empty

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
     * Show settings modal
     */
    function showSettings() {
        elements.settingsModal.classList.remove('hidden');
        elements.settingsModal.classList.add('active');
        
        // Load current color in picker
        const savedColor = localStorage.getItem('sudokuBgColor');
        if (savedColor) {
            elements.bgColorPicker.value = savedColor;
        }
    }

    /**
     * Hide settings modal
     */
    function hideSettings() {
        elements.settingsModal.classList.add('hidden');
        elements.settingsModal.classList.remove('active');
    }

    /**
     * Set the background color of the page
     */
    function setBackgroundColor(color) {
        document.body.style.backgroundColor = color;
    }

    /**
     * Reset background color to default
     */
    function resetBackgroundColor() {
        const defaultColor = '#f5f5f5';
        elements.bgColorPicker.value = defaultColor;
        setBackgroundColor(defaultColor);
        localStorage.removeItem('sudokuBgColor');
    }

    /**
     * Load saved background color from localStorage
     */
    function loadBackgroundColor() {
        const savedColor = localStorage.getItem('sudokuBgColor');
        if (savedColor) {
            setBackgroundColor(savedColor);
            elements.bgColorPicker.value = savedColor;
        }
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
