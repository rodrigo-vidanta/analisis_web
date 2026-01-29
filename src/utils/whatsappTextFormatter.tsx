/**
 * Utilidad para parsear y renderizar modificadores de texto de WhatsApp
 * 
 * Formatos oficiales soportados:
 * - *texto* → Negrita (bold)
 * - _texto_ → Cursiva (italic)
 * - ~texto~ → Tachado (strikethrough)
 * - ```texto``` → Monoespaciado (monospace)
 * 
 * Documentación: https://faq.whatsapp.com/539178204879377/
 */

import React from 'react';

interface ParsedSegment {
  type: 'text' | 'bold' | 'italic' | 'strikethrough' | 'monospace';
  content: string;
}

/**
 * Parsea texto con modificadores de WhatsApp y retorna segmentos estructurados
 */
export const parseWhatsAppText = (text: string): ParsedSegment[] => {
  if (!text) return [];

  const segments: ParsedSegment[] = [];
  let remaining = text;
  let position = 0;

  // Regex para detectar modificadores (en orden de prioridad)
  const patterns = [
    { regex: /```([^`]+)```/g, type: 'monospace' as const }, // Monospace (3 backticks)
    { regex: /\*([^*\n]+)\*/g, type: 'bold' as const },      // Bold (asteriscos)
    { regex: /_([^_\n]+)_/g, type: 'italic' as const },      // Italic (guiones bajos)
    { regex: /~([^~\n]+)~/g, type: 'strikethrough' as const } // Strikethrough (tildes)
  ];

  while (position < text.length) {
    let earliestMatch: { start: number; end: number; type: ParsedSegment['type']; content: string } | null = null;

    // Buscar el primer modificador que aparezca
    for (const { regex, type } of patterns) {
      regex.lastIndex = 0; // Reset regex
      const match = regex.exec(remaining.slice(position));
      
      if (match && match.index !== undefined) {
        const start = position + match.index;
        const end = start + match[0].length;

        if (!earliestMatch || start < earliestMatch.start) {
          earliestMatch = {
            start,
            end,
            type,
            content: match[1] // Contenido sin los modificadores
          };
        }
      }
    }

    if (earliestMatch) {
      // Agregar texto plano antes del modificador
      if (earliestMatch.start > position) {
        segments.push({
          type: 'text',
          content: text.slice(position, earliestMatch.start)
        });
      }

      // Agregar segmento con formato
      segments.push({
        type: earliestMatch.type,
        content: earliestMatch.content
      });

      position = earliestMatch.end;
    } else {
      // No hay más modificadores, agregar el resto como texto plano
      segments.push({
        type: 'text',
        content: text.slice(position)
      });
      break;
    }
  }

  return segments;
};

/**
 * Renderiza un segmento parseado con el estilo apropiado
 */
const renderSegment = (segment: ParsedSegment, index: number): React.ReactNode => {
  const { type, content } = segment;

  switch (type) {
    case 'bold':
      return <strong key={index} className="font-bold">{content}</strong>;
    
    case 'italic':
      return <em key={index} className="italic">{content}</em>;
    
    case 'strikethrough':
      return <span key={index} className="line-through">{content}</span>;
    
    case 'monospace':
      return (
        <code 
          key={index} 
          className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm"
        >
          {content}
        </code>
      );
    
    case 'text':
    default:
      return <React.Fragment key={index}>{content}</React.Fragment>;
  }
};

/**
 * Componente que renderiza texto con modificadores de WhatsApp
 */
interface WhatsAppFormattedTextProps {
  text: string;
  className?: string;
}

export const WhatsAppFormattedText: React.FC<WhatsAppFormattedTextProps> = ({ 
  text, 
  className = '' 
}) => {
  const segments = parseWhatsAppText(text);

  return (
    <span className={className}>
      {segments.map((segment, index) => renderSegment(segment, index))}
    </span>
  );
};

/**
 * Función para procesar texto multilinea (preserva saltos de línea)
 */
export const renderWhatsAppFormattedText = (text: string): React.ReactNode => {
  if (!text) return null;

  // Dividir por líneas para preservar saltos
  const lines = text.split('\n');

  return lines.map((line, lineIndex) => (
    <React.Fragment key={lineIndex}>
      <WhatsAppFormattedText text={line} />
      {lineIndex < lines.length - 1 && <br />}
    </React.Fragment>
  ));
};
