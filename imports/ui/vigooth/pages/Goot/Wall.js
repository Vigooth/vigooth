import _ from 'lodash';
import './Goot.scss';
const c = createjs;

class Wall {
  constructor(coord, options = {}) {
    this.coord = coord;
    const defaults = {
      color: 'red',
      width: 10,
      height: 10,
    };
    this.settings = _.assign({}, defaults, options);
  }

  paint() {
    const circle = new c.Shape();
    circle.graphics
      .beginFill(this.settings.color)
      .drawRect(this.coord[0].x, this.coord[0].y, this.coord[1].x, this.coord[1].y)
      .beginFill('green')
      .drawRect(this.coord[1].x, this.coord[1].y, this.coord[2].x, this.coord[2].y)
    return circle;
  }
  dead() {
    this.status = 'dead';
  }
}

export default Wall;
