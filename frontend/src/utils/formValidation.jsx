import { useState } from "react";

// Hook customizado para validação de formulários
export function useFormValidation(initialValues, validationRules) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = (fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules) return "";

    for (const rule of rules) {
      const error = rule(value, values);
      if (error) return error;
    }
    return "";
  };

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));

    // Validar apenas se o campo já foi tocado
    if (touched[name]) {
      const error = validate(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validate(name, values[name]);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateAll = () => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach((fieldName) => {
      const error = validate(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(
      Object.keys(validationRules).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {})
    );

    return isValid;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    setValues,
  };
}

// Regras de validação reutilizáveis
export const validationRules = {
  required: (value) => {
    if (!value || (typeof value === "string" && value.trim() === "")) {
      return "Este campo é obrigatório";
    }
    return "";
  },

  email: (value) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "E-mail inválido";
    }
    return "";
  },

  telefone: (value) => {
    if (value && !/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/.test(value)) {
      return "Telefone inválido. Use o formato (XX) XXXXX-XXXX";
    }
    return "";
  },

  cpf: (value) => {
    if (!value) return "";
    const cpf = value.replace(/\D/g, "");
    if (cpf.length !== 11) {
      return "CPF deve ter 11 dígitos";
    }
    // Validação básica de CPF
    if (/^(\d)\1{10}$/.test(cpf)) {
      return "CPF inválido";
    }
    return "";
  },

  placa: (value) => {
    if (value && !/^[A-Z]{3}-?\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/.test(value)) {
      return "Placa inválida. Use ABC-1234 ou ABC1D23";
    }
    return "";
  },

  positivo: (value) => {
    if (value && parseFloat(value) <= 0) {
      return "Valor deve ser maior que zero";
    }
    return "";
  },

  minLength: (min) => (value) => {
    if (value && value.length < min) {
      return `Mínimo de ${min} caracteres`;
    }
    return "";
  },

  maxLength: (max) => (value) => {
    if (value && value.length > max) {
      return `Máximo de ${max} caracteres`;
    }
    return "";
  },

  numero: (value) => {
    if (value && isNaN(value)) {
      return "Deve ser um número válido";
    }
    return "";
  },

  min: (minValue) => (value) => {
    if (value && parseFloat(value) < minValue) {
      return `Valor mínimo é ${minValue}`;
    }
    return "";
  },

  max: (maxValue) => (value) => {
    if (value && parseFloat(value) > maxValue) {
      return `Valor máximo é ${maxValue}`;
    }
    return "";
  },
};

// Componente de input com validação
export function ValidatedInput({
  label,
  name,
  type = "text",
  value,
  error,
  touched,
  onChange,
  onBlur,
  placeholder,
  required = false,
  className = "",
  ...props
}) {
  const showError = touched && error;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={() => onBlur(name)}
        placeholder={placeholder}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 
          ${
            showError
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
          }
          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500`}
        {...props}
      />
      {showError && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

// Componente de select com validação
export function ValidatedSelect({
  label,
  name,
  value,
  error,
  touched,
  onChange,
  onBlur,
  options,
  required = false,
  className = "",
  ...props
}) {
  const showError = touched && error;

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={() => onBlur(name)}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 
          ${
            showError
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
          }
          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {showError && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
