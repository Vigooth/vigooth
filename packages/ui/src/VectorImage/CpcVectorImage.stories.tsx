import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { CpcButton } from '../Button';
import { CpcVectorImage } from './CpcVectorImage';

/** Wikimedia serves permissive CORS headers, so the canvas stays untainted. */
const SAMPLE_SRC =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Altja_j%C3%B5gi_Lahemaal.jpg/800px-Altja_j%C3%B5gi_Lahemaal.jpg';

const meta = {
  title: 'Components/CpcVectorImage',
  component: CpcVectorImage,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'cpc-dark',
      values: [{ name: 'cpc-dark', value: '#0a0a0a' }],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    levels: { control: { type: 'range', min: 2, max: 10, step: 1 } },
    resolution: { control: { type: 'range', min: 40, max: 260, step: 10 } },
    simplify: { control: { type: 'range', min: 0, max: 3, step: 0.1 } },
    smoothing: { control: { type: 'range', min: 0, max: 3, step: 1 } },
    gamma: { control: { type: 'range', min: 0.3, max: 2.5, step: 0.05 } },
    revealDuration: { control: { type: 'range', min: 200, max: 3000, step: 100 } },
    color: { control: 'color' },
  },
} satisfies Meta<typeof CpcVectorImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: SAMPLE_SRC,
    alt: 'A river running through Lahemaa national park',
    className: 'h-[420px] w-[640px]',
  },
};

/** Monochrome ink: the screen-print reading, with no hue at all. */
export const Monochrome: Story = {
  args: {
    ...Default.args,
    color: '#f0f0f0',
  },
};

/** Two levels of ink — a hard stencil. Fewest paths, strongest graphic. */
export const Stencil: Story = {
  args: {
    ...Default.args,
    levels: 2,
    color: '#f0f0f0',
    smoothing: 2,
  },
};

/** Fine trace: high grid, low tolerance. Watch the path count in devtools. */
export const FineTrace: Story = {
  args: {
    ...Default.args,
    levels: 7,
    resolution: 220,
    simplify: 0.3,
  },
};

/** Angular, unsmoothed contours — the raw marching-squares output. */
export const Angular: Story = {
  args: {
    ...Default.args,
    smoothing: 0,
    simplify: 1.4,
  },
};

/** The real target: pick a file off disk and watch it trace. */
export const Upload: Story = {
  args: Default.args,
  render: () => {
    const UploadDemo = () => {
      const inputRef = useRef<HTMLInputElement>(null);
      const [src, setSrc] = useState<string | null>(null);

      // Blob URLs leak until revoked; drop the previous one on every change.
      useEffect(() => {
        if (!src) return;
        return () => URL.revokeObjectURL(src);
      }, [src]);

      const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) setSrc(URL.createObjectURL(file));
      };

      const handlePick = () => {
        inputRef.current?.click();
      };

      return (
        <div className="flex flex-col items-center gap-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleChange}
          />
          <CpcButton variant="outlined" color="green" onClick={handlePick}>
            CHARGER UNE PHOTO
          </CpcButton>
          {src ? (
            <CpcVectorImage src={src} alt="Uploaded photograph" className="h-[480px] w-[640px]" />
          ) : (
            <p className="font-mono text-xs text-cpc-green-500">
              EN ATTENTE D&apos;UNE IMAGE...
            </p>
          )}
        </div>
      );
    };

    return <UploadDemo />;
  },
};
