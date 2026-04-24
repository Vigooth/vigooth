import { createIcon } from './createIcon';
import { ChevronDown } from './svg/ChevronDown';
import { ChevronRight } from './svg/ChevronRight';
import { Close } from './svg/Close';
import { Search } from './svg/Search';
import { Download } from './svg/Download';
import { ExternalLink } from './svg/ExternalLink';
import { StarOutlined, StarFilled } from './svg/Star';
import { List } from './svg/List';
import { GridCompact } from './svg/GridCompact';

export const ChevronDownIcon = createIcon('ChevronDown', {
  default: { size: 'md', variant: 'outlined' },
  variants: [{ size: 'md', variant: 'outlined', component: ChevronDown }],
});

export const ChevronRightIcon = createIcon('ChevronRight', {
  default: { size: 'md', variant: 'outlined' },
  variants: [{ size: 'md', variant: 'outlined', component: ChevronRight }],
});

export const CloseIcon = createIcon('Close', {
  default: { size: 'md', variant: 'outlined' },
  variants: [{ size: 'md', variant: 'outlined', component: Close }],
});

export const SearchIcon = createIcon('Search', {
  default: { size: 'md', variant: 'outlined' },
  variants: [{ size: 'md', variant: 'outlined', component: Search }],
});

export const DownloadIcon = createIcon('Download', {
  default: { size: 'md', variant: 'outlined' },
  variants: [{ size: 'md', variant: 'outlined', component: Download }],
});

export const ExternalLinkIcon = createIcon('ExternalLink', {
  default: { size: 'md', variant: 'outlined' },
  variants: [{ size: 'md', variant: 'outlined', component: ExternalLink }],
});

export const StarIcon = createIcon('Star', {
  default: { size: 'md', variant: 'outlined' },
  variants: [
    { size: 'md', variant: 'outlined', component: StarOutlined },
    { size: 'md', variant: 'filled', component: StarFilled },
  ],
});

export const ListIcon = createIcon('List', {
  default: { size: 'md', variant: 'outlined' },
  variants: [{ size: 'md', variant: 'outlined', component: List }],
});

export const GridCompactIcon = createIcon('GridCompact', {
  default: { size: 'md', variant: 'outlined' },
  variants: [{ size: 'md', variant: 'outlined', component: GridCompact }],
});
