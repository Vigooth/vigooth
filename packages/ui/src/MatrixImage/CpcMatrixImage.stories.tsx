import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { CpcButton } from '../Button';
import { CpcMatrixImage } from './CpcMatrixImage';

/**
 * Lorem Picsum, pinned to one photo id so the stories stay comparable run to
 * run. It answers `access-control-allow-origin: *`, which is the part that
 * matters: without permissive CORS the canvas is tainted and the renderer falls
 * back to a flat grid with no luminance shading at all.
 */
const SAMPLE_SRC = 'https://picsum.photos/id/1015/800/600';
const SAMPLE_ALT = 'A fjord seen from a clifftop, with a pale rock ledge in the foreground';

const meta = {
  title: 'Components/CpcMatrixImage',
  component: CpcMatrixImage,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'cpc-dark',
      values: [{ name: 'cpc-dark', value: '#0a0a0a' }],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    cellSize: { control: { type: 'range', min: 4, max: 24, step: 1 } },
    revealDuration: { control: { type: 'range', min: 200, max: 4000, step: 100 } },
    cycleSpeed: { control: { type: 'range', min: 0, max: 20, step: 1 } },
    underlay: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    desaturate: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    gamma: { control: { type: 'range', min: 0.3, max: 2.5, step: 0.05 } },
    shaded: { control: 'boolean' },
    color: { control: 'color' },
  },
} satisfies Meta<typeof CpcMatrixImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: SAMPLE_SRC,
    alt: SAMPLE_ALT,
    className: 'h-[420px] w-[640px]',
  },
};

/** Tighter cells hold onto fine detail — worth the extra cells on a portrait. */
export const FineGrain: Story = {
  args: {
    ...Default.args,
    cellSize: 6,
    cycleSpeed: 10,
  },
};

/** Amstrad green instead of film green, to sit inside the CPC palette. */
export const CpcGreen: Story = {
  args: {
    ...Default.args,
    color: '#00ff00',
    cellSize: 12,
    revealDuration: 700,
  },
};

/** Pushed for legibility: fine cells, lifted midtones, a strong grey underlay. */
export const HighlyLegible: Story = {
  args: {
    ...Default.args,
    cellSize: 8,
    underlay: 0.5,
    gamma: 0.6,
  },
};

/** Monochrome throughout: white glyphs, grey underlay, greyscale reveal. */
export const Monochrome: Story = {
  args: {
    ...Default.args,
    color: '#f0f0f0',
    cellSize: 8,
    underlay: 0.45,
    desaturate: 1,
    gamma: 0.7,
  },
};

/** Monochrome code rain resolving into a colour photograph. */
export const MonochromeToColour: Story = {
  args: {
    ...Monochrome.args,
    desaturate: 0,
  },
};

/** Shading off: random glyphs, no underlay. The original flat texture, for comparison. */
export const Flat: Story = {
  args: {
    ...Default.args,
    shaded: false,
    underlay: 0,
  },
};

/** A poster wall: off-screen instances idle, so scrolling stays cheap. */
export const Grid: Story = {
  args: Default.args,
  render: (args) => (
    <div className="grid grid-cols-3 gap-4">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <CpcMatrixImage
          {...args}
          key={index}
          cellSize={8}
          className="h-[260px] w-[180px]"
        />
      ))}
    </div>
  ),
};

/** The real target: pick a file off disk and watch it decode. */
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
            <CpcMatrixImage
              src={src}
              alt="Uploaded photograph"
              cellSize={8}
              className="h-[480px] w-[640px]"
            />
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
