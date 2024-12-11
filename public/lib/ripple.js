class Ripples {
    constructor() {
        this.ripples = [];
    }

    add(x, y, r, duration, rcolor) {
        this.ripples.push(new Ripple(x, y, r, duration, rcolor));
    }

    draw() {
        for (let i = 0; i < this.ripples.length; i++) {
            if (this.ripples[i].draw()) {
                this.ripples.splice(i, 1);
            }
        }
    }
}
  
class Ripple {
    constructor(x, y, r, duration, rcolor) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.stroke = rcolor || color(255);
        this.strokeWeight = 3;
        this.duration = duration;
        this.startTime = millis();
        this.endTime = this.startTime + this.duration;
    }

    draw() {
        let progress = (this.endTime - millis()) / this.duration;
        let r = this.r * (1 - progress);

        push();
        stroke(red(this.stroke), green(this.stroke), blue(this.stroke), 255 * progress);
        strokeWeight(this.strokeWeight);
        fill(0, 0);
        ellipse(this.x, this.y, r);
        pop();

        if (millis() > this.endTime) {
            return true;
        }

        return false;
    }
}