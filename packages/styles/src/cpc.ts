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

const crtWave = keyframes`
  0% {
    transform: translateY(-50%) skewX(0deg);
  }
  25% {
    transform: translateY(-37.5%) skewX(0.3deg);
  }
  50% {
    transform: translateY(-25%) skewX(0deg);
  }
  75% {
    transform: translateY(-12.5%) skewX(-0.3deg);
  }
  100% {
    transform: translateY(0%) skewX(0deg);
  }
`

const crtFlicker = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.98; }
  100% { opacity: 1; }
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
  overflow: hidden;
  animation: ${crtFlicker} 0.15s infinite;

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

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 200%;
    background:
      linear-gradient(
        0deg,
        transparent 0%,
        transparent 44%,
        rgba(0, 255, 0, 0.03) 46%,
        rgba(0, 255, 0, 0.07) 47.5%,
        rgba(255, 255, 255, 0.06) 49%,
        rgba(255, 255, 255, 0.1) 50%,
        rgba(255, 255, 255, 0.06) 51%,
        rgba(0, 255, 0, 0.07) 52.5%,
        rgba(0, 255, 0, 0.03) 54%,
        transparent 56%,
        transparent 100%
      ),
      linear-gradient(
        0deg,
        transparent 0%,
        transparent 18%,
        rgba(0, 255, 0, 0.02) 19%,
        rgba(255, 255, 255, 0.04) 20%,
        rgba(0, 255, 0, 0.02) 21%,
        transparent 22%,
        transparent 100%
      );
    pointer-events: none;
    animation: ${crtWave} 8s linear infinite;
    z-index: 1;
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
