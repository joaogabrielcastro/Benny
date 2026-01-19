import { forwardRef } from "react";

const Select = forwardRef(
  (
    {
      label,
      name,
      value,
      onChange,
      options = [],
      error,
      helperText,
      required = false,
      disabled = false,
      placeholder = "Selecione...",
      className = "",
      ...props
    },
    ref
  ) => {
    const hasError = error;

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
        <select
          ref={ref}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
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
        >
          <option value="">{placeholder}</option>
          {/* Support both: options prop (array) or explicit children <option> elements */}
          {props.children
            ? props.children
            : options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
        </select>
        {hasError && helperText && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
