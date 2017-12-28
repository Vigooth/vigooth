import React, { Component } from 'react';
import { Row, Button } from 'react-bootstrap';
import Snake from './Snake';
import PrisonGuard from './PrisonGuard';
import './Goot.scss';
import _ from 'lodash';

const c = createjs;
function multArray(arr1, arr2) {
  return _.map(arr1, (number, index) => arr2[index] * number);
}
class Goot extends Component {
  constructor(props) {
    super(props);
    this.direction = [1, 0];
    this.state = {
      speed: 1,
      width: 300,
      height: 300,
      interval: 200,
      direction: [1, 0],
    }
    this.start = this.start.bind(this);
    this.game = this.game.bind(this);
    this.setDirection = this.setDirection.bind(this);
    this.keyPush = this.keyPush.bind(this);
  }

  componentWillMount() {
    this.snake = new Snake(200, 150, { color: 'yellow' });
    this.prisonGuard = new PrisonGuard(250, 150, { color: 'red' });
    this.prisonGuard2 = new PrisonGuard(200, 50, { color: 'red' });
  }
  componentDidMount() {
    this.stage = new c.Stage(this.canvas);
  }
  setDirection(arr) {
    this.setState({ direction: arr });
  }
  keyPush(event) {
    if (event.keyCode === 37) { console.log('SNAKE MOVED LEFT'); this.setDirection([-1, 0]); }
    if (event.keyCode === 38) { console.log('SNAKE MOVED TOP'); this.setDirection([0, -1]); }
    if (event.keyCode === 39) { console.log('SNAKE MOVED RIGHT'); this.setDirection([1, 0]); }
    if (event.keyCode === 40) { console.log('SNAKE MOVED DOWN'); this.setDirection([0, 1]); }

    if (event.defaultPrevented) {
      console.log('cc');
    }
  }
  start() {
    this.setState({ speed: this.state.speed + 50 })
    window.addEventListener('keydown', this.keyPush)
    setInterval(this.game, this.state.interval);
  }
  rules() {
    //  Ne peut pas sortir de la map
    if (
      ((this.state.direction[0] === 1)
        && (this.snake.x >= this.state.width - this.snake.settings.width))
      ||
      ((this.state.direction[0] === -1)
        && (this.snake.x <= 0))
    ) {
      this.setDirection([0, 0]);
    }
    if (
      ((this.state.direction[1] === 1)
        && (this.snake.y >= this.state.height - this.snake.settings.height))
      ||
      ((this.state.direction[1] === -1) && (this.snake.y <= 0))
    ) {
      this.setDirection([0, 0]);
    }
    const snakePos = { x: this.snake.x, y: this.snake.y };
    if (_.find(this.prisonGuard.settings.gun.bullets, snakePos)) {
      console.log('DEAD');
    }
    if (_.find([{ x: this.prisonGuard.x, y: this.prisonGuard.y }], snakePos)) {
      this.snake.kill(this.prisonGuard);
      this.prisonGuard.dead();
      console.log('PRISONGUARD DEAD');
    }
  }
  game() {
    this.stage.removeAllChildren();
    this.rules();

    this.snake.move(this.state.direction);
    this.stage.addChild(this.snake.paint());
    this.stage.addChild(this.prisonGuard2.shoot());
    this.stage.addChild(this.prisonGuard2.paint());

    if (this.prisonGuard.status !== 'dead') {
      this.stage.addChild(this.prisonGuard.shoot());
      this.stage.addChild(this.prisonGuard.paint());
    }
    this.stage.update();
    console.log(this.prisonGuard);
  }
  render() {
    console.log(this.state.speed);

    return (
      <div className="Home crt">
        <center><h1 className="container-title">Home</h1></center>
        <Row>
          <h1>Bonsoir</h1>
          <Button onClick={this.start}>START</Button>
          <canvas
            ref={(ref) => { this.canvas = ref; }}
            id="canvas-goot"
            width={this.state.width}
            height={this.state.height}
          />
        </Row>
      </div>
    );
  }
}

export default Goot;
