import React from 'react';
import { Row, Col, FormGroup, ControlLabel, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import TypeWriter from '/imports/ui/components/Typewriter/Typewriter';
import Thumb from '/imports/ui/components/Thumb/Thumb';
import './Home.scss'
class Home extends React.Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentDidMount() {
  }

  handleSubmit() {
    Meteor.loginWithPassword(this.emailAddress.value, this.password.value, (error) => {
      if (error) {
        Bert.alert(error.reason, 'danger');
      } else {
        Bert.alert('Welcome back!', 'success');
      }
    });
  }
  smiley(){
    const arr=
      "XYYOOOYYOOOYYX/"+
      "XXXOXOXXOXOXXX/"+
      "XXXOOOXXOOOXXX/"+
      "XXXXXX|XXXXXXX/"+
      "XXXOOXXXXOOXXX/"+
      "XXXXOOXXOOXXXX/"+
      "XXXXXOOOOXXXXX/";
    let results=[];
    for(let i=0;i<=arr.length;i++){
      if(arr[i]==='O'){results.push(['button','blue','O'])}
      if(arr[i]==='X'){results.push(['button','red','X'])}
      if(arr[i]==='Y'){results.push(['button','blue','Y'])}
      if(arr[i]==='/'){results.push(['br','',''])}
      if(arr[i]==='|'){results.push(['button','blue','|'])}
    }
    console.log(results)
    results.map( result => React.createElement(result[0],{className:result[1]},result[2]))
    return React.createElement('div',{},
      results.map( result => {
        if(result[0]===('br')){return React.createElement(result[0],{})}
        return React.createElement(result[0],{className:result[1]},result[2])
      })
    )
  }
  render() {
    return (
      <div className="Home crt">
        <Row>
          <h1>Gauth</h1>
          <div>
            {this.smiley()}
          </div>
          <ul className="scanlines">
            <li id="jpg"><div className="jpg">       <TypeWriter
              speed={88}
              tag="h1"
              text={"Voici la liste des criminelles les plus recherchés"}
              randomSpeed={true}
            /></div></li>
          </ul>
          <Thumb/>
        </Row>
      </div>
    );
  }
}

export default Home;
