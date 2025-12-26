/**
 * ============================================
 * COMPONENTES BASE CORPORATIVOS
 * ============================================
 * 
 * Exportación central de todos los componentes base homologados.
 * Estos componentes usan el sistema de tokens de diseño.
 * 
 * Uso:
 * import { Button, Card, Badge, Modal, Input } from '@/components/base';
 */

// Button
export {
  Button,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  DangerButton,
  SuccessButton,
  WarningButton,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from './Button';

// Card
export {
  Card,
  ElevatedCard,
  OutlinedCard,
  GradientCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  type CardProps,
  type CardVariant,
  type CardSize,
} from './Card';

// Badge
export {
  Badge,
  PrimaryBadge,
  SuccessBadge,
  WarningBadge,
  ErrorBadge,
  InfoBadge,
  DotBadge,
  type BadgeProps,
  type BadgeVariant,
  type BadgeSize,
} from './Badge';

// Modal
export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  type ModalProps,
  type ModalSize,
} from './Modal';

// Input
export {
  Input,
  SuccessInput,
  ErrorInput,
  WarningInput,
  type InputProps,
  type InputVariant,
  type InputSize,
} from './Input';

// Tabs
export {
  Tabs,
  type Tab,
  type TabsProps,
  type TabsVariant,
} from './Tabs';

