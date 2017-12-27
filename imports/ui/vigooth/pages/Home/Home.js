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
  componentWillMount(){
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
  render() {
    return (
      <div className="Home crt">
        <center><h1 className="container-title">Home</h1></center>
        <Row>
          <h1>Gauth</h1>
          <div>
          </div>
          <ul className="scanlines">
            <li id="jpg"><div className="jpg">      {/* <TypeWriter
              speed={88}
              tag="h1"
              text={"Voici la liste des criminelles les plus recherchés"}
              randomSpeed={true}
            />*/}</div></li>
          </ul>
          <Thumb/>
        </Row>
      </div>
    );
  }
}

export default Home;
