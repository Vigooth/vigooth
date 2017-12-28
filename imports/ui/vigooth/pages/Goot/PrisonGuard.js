import _ from 'lodash';
import './Goot.scss';
import Gun from './Guns';
const c = createjs;

class PrisonGuard {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.status = 'alive';
    const defaults = {
      color: 'red',
      width: 10,
      height: 10,
      gun: new Gun('pistolet'),
      awards: 2,
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
  move(direction) {
    this.x = this.x + (this.settings.width * direction[0]);
    this.y = this.y + (this.settings.height * direction[1]);
  }
  shoot() {
    return this.settings.gun.shoot(this.x, this.y);
  }
  dead() {
    this.status = 'dead';
  }
}

export default PrisonGuard;
