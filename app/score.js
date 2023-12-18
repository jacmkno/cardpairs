class ScoreKeeper {
    constructor(storageKey = 'gameScores', initialGame = 'default') {
        this.storageKey = storageKey;
        this.scores = this.loadScores();
        this.setGame(initialGame); // Set initial game from the constructor
    }

    setGame(gameName) {
        if (!gameName) {
            throw new Error("Invalid game name");
        }
        this._currentGame = gameName;
        if (!this.scores[this._currentGame]) {
            this.scores[this._currentGame] = 0;
        }
    }

    getGame() {
        return this._currentGame;
    }

    increase(amount) {
        this.scores[this._currentGame] = (this.scores[this._currentGame] || 0) + amount;
        this.saveScores();
    }

    getScore() {
        return this.scores[this._currentGame] || 0;
    }

    resetScore() {
        this.scores[this._currentGame] = 0;
        this.saveScores();
    }

    loadScores() {
        const scoresString = localStorage.getItem(this.storageKey);
        return scoresString ? JSON.parse(scoresString) : {};
    }

    saveScores() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.scores));
    }
}
