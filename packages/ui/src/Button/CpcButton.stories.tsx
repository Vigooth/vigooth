import type { Meta, StoryObj } from '@storybook/react-vite'
import { CpcButton, type CpcColor, type CpcSize, type CpcVariant } from './CpcButton'

const CPC_COLORS: readonly CpcColor[] = ['green', 'cyan', 'red', 'yellow', 'magenta', 'blue', 'orange']
const CPC_VARIANTS: readonly CpcVariant[] = ['outlined', 'filled', 'text']
const CPC_SIZES: readonly CpcSize[] = ['xs', 'sm', 'md', 'lg', 'xl']

const meta = {
  title: 'Components/CpcButton',
  component: CpcButton,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'cpc-dark',
      values: [{ name: 'cpc-dark', value: '#0a0a0a' }],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: CPC_VARIANTS },
    color: { control: 'select', options: CPC_COLORS },
    size: { control: 'select', options: CPC_SIZES },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof CpcButton>

export default meta
type Story = StoryObj<typeof meta>

export const Outlined: Story = {
  args: {
    children: 'OUTLINED',
    variant: 'outlined',
    color: 'green',
  },
}

export const Filled: Story = {
  args: {
    children: 'FILLED',
    variant: 'filled',
    color: 'cyan',
  },
}

export const Text: Story = {
  args: {
    children: 'TEXT',
    variant: 'text',
    color: 'red',
  },
}

export const Disabled: Story = {
  args: {
    children: 'DISABLED',
    variant: 'outlined',
    color: 'green',
    disabled: true,
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      {CPC_SIZES.map((size) => (
        <CpcButton key={size} size={size} color="green">
          {size.toUpperCase()}
        </CpcButton>
      ))}
    </div>
  ),
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {CPC_VARIANTS.map((variant) => (
        <div key={variant} className="flex flex-col gap-2">
          <span className="text-cpc-green-500/60 text-xs font-cpc uppercase">{variant}</span>
          <div className="flex flex-wrap gap-2">
            {CPC_COLORS.map((color) => (
              <CpcButton key={color} variant={variant} color={color}>
                {color.toUpperCase()}
              </CpcButton>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
}
