class Player {
    constructor(id, x, y, w, h, index) {
        this.id = id;
        this.index = index; // Player's index for differentiating sprites
        this.position = createVector(x, y);
        this.width = w;
        this.height = h;
        this.color = color(255, 255, 255); // Default white color
        this.hp = 100; // Default health
        this.shield = 50; // Default shield value
        this.maxhealth = this.hp + this.shield;
        this.velocity = createVector(0, 0);

        // Determine sprite based on index
        const spriteImages = [playerLeft, playerRight];
        this.sprite = createSprite(x, y, w, h);
        this.sprite.addImage(spriteImages[index % spriteImages.length]);

        // Set initial sprite attributes
        this.sprite.scale = 0.5;
        this.sprite.shapeColor = this.color;
    }

    setVelocity(velX, velY) {
        this.velocity.set(velX, velY);
        this.sprite.setVelocity(velX, velY);
    }

    setColor(r, g, b) {
        this.color = color(r, g, b);
        this.sprite.shapeColor = this.color; // Update sprite color
    }

    checkBounds(width, height) {
        if (this.position.x < 0) this.position.x = 0;
        if (this.position.y < 0) this.position.y = 0;
        if (this.position.x > width) this.position.x = width;
        if (this.position.y > height) this.position.y = height;

        this.sprite.position.set(this.position.x, this.position.y);
    }

    remove() {
        this.sprite.remove();
    }
}