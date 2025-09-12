import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
}

interface QuizComponentProps {
  questions: QuizQuestion[];
  onComplete: (score: number, answers: number[]) => void;
  onBack: () => void;
  title: string;
}

const QuizComponent: React.FC<QuizComponentProps> = ({ questions, onComplete, onBack, title }) => {
  const { isLinearTheme } = useTheme();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30); // 30 segundos por pregunta
  const [quizStarted, setQuizStarted] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  // Timer para cada pregunta
  useEffect(() => {
    if (!quizStarted || showExplanation || quizCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, showExplanation, quizCompleted, quizStarted]);

  const handleTimeUp = () => {
    // Respuesta automática incorrecta cuando se acaba el tiempo
    handleAnswerSelect(-1);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return;

    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowExplanation(false);
      setTimeLeft(30);
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = () => {
    const finalScore = calculateScore();
    setScore(finalScore);
    setQuizCompleted(true);
    onComplete(finalScore, selectedAnswers);
  };

  const calculateScore = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer === questions[index]?.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / questions.length) * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 80) return 'text-yellow-500';
    if (score >= 70) return 'text-orange-500';
    return 'text-red-500';
  };

  const getTimeColor = (time: number) => {
    if (time > 20) return isLinearTheme ? 'text-emerald-600' : 'text-emerald-500';
    if (time > 10) return isLinearTheme ? 'text-yellow-600' : 'text-yellow-500';
    return isLinearTheme ? 'text-red-600' : 'text-red-500';
  };

  if (!quizStarted) {
    // Pantalla de inicio
    return (
      <div className={`max-w-2xl mx-auto p-6 rounded-2xl ${
        isLinearTheme 
          ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
          : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700'
      }`}>
        <div className="text-center mb-8">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
            isLinearTheme 
              ? 'bg-slate-100 dark:bg-slate-700'
              : 'bg-gradient-to-br from-emerald-400 to-green-500'
          }`}>
            <span className={`text-3xl ${isLinearTheme ? 'text-slate-600 dark:text-slate-300' : 'text-white'}`}>
              ❓
            </span>
          </div>
          <h2 className={`text-2xl font-bold mb-4 ${
            isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
          }`}>
            {title}
          </h2>
          <div className={`space-y-2 text-sm ${
            isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
          }`}>
            <p>📊 {questions.length} preguntas</p>
            <p>⏱️ 30 segundos por pregunta</p>
            <p>🎯 Necesitas 70% para aprobar</p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setQuizStarted(true)}
            className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 ${
              isLinearTheme 
                ? 'bg-slate-600 hover:bg-slate-700 text-white'
                : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white'
            }`}
          >
            🚀 Comenzar Quiz
          </button>
          
          <button
            onClick={onBack}
            className={`w-full py-3 px-6 rounded-xl font-semibold border-2 transition-all duration-200 ${
              isLinearTheme 
                ? 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-300 dark:hover:bg-indigo-900/20'
            }`}
          >
            Volver al Nivel
          </button>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    // Pantalla de resultados
    return (
      <div className={`max-w-2xl mx-auto p-6 rounded-2xl ${
        isLinearTheme 
          ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
          : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700'
      }`}>
        <div className="text-center mb-8">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
            score >= 70 
              ? 'bg-gradient-to-br from-emerald-400 to-green-500'
              : 'bg-gradient-to-br from-red-400 to-red-500'
          }`}>
            <span className="text-3xl text-white">
              {score >= 70 ? '🎉' : '😔'}
            </span>
          </div>
          
          <h2 className={`text-2xl font-bold mb-4 ${
            isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
          }`}>
            {score >= 70 ? '¡Felicidades!' : 'Sigue Practicando'}
          </h2>
          
          <div className={`text-4xl font-bold mb-2 ${getScoreColor(score)}`}>
            {score}%
          </div>
          
          <p className={`text-lg ${
            isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
          }`}>
            {selectedAnswers.filter((answer, index) => answer === questions[index]?.correctAnswer).length} de {questions.length} correctas
          </p>
        </div>

        {/* Resumen por categorías */}
        <div className={`p-4 rounded-xl mb-6 ${
          isLinearTheme ? 'bg-slate-50 dark:bg-slate-700' : 'bg-indigo-50 dark:bg-slate-700'
        }`}>
          <h3 className={`font-bold mb-3 ${
            isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
          }`}>
            Resumen de Respuestas
          </h3>
          <div className="space-y-2">
            {questions.map((question, index) => (
              <div key={question.id} className="flex items-center justify-between">
                <span className={`text-sm ${
                  isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-indigo-700 dark:text-indigo-300'
                }`}>
                  Pregunta {index + 1}
                </span>
                <span className={`text-sm font-semibold ${
                  selectedAnswers[index] === question.correctAnswer 
                    ? 'text-emerald-600' 
                    : 'text-red-500'
                }`}>
                  {selectedAnswers[index] === question.correctAnswer ? '✓ Correcta' : '✗ Incorrecta'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {score >= 70 ? (
            <button
              onClick={onBack}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 ${
                isLinearTheme 
                  ? 'bg-slate-600 hover:bg-slate-700 text-white'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white'
              }`}
            >
              🎯 Continuar al Siguiente
            </button>
          ) : (
            <button
              onClick={() => {
                setQuizCompleted(false);
                setQuizStarted(false);
                setCurrentQuestionIndex(0);
                setSelectedAnswers([]);
                setShowExplanation(false);
                setTimeLeft(30);
              }}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 ${
                isLinearTheme 
                  ? 'bg-slate-600 hover:bg-slate-700 text-white'
                  : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white'
              }`}
            >
              🔄 Intentar de Nuevo
            </button>
          )}
          
          <button
            onClick={onBack}
            className={`w-full py-3 px-6 rounded-xl font-semibold border-2 transition-all duration-200 ${
              isLinearTheme 
                ? 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                : 'border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-300 dark:hover:bg-indigo-900/20'
            }`}
          >
            Volver al Nivel
          </button>
        </div>
      </div>
    );
  }

  // Pantalla de pregunta activa
  return (
    <div className={`max-w-3xl mx-auto p-6 rounded-2xl ${
      isLinearTheme 
        ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
        : 'bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700'
    }`}>
      {/* Header con progreso y timer */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <span className={`text-sm font-semibold ${
            isLinearTheme ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-300'
          }`}>
            Pregunta {currentQuestionIndex + 1} de {questions.length}
          </span>
          <div className={`w-32 h-2 rounded-full ${
            isLinearTheme ? 'bg-slate-200 dark:bg-slate-700' : 'bg-indigo-200 dark:bg-slate-700'
          }`}>
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isLinearTheme 
                  ? 'bg-gradient-to-r from-slate-500 to-slate-600'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600'
              }`}
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
        
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
          timeLeft <= 10 
            ? 'bg-red-100 dark:bg-red-900/20'
            : isLinearTheme 
              ? 'bg-slate-100 dark:bg-slate-700'
              : 'bg-emerald-100 dark:bg-emerald-900/20'
        }`}>
          <svg className={`w-4 h-4 ${getTimeColor(timeLeft)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={`font-bold ${getTimeColor(timeLeft)}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Pregunta */}
      <div className={`p-6 rounded-xl mb-6 ${
        isLinearTheme ? 'bg-slate-50 dark:bg-slate-700' : 'bg-indigo-50 dark:bg-slate-700'
      }`}>
        <div className="flex items-start space-x-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isLinearTheme 
              ? 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
              : 'bg-indigo-200 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300'
          }`}>
            ❓
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-semibold mb-2 ${
              isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
            }`}>
              {currentQuestion.question}
            </h3>
            {currentQuestion.category && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                isLinearTheme 
                  ? 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
                  : 'bg-indigo-200 text-indigo-600 dark:bg-indigo-800 dark:text-indigo-300'
              }`}>
                {currentQuestion.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Opciones */}
      <div className="space-y-3 mb-6">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswers[currentQuestionIndex] === index;
          const isCorrect = index === currentQuestion.correctAnswer;
          const showResult = showExplanation;
          
          let buttonClasses = `w-full p-4 rounded-xl text-left transition-all duration-200 border-2 `;
          
          if (showResult) {
            if (isCorrect) {
              buttonClasses += 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300';
            } else if (isSelected && !isCorrect) {
              buttonClasses += 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
            } else {
              buttonClasses += isLinearTheme 
                ? 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                : 'border-indigo-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-400';
            }
          } else {
            buttonClasses += isLinearTheme
              ? 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              : 'border-indigo-200 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20';
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              disabled={showExplanation}
              className={buttonClasses}
            >
              <div className="flex items-center justify-between">
                <span className="flex-1">{option}</span>
                {showResult && (
                  <span className="ml-2">
                    {isCorrect ? '✓' : isSelected ? '✗' : ''}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Explicación */}
      {showExplanation && (
        <div className={`p-4 rounded-xl mb-6 ${
          isLinearTheme ? 'bg-slate-50 dark:bg-slate-700' : 'bg-indigo-50 dark:bg-slate-700'
        }`}>
          <div className="flex items-start space-x-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              selectedAnswers[currentQuestionIndex] === currentQuestion.correctAnswer
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
            }`}>
              {selectedAnswers[currentQuestionIndex] === currentQuestion.correctAnswer ? '✓' : '✗'}
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold mb-2 ${
                isLinearTheme ? 'text-slate-900 dark:text-white' : 'text-indigo-900 dark:text-white'
              }`}>
                Explicación
              </h4>
              <p className={`text-sm ${
                isLinearTheme ? 'text-slate-700 dark:text-slate-300' : 'text-indigo-700 dark:text-indigo-300'
              }`}>
                {currentQuestion.explanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botón Siguiente */}
      {showExplanation && (
        <div className="text-center">
          <button
            onClick={handleNextQuestion}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 ${
              isLinearTheme 
                ? 'bg-slate-600 hover:bg-slate-700 text-white'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
            }`}
          >
            {currentQuestionIndex < questions.length - 1 ? 'Siguiente Pregunta' : 'Ver Resultados'} →
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizComponent;
