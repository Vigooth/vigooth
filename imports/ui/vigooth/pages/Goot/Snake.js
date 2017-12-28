import _ from 'lodash';
import './Goot.scss';

const c = createjs;

class Snake {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    const defaults = {
      color: 'DeepSkyBlue',
      width: 10,
      height: 10,
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
  kill(target) {
    const { awards } = target;
    console.log(awards);
  }
  move(direction) {
    this.x = this.x + (this.settings.width * direction[0]);
    this.y = this.y + (this.settings.height * direction[1]);
  }
}


export default Snake;
