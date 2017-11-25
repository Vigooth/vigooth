import React from 'react';
import { Row, Col, FormGroup, ControlLabel, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import TypeWriter from 'react-typewriter';
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

  render() {
    return (
      <div className="Home">
        <Row>
          <h1>Gauth</h1>

          <ul className="scanlines">
            <li id="jpg"><div className="jpg">       <TypeWriter typing={1}>
              Hello
              <span ><h1>World</h1></span>
              !
            </TypeWriter></div></li>
            <Thumb/>
          </ul>


        </Row>
      </div>
    );
  }
}

export default Home;
