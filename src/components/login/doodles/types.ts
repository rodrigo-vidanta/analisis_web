/** Estado de interaccion del formulario de login → doodles */
export interface DoodleInteraction {
  activeField: 'none' | 'email' | 'password';
  hasError: boolean;
  isTypingError: boolean; // backspace detectado en email
  mouseX: number; // normalizado 0-1
  mouseY: number; // normalizado 0-1
}

export type DoodleExpression =
  | 'idle'
  | 'excited'
  | 'shy'
  | 'disapproval'
  | 'confused'
  | 'bored';

export interface DoodleConfig {
  id: string;
  color: string;
  darkColor: string;
  cheekColor: string;
  xPercent: number;
  fromTop: boolean;
  scale: number;
  flipX: boolean;
}
