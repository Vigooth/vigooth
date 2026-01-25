import type { Meta, StoryObj } from '@storybook/react-vite'
import { Door } from './Door'

const meta = {
  title: 'Components/Door',
  component: Door,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'cpc-dark',
      values: [
        { name: 'cpc-dark', value: '#0a0a0a' },
      ],
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Door>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onOpen: () => console.log('Door opened!'),
  },
}

export const WithCustomCallback: Story = {
  args: {
    onOpen: () => alert('Welcome! The door is opening...'),
  },
}
