import { css, keyframes } from '@emotion/react'

// Keyframes
const cursorBlink = keyframes`
  0%, 50% {
    background-color: #00FF00;
  }
  51%, 100% {
    background-color: transparent;
  }
`

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

const enterDoor = keyframes`
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  30% {
    transform: scale(1.1);
  }
  60% {
    transform: scale(1.5);
    filter: brightness(0.8);
  }
  100% {
    transform: scale(3);
    filter: brightness(0.3) blur(4px);
    opacity: 0;
  }
`

const zoomIn = keyframes`
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(10);
    opacity: 0;
  }
`

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`

// Styles
export const cpcScreen = css`
  background: linear-gradient(
    180deg,
    rgba(0, 255, 0, 0.03) 0%,
    rgba(0, 0, 0, 0) 50%,
    rgba(0, 255, 0, 0.03) 100%
  );
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 255, 0, 0.05) 2px,
      rgba(0, 255, 0, 0.05) 4px
    );
    pointer-events: none;
  }
`

export const cpcTextShadow = css`
  text-shadow: 0 0 5px currentColor;
`

export const cpcCursor = css`
  background-color: #00FF00;
  animation: ${cursorBlink} 1.06s infinite;
`

export const animateFadeIn = css`
  animation: ${fadeIn} 0.5s ease-in;
`

export const animateEnterDoor = css`
  animation: ${enterDoor} 2s ease-in forwards;
`

export const animateZoomIn = css`
  animation: ${zoomIn} 2s ease-in forwards;
`

export const animatePulse = css`
  animation: ${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
`
