import { useState, forwardRef } from "react";

const Input = forwardRef(
  (
    {
      label,
      name,
      type = "text",
      value,
      onChange,
      onBlur,
      error,
      helperText,
      required = false,
      disabled = false,
      placeholder,
      mask,
      validator,
      maxLength,
      className = "",
      ...props
    },
    ref
  ) => {
    const [touched, setTouched] = useState(false);
    const [localError, setLocalError] = useState("");

    const handleChange = (e) => {
      let newValue = e.target.value;

      // Aplica máscara se fornecida
      if (mask) {
        newValue = mask(newValue);
      }

      // Atualiza valor
      onChange(e);

      // Valida se touched
      if (touched && validator) {
        const isValid = validator(newValue);
        setLocalError(isValid ? "" : helperText || "Valor inválido");
      }
    };

    const handleBlur = (e) => {
      setTouched(true);

      // Valida no blur
      if (validator) {
        const isValid = validator(e.target.value);
        setLocalError(isValid ? "" : helperText || "Valor inválido");
      }

      if (onBlur) {
        onBlur(e);
      }
    };

    const displayError = error || localError;
    const hasError = touched && displayError;

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label
            htmlFor={name}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors
          ${
            hasError
              ? "border-red-500 focus:ring-red-500 dark:border-red-600"
              : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
          }
          ${
            disabled
              ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
              : "bg-white dark:bg-gray-700"
          }
          dark:text-white
        `}
          {...props}
        />
        {hasError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {displayError}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
