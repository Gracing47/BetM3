import React from 'react';

interface ButtonProps {
  title: string;
  onClick: () => void;
  widthFull?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const LoadingSpinner = () => (
  <svg 
    className="animate-spin h-5 w-5 text-white" 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24"
  >
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="4"
    />
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const Button: React.FC<ButtonProps> = ({
  title,
  onClick,
  widthFull = false,
  disabled = false,
  loading = false,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${widthFull ? "w-full" : "px-6"}
        ${className}
        py-3
        flex
        justify-center
        items-center
        gap-2
        font-semibold
        bg-primary
        text-white
        rounded-md
        transition-all
        duration-200
        ${disabled || loading ? 
          'opacity-50 cursor-not-allowed' : 
          'hover:bg-primary-dark hover:shadow-md active:transform active:scale-[0.99]'
        }
      `}
    >
      {loading ? (
        <>
          <LoadingSpinner />
          <span>Processing...</span>
        </>
      ) : (
        title
      )}
    </button>
  );
};

export default Button;
