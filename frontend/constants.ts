
export const APP_LOGO = '/logo.png';

const SVG_HEADER = "data:image/svg+xml;charset=utf-8,";

const ICON_DARK = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4FACFE"/><stop offset="100%" stop-color="#00F2FE"/></linearGradient></defs><rect width="512" height="512" rx="120" fill="#121212"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="250" fill="url(#g)">GK</text></svg>`);

const ICON_LIGHT = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4FACFE"/><stop offset="100%" stop-color="#00F2FE"/></linearGradient></defs><rect width="512" height="512" rx="120" fill="#ffffff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="250" fill="url(#g)">GK</text></svg>`);

const ICON_VIBRANT = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#654ea3"/><stop offset="100%" stop-color="#eaafc8"/></linearGradient></defs><rect width="512" height="512" rx="120" fill="url(#bg)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="250" fill="white">GK</text></svg>`);

const ICON_GOLD = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f83600"/><stop offset="100%" stop-color="#f9d423"/></linearGradient></defs><rect width="512" height="512" rx="120" fill="url(#bg)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="250" fill="#222">GK</text></svg>`);

export const APP_ICONS = [
  { id: 'dark', label: 'Midnight', dataUrl: SVG_HEADER + ICON_DARK, bg: 'bg-charcoal-900' },
  { id: 'light', label: 'Daylight', dataUrl: SVG_HEADER + ICON_LIGHT, bg: 'bg-white' },
  { id: 'vibrant', label: 'Vibrant', dataUrl: SVG_HEADER + ICON_VIBRANT, bg: 'bg-gradient-to-br from-purple-600 to-pink-400' },
  { id: 'gold', label: 'Sunset', dataUrl: SVG_HEADER + ICON_GOLD, bg: 'bg-gradient-to-br from-orange-500 to-yellow-400' },
];

export const APP_THEMES = [
  { id: 'default', label: 'Modern Blue', start: '#4FACFE', end: '#00F2FE', accentStart: '#FF6A88', accentEnd: '#FF99AC' },
  { id: 'sunset', label: 'Sunset', start: '#fa709a', end: '#fee140', accentStart: '#4FACFE', accentEnd: '#00F2FE' },
  { id: 'aurora', label: 'Nature', start: '#43E97B', end: '#38F9D7', accentStart: '#654ea3', accentEnd: '#eaafc8' },
  { id: 'berry', label: 'Berry', start: '#c471f5', end: '#fa71cd', accentStart: '#43E97B', accentEnd: '#38F9D7' },
  { id: 'electric', label: 'Electric', start: '#b721ff', end: '#21d4fd', accentStart: '#fa709a', accentEnd: '#fee140' },
  { id: 'flamingo', label: 'Neon', start: '#f83600', end: '#f9d423', accentStart: '#00c6fb', accentEnd: '#005bea' },
  { id: 'ocean', label: 'Ocean', start: '#20E2D7', end: '#F9FEA5', accentStart: '#f78ca0', accentEnd: '#f9748f' },
  { id: 'love', label: 'Love', start: '#ff0844', end: '#ffb199', accentStart: '#20E2D7', accentEnd: '#F9FEA5' }
];
