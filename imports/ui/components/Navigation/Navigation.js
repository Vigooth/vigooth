import React from 'react';
import PropTypes from 'prop-types';
import { Navbar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import PublicNavigation from '../PublicNavigation/PublicNavigation';
import AuthenticatedNavigation from '../AuthenticatedNavigation/AuthenticatedNavigation';

import './Navigation.scss';

const Navigation = props => (
  <Navbar>
    <Navbar.Header>
      <Navbar.Brand>
        <Link to="/">Pup</Link>
      </Navbar.Brand>
      <Navbar.Toggle />
    </Navbar.Header>
    <Navbar.Collapse>
      {!props.authenticated ? <PublicNavigation /> : <AuthenticatedNavigation {...props} />}
    </Navbar.Collapse>
  </Navbar>
);
const Header = props => (
  <div className="retro-header">
    <div className="header-menu">
      <p>Vigooth : Home</p>
      <p>Vigooth : CV </p>
      <p>Ok je pars j'ai compris</p>

    </div>
    <div className="header-menu">
      <p>GAME : TETRIS</p>
      <p>GAME : MEMORY </p>
      <p>GAME : </p>

    </div>
  </div>
);

Header.defaultProps = {
  name: '',
};

Header.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  name: PropTypes.string,
};

export default Header;
