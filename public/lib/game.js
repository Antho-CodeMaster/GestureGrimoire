class Game {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.players = {};
        this.numPlayers = 0;
        this.colliders = new Group();
        this.ripples = new Ripples();
    }

    add(id, x, y, w, h) {
        console.log("Adding player:", id, x, y, w, h);
        const player = new Player(id, x, y, w, h, this.numPlayers);
        this.players[id] = player;
        this.colliders.add(player.sprite);
        this.numPlayers++;
        savePlayerData(player, id);
    }

    draw() {
        this.checkBounds();
        this.ripples.draw();
        drawSprites();
    }

    remove(id) {
        if (this.players[id]) {
            this.players[id].remove();
            delete this.players[id];
            this.numPlayers--;
        }
    }

    setColor(id, r, g, b) {
        if (this.players[id]) {
            this.players[id].setColor(r, g, b);
        }
    }

    setVelocity(id, velX, velY) {
        if (this.players[id]) {
            this.players[id].setVelocity(velX, velY);
        }
    }

    checkBounds() {
        for (let id in this.players) {
            this.players[id].checkBounds(this.w, this.h);
        }
    }

    checkId(id) {
        // Check if player exists in the game
        return id in this.players;
    }

    printPlayerIds(x, y) {
        push();
        noStroke();
        fill(255);
        textSize(16);
        text(`# players: ${this.numPlayers}`, x, y);
        y += 16;

        for (let id in this.players) {
            fill(200);
            text(this.players[id].id, x, y);
            y += 16;
        }
        pop();
    }

    createRipple(id, r, duration) {
        this.ripples.add(
            this.players[id].position.x,
            this.players[id].position.y,
            r,
            duration,
            this.players[id].color);
    }
}
