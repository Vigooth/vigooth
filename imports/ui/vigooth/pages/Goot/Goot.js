import React from 'react';
import { Row, Col, FormGroup, ControlLabel, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Meteor } from 'meteor/meteor';
import Snake from './Snake'
import { Bert } from 'meteor/themeteorchef:bert';
import ReactDOM from "react-dom";
import './Goot.scss'
let c = createjs;
var draw = function(ctx) {
  ctx.save();
  ctx.translate(0,0);
  ctx.translate(0,0);
  ctx.translate(0,0);
  ctx.scale(0,0);
  ctx.translate(0,0);
  ctx.strokeStyle = 'rgba(0,0,0,0)';
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 4;
  ctx.save();
  ctx.save();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(288.188,61.901);
  ctx.bezierCurveTo(277.01099999999997,69.85600000000001,263.683,74.162,249.685,74.162);
  ctx.bezierCurveTo(235.688,74.162,222.358,69.85600000000001,211.18,61.90100000000001);
  ctx.bezierCurveTo(210.555,64.69100000000002,210.214,67.58900000000001,210.214,70.56700000000001);
  ctx.bezierCurveTo(210.214,92.36600000000001,227.885,110.037,249.684,110.037);
  ctx.bezierCurveTo(271.483,110.037,289.154,92.36600000000001,289.154,70.56700000000001);
  ctx.bezierCurveTo(289.154,67.588,288.814,64.691,288.188,61.901);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.save();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(264.111,264.671);
  ctx.bezierCurveTo(263.046,269.087,261.188,273.389,258.48,277.364);
  ctx.bezierCurveTo(248.26000000000002,292.36699999999996,228.83900000000003,298.361,211.806,291.304);
  ctx.bezierCurveTo(210.28,292.34,197.83700000000002,300.798,197.83700000000002,300.798);
  ctx.bezierCurveTo(197.83700000000002,300.798,197.41600000000003,316.321,197.442,487.802);
  ctx.bezierCurveTo(197.442,501.166,208.276,512.001,221.64100000000002,512.001);
  ctx.bezierCurveTo(235.00600000000003,512.001,245.84000000000003,501.167,245.84000000000003,487.80199999999996);
  ctx.lineTo(245.84000000000003,305.129);
  ctx.lineTo(253.01800000000003,305.129);
  ctx.lineTo(253.01800000000003,487.8);
  ctx.bezierCurveTo(253.01800000000003,501.164,263.85200000000003,511.999,277.21700000000004,511.999);
  ctx.bezierCurveTo(290.58200000000005,511.999,301.41600000000005,501.165,301.41600000000005,487.8);
  ctx.bezierCurveTo(301.41600000000005,485.45300000000003,301.41600000000005,254.02300000000002,301.41600000000005,251.669);
  ctx.lineTo(264.111,264.671);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.save();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(394.313,219.881);
  ctx.lineTo(369.803,209.72);
  ctx.lineTo(340.424,219.959);
  ctx.bezierCurveTo(341.47799999999995,226.905,338.923,233.842,333.89599999999996,238.493);
  ctx.lineTo(378.86799999999994,257.137);
  ctx.bezierCurveTo(389.16399999999993,261.404,400.95599999999996,256.513,405.21899999999994,246.232);
  ctx.bezierCurveTo(409.483,235.944,404.601,224.146,394.313,219.881);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.save();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(301.013,32.377);
  ctx.bezierCurveTo(300.87399999999997,30.973000000000003,300.113,29.704,298.938,28.92);
  ctx.lineTo(260.513,3.281);
  ctx.bezierCurveTo(253.95699999999997,-1.0939999999999999,245.41299999999998,-1.0939999999999999,238.85599999999997,3.281);
  ctx.lineTo(200.43099999999998,28.919999999999998);
  ctx.bezierCurveTo(197.95899999999997,30.569,197.61299999999997,34.073,199.71399999999997,36.173);
  ctx.lineTo(210.38999999999996,46.849000000000004);
  ctx.bezierCurveTo(221.24099999999996,57.7,235.46299999999997,63.125,249.68499999999995,63.125);
  ctx.bezierCurveTo(263.9069999999999,63.125,278.12799999999993,57.7,288.97999999999996,46.849000000000004);
  ctx.bezierCurveTo(300.415,35.413,301.298,35.253,301.013,32.377);
  ctx.closePath();
  ctx.moveTo(249.685,44.065);
  ctx.bezierCurveTo(243.041,44.065,237.523,26.691999999999997,237.523,26.691999999999997);
  ctx.bezierCurveTo(244.239,19.975999999999996,255.13,19.975999999999996,261.846,26.691999999999997);
  ctx.bezierCurveTo(261.847,26.692,256.329,44.065,249.685,44.065);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.save();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(171.95,265.163);
  ctx.lineTo(110.96799999999999,286.288);
  ctx.bezierCurveTo(104.877,288.411,101.65899999999999,295.07,103.78099999999999,301.163);
  ctx.lineTo(112.544,326.309);
  ctx.bezierCurveTo(115.079,333.586,123.82,336.42100000000005,130.14,332.12600000000003);
  ctx.lineTo(200.27599999999998,284.45900000000006);
  ctx.lineTo(171.95,265.163);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.save();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(408.378,174.069);
  ctx.bezierCurveTo(406.77299999999997,169.463,401.738,167.03199999999998,397.135,168.637);
  ctx.lineTo(384.615,173);
  ctx.lineTo(382.072,165.704);
  ctx.bezierCurveTo(380.467,161.098,375.432,158.667,370.829,160.27200000000002);
  ctx.bezierCurveTo(366.224,161.877,363.79200000000003,166.91000000000003,365.397,171.51500000000001);
  ctx.lineTo(367.94,178.811);
  ctx.lineTo(245.209,221.584);
  ctx.lineTo(248.30100000000002,223.69);
  ctx.bezierCurveTo(258.048,230.32999999999998,263.791,240.644,264.956,251.519);
  ctx.lineTo(322.593,231.43200000000002);
  ctx.bezierCurveTo(327.19800000000004,229.82700000000003,329.629,224.794,328.02500000000003,220.18800000000002);
  ctx.bezierCurveTo(326.773,216.596,323.434,214.33800000000002,319.841,214.27300000000002);
  ctx.lineTo(402.946,185.31100000000004);
  ctx.bezierCurveTo(407.551,183.707,409.983,178.673,408.378,174.069);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.save();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(347.939,167.457);
  ctx.bezierCurveTo(347.812,142.11599999999999,327.09200000000004,121.499,301.75,121.499);
  ctx.bezierCurveTo(281.551,121.499,224.486,121.499,204.21800000000002,121.499);
  ctx.bezierCurveTo(186.96500000000003,121.499,170.95000000000002,130.817,162.425,145.817);
  ctx.bezierCurveTo(144.59500000000003,177.18200000000002,152.30700000000002,163.613,134.52,194.905);
  ctx.bezierCurveTo(129.329,204.036,132.018,215.623,140.699,221.537);
  ctx.lineTo(215.20000000000002,272.284);
  ctx.bezierCurveTo(224.401,278.553,236.948,276.175,243.21800000000002,266.96999999999997);
  ctx.bezierCurveTo(249.48700000000002,257.765,247.109,245.21999999999997,237.90400000000002,238.95099999999996);
  ctx.lineTo(178.77100000000002,198.67199999999997);
  ctx.lineTo(198.77700000000002,164.06999999999996);
  ctx.lineTo(198.77700000000002,189.95799999999997);
  ctx.lineTo(232.721,213.07899999999998);
  ctx.lineTo(301.414,189.13899999999998);
  ctx.lineTo(301.414,167.67499999999998);
  ctx.bezierCurveTo(301.414,165.968,302.79499999999996,164.58299999999997,304.503,164.57799999999997);
  ctx.bezierCurveTo(306.21,164.57399999999998,307.59999999999997,165.95099999999996,307.609,167.65899999999996);
  ctx.lineTo(307.70599999999996,186.94699999999997);
  ctx.lineTo(347.967,172.91599999999997);
  ctx.lineTo(347.939,167.457);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.restore();
  ctx.restore();
};
function multArray(arr1,arr2){
  return _.map(arr1 ,(number,index)=> arr2[index]*number)
}
class Goot extends React.Component {
  constructor(props) {
    super(props);
    this.direction = [1,0];
    this.state={
      speed:1,
      width:300,
      height:300,
      interval:200,
      direction : [1, 0]
    }
    this.start = this.start.bind(this);
    this.game = this.game.bind(this);
    this.setDirection = this.setDirection.bind(this);
    this.keyPush = this.keyPush.bind(this);
  }
  setDirection(arr){
    this.setState({direction:arr})
  }
  componentDidMount() {
    this.canvas = ReactDOM.findDOMNode(this.refs["canvas-goot"]);
    console.log(this.refs["canvas-goot"])

    this.stage = new c.Stage(this.canvas);

    console.log("ici")
  }
 componentWillMount() {
   this.snake = new Snake(200,150, {color:"yellow"});

 }
  keyPush(event){
    if(event.keyCode===37){console.log("SNAKE MOVED LEFT"); this.setDirection([-1,0])}
    if(event.keyCode===38){console.log("SNAKE MOVED TOP"); this.setDirection([0,-1])}
    if(event.keyCode===39){console.log("SNAKE MOVED RIGHT"); this.setDirection([1,0])}
    if(event.keyCode===40){console.log("SNAKE MOVED DOWN"); this.setDirection([0,1])}

    if (event.defaultPrevented) {
      console.log("cc")
    }
  }
  start(){
    this.setState({speed:this.state.speed+50})
    window.addEventListener("keydown", this.keyPush)
    setInterval(this.game, this.state.interval)

    ;


  }
  rules(){
    //Ne peut pas sortir de la map
    if(
      (this.state.direction[0]===1)&&((this.snake.x>=this.state.width-this.snake.settings.width))||
        (this.state.direction[0]===-1)&&(this.snake.x<=0)
    ){
      this.setDirection([0,0])
    }
    if(
      (this.state.direction[1]===1)&&(this.snake.y>=this.state.height-this.snake.settings.height)||
      (this.state.direction[1]===-1)&&(this.snake.y<=0)
    ){
      this.setDirection([0,0])
    }
  }
  game(){
    this.stage.removeAllChildren();
    this.rules();

    this.snake.move(this.state.direction);
    let sh = new createjs.Shape();
    sh.graphics.beginFill("#E01B5D");
    draw(sh);
    this.stage.addChild(draw(sh));
    this.stage.addChild(this.snake.paint());
    this.stage.update()
  }
  render() {
    console.log(this.state.speed)

    return (
      <div className="Home crt">
        <center><h1 className="container-title">Home</h1></center>
        <Row>
          <h1>Bonsoir</h1>
          <Button onClick={this.start}>START</Button>
          <canvas tabIndex='1' ref="canvas-goot" id="canvas-goot" width={this.state.width} height={this.state.height}/>

        </Row>
      </div>
    );
  }
}

export default Goot;
