import { Tooltip } from '@base-ui/react/tooltip';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import type { CpcColor } from '../Button/CpcButton';

const colorMap: Record<CpcColor, string> = {
  green: '#00FF00',
  cyan: '#00FFFF',
  red: '#FF0000',
  yellow: '#FFFF00',
  magenta: '#FF00FF',
  blue: '#0000FF',
  orange: '#FF8000',
};

export interface CpcTooltipProps {
  /** The element the tooltip describes; it is rendered as the trigger. */
  children: ReactElement;
  content: ReactNode;
  color?: CpcColor;
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Milliseconds before it opens. */
  delay?: number;
}

export function CpcTooltip({
  children,
  content,
  color = 'green',
  side = 'top',
  delay = 300,
}: CpcTooltipProps) {
  const popupStyle: CSSProperties & { '--tooltip-color': string } = {
    '--tooltip-color': colorMap[color],
  };

  return (
    <Tooltip.Root>
      <Tooltip.Trigger delay={delay} render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side} sideOffset={6}>
          <Tooltip.Popup className="cpc-tooltip-popup" style={popupStyle}>
            {content}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
