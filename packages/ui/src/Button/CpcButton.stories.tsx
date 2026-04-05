import type { Meta, StoryObj } from '@storybook/react-vite'
import tw from 'twin.macro'
import { CpcButton } from './CpcButton'

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
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'text'],
    },
    color: {
      control: 'select',
      options: ['green', 'cyan', 'red', 'yellow', 'magenta', 'blue', 'orange'],
    },
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

export const AllVariants: Story = {
  render: () => (
    <div css={tw`flex flex-col gap-6`}>
      {(['outlined', 'filled', 'text'] as const).map((variant) => (
        <div key={variant} css={tw`flex flex-col gap-2`}>
          <span css={tw`text-cpc-green-500/60 text-xs font-cpc uppercase`}>{variant}</span>
          <div css={tw`flex flex-wrap gap-2`}>
            {(['green', 'cyan', 'red', 'yellow', 'magenta', 'blue', 'orange'] as const).map((color) => (
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
