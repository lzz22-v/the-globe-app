import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

// Ícone de Lixeira (Trash)
export const TrashIcon = ({ color = "#888", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill={color} />
  </Svg>
);

// Ícone de Bloquear (Block/🚫)
export const BlockIcon = ({ color = "#FF4444", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.69 5.69C9.04 4.63 10.75 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z" fill={color} />
  </Svg>
);

// Ícone de Episódio (Clapperboard/🎬)
export const EpisodeIcon = ({ color = "#7048e8", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" fill={color} />
  </Svg>
);

// Ícone de Responder (Setas entrelaçadas/Diálogo)
export const ReplyIcon = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" fill={color} />
  </Svg>
);

// O de Câmera 
export const CameraIcon = ({ color = "#888", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6H16.5L14.5 4H9.5L7.5 6H4C2.9 6 2 6.9 2 8V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6Z" fill={color} />
    <Circle cx="12" cy="13" r="3" fill="#0f0f0f" />
  </Svg>
);