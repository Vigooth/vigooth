import { Container, Graphics } from 'pixi.js';
import type { Stamp } from '@/types/dungeon';
import {
  HANDLE_SIZE,
  ROTATE_OFFSET,
  RESIZE_HANDLES,
  getHandleLocalPosition,
} from '../canvas/handles';

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SELECT_COLOR = 0x00ffff;
const HANDLE_FILL = 0x000000;
const HANDLE_STROKE = 0x00ffff;
const ROTATE_COLOR = 0xffff00;

export function renderSelection(
  overlay: Container,
  stamps: Stamp[],
  marquee: MarqueeRect | null = null,
  showHandles = false,
): void {
  overlay.removeChildren();

  for (const stamp of stamps) {
    const frame = new Graphics();
    frame.rect(-stamp.width / 2, -stamp.height / 2, stamp.width, stamp.height).stroke({
      width: 2,
      color: SELECT_COLOR,
      alignment: 0,
    });
    frame.position.set(stamp.x, stamp.y);
    frame.rotation = stamp.rotation;
    overlay.addChild(frame);
  }

  if (showHandles && stamps.length === 1) {
    const stamp = stamps[0];
    const wrapper = new Container();
    wrapper.position.set(stamp.x, stamp.y);
    wrapper.rotation = stamp.rotation;

    const arm = new Graphics();
    arm.moveTo(0, -stamp.height / 2).lineTo(0, -stamp.height / 2 - ROTATE_OFFSET);
    arm.stroke({ width: 1, color: ROTATE_COLOR, alpha: 0.7 });
    wrapper.addChild(arm);

    for (const kind of RESIZE_HANDLES) {
      const p = getHandleLocalPosition(stamp, kind);
      const h = new Graphics();
      h.rect(-HANDLE_SIZE / 2, -HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE)
        .fill(HANDLE_FILL)
        .stroke({ width: 1, color: HANDLE_STROKE });
      h.position.set(p.x, p.y);
      wrapper.addChild(h);
    }

    const rotate = new Graphics();
    rotate
      .circle(0, 0, HANDLE_SIZE / 2 + 1)
      .fill(HANDLE_FILL)
      .stroke({ width: 1, color: ROTATE_COLOR });
    const rp = getHandleLocalPosition(stamp, 'rotate');
    rotate.position.set(rp.x, rp.y);
    wrapper.addChild(rotate);

    overlay.addChild(wrapper);
  }

  if (marquee) {
    const g = new Graphics();
    g.rect(marquee.x, marquee.y, marquee.width, marquee.height)
      .fill({ color: SELECT_COLOR, alpha: 0.08 })
      .stroke({ width: 1, color: SELECT_COLOR, alpha: 0.8 });
    overlay.addChild(g);
  }
}
