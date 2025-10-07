import React from 'react';

// Custom SVG Icons for professional look
export const AWSIcon = ({ size = 16, color = '#ff9900' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18.5 12.5L12 16L5.5 12.5L12 9L18.5 12.5Z" fill={color} fillOpacity="0.3"/>
    <path d="M18.5 8L12 11.5L5.5 8L12 4.5L18.5 8Z" fill={color}/>
    <path d="M18.5 17L12 20.5L5.5 17L12 13.5L18.5 17Z" fill={color} fillOpacity="0.7"/>
  </svg>
);

export const DatabaseIcon = ({ size = 16, color = '#336791' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <ellipse cx="12" cy="6" rx="8" ry="3" fill={color}/>
    <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" fill={color} fillOpacity="0.7"/>
    <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" fill={color} fillOpacity="0.5"/>
  </svg>
);

export const RedisIcon = ({ size = 16, color = '#dc382d' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="8" width="18" height="8" rx="2" fill={color}/>
    <rect x="5" y="10" width="14" height="1" fill="white" fillOpacity="0.5"/>
    <rect x="5" y="13" width="14" height="1" fill="white" fillOpacity="0.3"/>
    <circle cx="19" cy="12" r="2" fill={color}/>
  </svg>
);

export const ServerIcon = ({ size = 16, color = '#ff9900' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="4" rx="1" fill={color}/>
    <rect x="2" y="10" width="20" height="4" rx="1" fill={color} fillOpacity="0.8"/>
    <rect x="2" y="16" width="20" height="4" rx="1" fill={color} fillOpacity="0.6"/>
    <circle cx="6" cy="6" r="1" fill="white"/>
    <circle cx="6" cy="12" r="1" fill="white"/>
    <circle cx="6" cy="18" r="1" fill="white"/>
  </svg>
);

export const NetworkIcon = ({ size = 16, color = '#0078d4' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" fill={color}/>
    <circle cx="6" cy="6" r="2" fill={color} fillOpacity="0.7"/>
    <circle cx="18" cy="6" r="2" fill={color} fillOpacity="0.7"/>
    <circle cx="6" cy="18" r="2" fill={color} fillOpacity="0.7"/>
    <circle cx="18" cy="18" r="2" fill={color} fillOpacity="0.7"/>
    <path d="M8.5 7.5L10.5 10.5M13.5 10.5L15.5 7.5M8.5 16.5L10.5 13.5M13.5 13.5L15.5 16.5" 
          stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const PhoneIcon = ({ size = 16, color = '#00d2ff' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M22 16.92V19.5C22 20.33 21.33 21 20.5 21C10.1 21 2 12.9 2 2.5C2 1.67 2.67 1 3.5 1H6.08C6.91 1 7.58 1.67 7.58 2.5V5.5C7.58 6.33 6.91 7 6.08 7H4.5C4.5 12.5 9 17 14.5 17V15.42C14.5 14.59 15.17 13.92 16 13.92H19C19.83 13.92 20.5 14.59 20.5 15.42V16.92C20.5 17.75 21.17 18.42 22 18.42V16.92Z" 
          fill={color}/>
    <circle cx="18" cy="6" r="3" fill={color} fillOpacity="0.3"/>
    <path d="M18 4V8M16 6H20" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const GlobeIcon = ({ size = 16, color = '#0078d4' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" 
          stroke={color} strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="12" r="2" fill={color}/>
  </svg>
);

export const WorkflowIcon = ({ size = 16, color = '#ff9900' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="4" height="4" rx="1" fill={color}/>
    <rect x="10" y="4" width="4" height="4" rx="1" fill={color} fillOpacity="0.8"/>
    <rect x="18" y="4" width="4" height="4" rx="1" fill={color} fillOpacity="0.6"/>
    <rect x="6" y="12" width="4" height="4" rx="1" fill={color} fillOpacity="0.7"/>
    <rect x="14" y="12" width="4" height="4" rx="1" fill={color} fillOpacity="0.5"/>
    <path d="M6 6H10M14 6H18M8 8V12M12 8V12M16 8V12" 
          stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const ShieldIcon = ({ size = 16, color = '#198754' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L3 7V13C3 17.55 6.84 21.74 12 23C17.16 21.74 21 17.55 21 13V7L12 2Z" 
          fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <path d="M9 12L11 14L15 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ChartIcon = ({ size = 16, color = '#17a2b8' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 17L9 11L13 15L21 7" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 7V13M21 7H15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="2" y="18" width="2" height="3" fill={color} fillOpacity="0.7"/>
    <rect x="6" y="16" width="2" height="5" fill={color} fillOpacity="0.5"/>
    <rect x="10" y="14" width="2" height="7" fill={color} fillOpacity="0.6"/>
  </svg>
);

export const ContainerIcon = ({ size = 16, color = '#ff9900' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="6" width="20" height="12" rx="2" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="2"/>
    <rect x="4" y="8" width="4" height="3" rx="1" fill={color}/>
    <rect x="10" y="8" width="4" height="3" rx="1" fill={color} fillOpacity="0.7"/>
    <rect x="16" y="8" width="4" height="3" rx="1" fill={color} fillOpacity="0.5"/>
    <line x1="2" y1="14" x2="22" y2="14" stroke={color} strokeWidth="1"/>
  </svg>
);

export const LoadBalancerIcon = ({ size = 16, color = '#ff9900' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="3" fill={color}/>
    <circle cx="6" cy="16" r="2" fill={color} fillOpacity="0.7"/>
    <circle cx="12" cy="16" r="2" fill={color} fillOpacity="0.7"/>
    <circle cx="18" cy="16" r="2" fill={color} fillOpacity="0.7"/>
    <path d="M12 11L6 14M12 11L12 14M12 11L18 14" 
          stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const WhatsAppIcon = ({ size = 16, color = '#25d366' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="2"/>
    <path d="M8.5 14.5L7 16L9 18L10.5 16.5C11.3 16.8 12.2 17 13 17C16.3 17 19 14.3 19 11S16.3 5 13 5S7 7.7 7 11C7 11.8 7.2 12.7 7.5 13.5Z" 
          fill={color}/>
    <path d="M10 9L11 10L14 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const SocialIcon = ({ size = 16, color = '#1877f2' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="20" height="20" rx="4" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="2"/>
    <circle cx="8" cy="8" r="2" fill={color}/>
    <circle cx="16" cy="8" r="2" fill={color} fillOpacity="0.7"/>
    <circle cx="8" cy="16" r="2" fill={color} fillOpacity="0.5"/>
    <circle cx="16" cy="16" r="2" fill={color} fillOpacity="0.8"/>
    <path d="M8 10V14M16 10V14M10 8H14M10 16H14" stroke={color} strokeWidth="1.5"/>
  </svg>
);

export const BrainIcon = ({ size = 16, color = '#8b5cf6' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.5 2 6 4.5 6 8C6 9.5 6.5 10.8 7.3 11.8C6.5 12.8 6 14.1 6 15.5C6 19 8.5 21.5 12 21.5C15.5 21.5 18 19 18 15.5C18 14.1 17.5 12.8 16.7 11.8C17.5 10.8 18 9.5 18 8C18 4.5 15.5 2 12 2Z" 
          fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"/>
    <circle cx="9" cy="9" r="1" fill={color}/>
    <circle cx="15" cy="9" r="1" fill={color}/>
    <path d="M9 13C9.5 14 10.7 14.5 12 14.5S14.5 14 15 13" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const GoogleIcon = ({ size = 16, color = '#4285f4' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="8" fill={color} fillOpacity="0.1"/>
    <path d="M12 4C16.4 4 20 7.6 20 12S16.4 20 12 20C7.6 20 4 16.4 4 12" 
          stroke={color} strokeWidth="2" fill="none"/>
    <path d="M12 8V16M8 12H16" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="2" fill={color}/>
  </svg>
);
