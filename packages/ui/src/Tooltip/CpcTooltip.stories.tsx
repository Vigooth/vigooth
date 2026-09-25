import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CpcColor } from '../Button/CpcButton';
import { CpcButton } from '../Button/CpcButton';
import { CpcTooltip } from './CpcTooltip';

const CPC_COLORS: readonly CpcColor[] = [
  'green',
  'cyan',
  'red',
  'yellow',
  'magenta',
  'blue',
  'orange',
];
const SIDES = ['top', 'right', 'bottom', 'left'] satisfies Array<
  'top' | 'right' | 'bottom' | 'left'
>;

const meta = {
  title: 'Components/CpcTooltip',
  component: CpcTooltip,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'cpc-dark',
      values: [{ name: 'cpc-dark', value: '#0a0a0a' }],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    color: { control: 'select', options: CPC_COLORS },
    side: { control: 'select', options: SIDES },
    delay: { control: 'number' },
  },
} satisfies Meta<typeof CpcTooltip>;

export { meta as default };
type Story = StoryObj<typeof meta>;

export const OnAButton: Story = {
  args: {
    content: 'Ajouter à la collection',
    color: 'cyan',
    children: (
      <CpcButton variant="outlined" color="cyan">
        HOVER ME
      </CpcButton>
    ),
  },
};

/** Any element can be the trigger, like the rating tag on a poster. */
export const OnATag: Story = {
  args: {
    content: 'Ma note perso : 8',
    color: 'cyan',
    children: (
      <div className="bg-black/80 border border-cpc-cyan-500 text-cpc-cyan-500 font-bold px-1 py-0.5 text-[10px]">
        8
      </div>
    ),
  },
};

export const Colors: Story = {
  args: { content: '', children: <span /> },
  render: () => (
    <div className="flex flex-wrap gap-2">
      {CPC_COLORS.map((color) => (
        <CpcTooltip key={color} content={`Tooltip ${color}`} color={color}>
          <CpcButton variant="outlined" color={color}>
            {color.toUpperCase()}
          </CpcButton>
        </CpcTooltip>
      ))}
    </div>
  ),
};

export const Sides: Story = {
  args: { content: '', children: <span /> },
  render: () => (
    <div className="flex flex-wrap gap-2 p-12">
      {SIDES.map((side) => (
        <CpcTooltip key={side} content={`Côté ${side}`} side={side}>
          <CpcButton variant="outlined" color="green">
            {side.toUpperCase()}
          </CpcButton>
        </CpcTooltip>
      ))}
    </div>
  ),
};
