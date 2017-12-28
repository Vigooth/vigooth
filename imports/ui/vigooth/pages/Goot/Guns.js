import _ from 'lodash';
import './Goot.scss';

const c = createjs;

class Guns {
  constructor(x, y, options = {}) {
    this.name = 'pistolet';
    this.bullets = [];
    this.timer = 0;

    const defaults = {
      color: 'red',
      width: 10,
      height: 10,
      intervalShoot: 2,
    };
    this.settings = _.assign({}, defaults, options);
  }

  paint() {
    const circle = new c.Shape();
    circle.graphics
      .beginFill(this.settings.color)
      .drawRect(this.x, this.y, this.settings.width, this.settings.height);
    return circle;
  }
  shoot(x, y) {
    console.log(this.timer)
    if (this.timer % 10 === 0) {
      if (this.bullets.length === 4) {
        this.bullets = _.initial(this.bullets);
      }
      this.bullets = [{ x, y }, ...this.bullets];
      console.log(this.bullets);
      console.log(x, y);
    }
    const circle = new c.Shape();
    _.forEach(this.bullets, (bullet, i) => {
      this.bullets[i] = { x: bullet.x, y: bullet.y + 5 };
      circle.graphics
        .beginFill('rgba(255,255,0,1)')
        .drawRect(this.bullets[i].x, this.bullets[i].y, 5, 5);
    });
    this.timer = this.timer + 1;

    return circle;
  }
}

export default Guns;
