
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

import {
  User,
  Mail,
  Lock,
  Phone,
  Calendar,
  MapPin,
  Stethoscope,
  Activity,
  Award,
  Building2,
  DollarSign,
  Briefcase,
  Shield,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

import './Auth.css';

// Keep this component OUTSIDE Register.
// This prevents React from remounting inputs on every keystroke.
const InputField = ({
  label,
  icon: Icon,
  error,
  touched,
  required,
  showPasswordToggle,
  onBlur,
  ...props
}) => (
  <div className={`form-group ${touched && error ? 'error' : ''}`}>
    <label htmlFor={props.name}>
      {label} {required && <span className="required">*</span>}
    </label>

    <div className="input-wrapper">
      {Icon && <Icon size={18} className="input-icon" />}

      <input
        {...props}
        id={props.name}
        onBlur={onBlur}
        autoComplete={
          props.name === 'email'
            ? 'email'
            : props.name === 'username'
              ? 'username'
              : props.name === 'password'
                ? 'new-password'
                : props.name === 'confirm_password'
                  ? 'new-password'
                  : 'off'
        }
        className={`apple-input ${touched && error ? 'error' : ''}`}
      />

      {showPasswordToggle && (
        <button
          type="button"
          className="password-toggle"
          onClick={showPasswordToggle.onClick}
          aria-label={
            showPasswordToggle.visible
              ? 'Hide password'
              : 'Show password'
          }
        >
          {showPasswordToggle.visible ? (
            <Eye size={18} />
          ) : (
            <EyeOff size={18} />
          )}
        </button>
      )}
    </div>

    <AnimatePresence>
      {touched && error && (
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="error-message"
        >
          <AlertCircle size={14} /> {error}
        </motion.span>
      )}
    </AnimatePresence>
  </div>
);

const SPECIALIZATIONS = [
  'General Practice',
  'Family Medicine',
  'Internal Medicine',
  'Pediatrics',
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Psychiatry',
  'Obstetrics & Gynecology',
  'Orthopedics',
  'Ophthalmology',
  'ENT',
  'Dentistry',
  'Radiology',
  'Surgery',
  'Urology',
  'Oncology',
  'Endocrinology',
  'Gastroenterology',
  'Pulmonology',
  'Nephrology',
  'Other'
];

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    role: 'patient',
    date_of_birth: '',
    phone: '',
    address: '',
    emergency_contact: '',
    specialization: '',
    license_number: '',
    hospital: '',
    years_experience: '',
    consultation_fee: ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Validation Rules
  const validationRules = useMemo(() => ({
    username: [
      {
        validator: (v) => v.trim().length >= 3,
        message: 'Username must be at least 3 characters'
      },
      {
        validator: (v) => /^[a-zA-Z0-9_]+$/.test(v),
        message: 'Only letters, numbers, and underscores'
      }
    ],

    email: [
      {
        validator: (v) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
        message: 'Enter a valid email address'
      }
    ],

    password: [
      {
        validator: (v) => v.length >= 8,
        message: 'Password must be at least 8 characters'
      },
      {
        validator: (v) => /[A-Z]/.test(v),
        message: 'Must contain an uppercase letter'
      },
      {
        validator: (v) => /[0-9]/.test(v),
        message: 'Must contain a number'
      },
      {
        validator: (v) => /[!@#$%^&*]/.test(v),
        message: 'Must contain a special character'
      }
    ],

    confirm_password: [
      {
        validator: (v) => v === formData.password,
        message: 'Passwords do not match'
      }
    ],

    role: [
      {
        validator: (v) => ['patient', 'doctor'].includes(v),
        message: 'Select a valid role'
      }
    ],

    date_of_birth: [
      {
        validator: (v) => !!v,
        message: 'Date of birth is required'
      },
      {
        validator: (v) => {
          if (!v) return false;

          const date = new Date(`${v}T00:00:00`);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          return (
            !Number.isNaN(date.getTime()) &&
            date < today
          );
        },
        message: 'Date of birth must be in the past'
      }
    ],

    phone: [
      {
        validator: (v) => /^\+?[\d\s-]{10,}$/.test(v.trim()),
        message: 'Enter a valid phone number'
      }
    ],

    address: [
      {
        validator: (v) => v.trim().length >= 10,
        message: 'Address must be at least 10 characters'
      }
    ],

    emergency_contact: [
      {
        validator: (v) => !!v.trim(),
        message: 'Emergency contact is required'
      }
    ],

    specialization: [
      {
        validator: (v) => SPECIALIZATIONS.includes(v),
        message: 'Select a valid specialization'
      }
    ],

    license_number: [
      {
        validator: (v) => v.trim().length >= 5,
        message: 'Enter a valid license number'
      }
    ],

    hospital: [
      {
        validator: (v) => v.trim().length >= 3,
        message: 'Hospital name must be at least 3 characters'
      }
    ],

    years_experience: [
      {
        validator: (v) =>
          v !== '' &&
          Number.isInteger(Number(v)) &&
          Number(v) >= 0 &&
          Number(v) <= 80,
        message: 'Enter a whole number between 0 and 80'
      }
    ],

    consultation_fee: [
      {
        validator: (v) =>
          v !== '' &&
          Number.isFinite(Number(v)) &&
          Number(v) >= 0,
        message: 'Enter a valid consultation fee'
      }
    ]
  }), [formData.password]);

  // Validation Logic
  const validateField = useCallback((name, value) => {
    const rules = validationRules[name] || [];

    for (const rule of rules) {
      if (!rule.validator(value)) {
        return rule.message;
      }
    }

    return '';
  }, [validationRules]);

  const shouldValidateField = useCallback((field) => {
    const patientOnlyFields = [
      'date_of_birth',
      'phone',
      'address',
      'emergency_contact'
    ];

    const doctorOnlyFields = [
      'specialization',
      'license_number',
      'hospital',
      'years_experience',
      'consultation_fee'
    ];

    if (
      formData.role === 'patient' &&
      doctorOnlyFields.includes(field)
    ) {
      return false;
    }

    if (
      formData.role === 'doctor' &&
      patientOnlyFields.includes(field)
    ) {
      return false;
    }

    return true;
  }, [formData.role]);

  const getStepFields = useCallback((step) => {
    switch (step) {
      case 1:
        return [
          'username',
          'email',
          'password',
          'confirm_password'
        ];

      case 2:
        return [
          'first_name',
          'last_name',
          'role'
        ];

      case 3:
        return formData.role === 'doctor'
          ? [
              'specialization',
              'license_number',
              'hospital',
              'years_experience',
              'consultation_fee'
            ]
          : [
              'date_of_birth',
              'phone',
              'address',
              'emergency_contact'
            ];

      default:
        return [];
    }
  }, [formData.role]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    Object.keys(formData).forEach((field) => {
      if (!shouldValidateField(field)) return;

      const error = validateField(field, formData[field]);

      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);

    const allTouched = {};
    Object.keys(formData).forEach((field) => {
      if (shouldValidateField(field)) {
        allTouched[field] = true;
      }
    });

    setTouched((prev) => ({
      ...prev,
      ...allTouched
    }));

    return Object.keys(newErrors).length === 0;
  }, [formData, validateField, shouldValidateField]);

  // Handle input changes
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (touched[name]) {
      const error = validateField(name, value);

      setErrors((prev) => ({
        ...prev,
        [name]: error
      }));
    }

    if (name === 'password' && touched.confirm_password) {
      setErrors((prev) => ({
        ...prev,
        confirm_password:
          value === formData.confirm_password
            ? ''
            : 'Passwords do not match'
      }));
    }
  }, [formData.confirm_password, touched, validateField]);

  // Handle input blur
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;

    setTouched((prev) => ({
      ...prev,
      [name]: true
    }));

    if (!shouldValidateField(name)) return;

    const error = validateField(name, value);

    setErrors((prev) => ({
      ...prev,
      [name]: error
    }));
  }, [shouldValidateField, validateField]);

  // Steps
  const steps = [
    {
      id: 1,
      title: 'Account Info',
      icon: User
    },
    {
      id: 2,
      title: 'Personal Details',
      icon: Shield
    },
    {
      id: 3,
      title: formData.role === 'doctor'
        ? 'Professional Info'
        : 'Medical Info',
      icon: formData.role === 'doctor'
        ? Stethoscope
        : Activity
    }
  ];

  // Navigate to next step
  const nextStep = () => {
    const fields = getStepFields(currentStep);
    const newErrors = {};
    const newTouched = {};

    fields.forEach((field) => {
      newTouched[field] = true;

      if (!shouldValidateField(field)) return;

      const error = validateField(field, formData[field]);

      if (error) {
        newErrors[field] = error;
      }
    });

    setTouched((prev) => ({
      ...prev,
      ...newTouched
    }));

    setErrors((prev) => ({
      ...prev,
      ...newErrors
    }));

    if (Object.keys(newErrors).length === 0) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Change registration role
  const changeRole = (role) => {
    setFormData((prev) => ({
      ...prev,
      role
    }));

    setErrors({});
    setTouched({});
    setServerError('');
  };

  // Submit Registration
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currentStep < steps.length) {
      nextStep();
      return;
    }

    if (!validateForm()) {
      const firstError = document.querySelector('.error-message');

      if (firstError) {
        firstError.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }

      return;
    }

    setLoading(true);
    setServerError('');

    try {
      const data = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirm_password: formData.confirm_password,
        role: formData.role,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim()
      };

      if (formData.role === 'patient') {
        data.date_of_birth = formData.date_of_birth;
        data.phone = formData.phone.trim();
        data.address = formData.address.trim();
        data.emergency_contact = formData.emergency_contact.trim();
      } else {
        data.specialization = formData.specialization;
        data.license_number = formData.license_number.trim();
        data.hospital = formData.hospital.trim();
        data.years_experience = Number(formData.years_experience);
        data.consultation_fee = Number(formData.consultation_fee);
      }

      const result = await register(data);

      if (result?.success) {
        setSuccessMessage(
          'Account created successfully! Redirecting to login...'
        );

        setTimeout(() => {
          navigate('/login', {
            state: {
              message: 'Account created! Please login.'
            }
          });
        }, 2000);
      } else {
        setServerError(
          result?.message || 'Registration failed. Please try again.'
        );
      }
    } catch (error) {
      const responseData = error?.response?.data;

      const backendMessage =
        responseData?.message ||
        responseData?.detail ||
        (responseData && typeof responseData === 'object'
          ? Object.entries(responseData)
              .map(([field, messages]) => {
                const message = Array.isArray(messages)
                  ? messages.join(', ')
                  : String(messages);

                return `${field}: ${message}`;
              })
              .join(' | ')
          : '');

      setServerError(
        backendMessage ||
        error.message ||
        'An unexpected error occurred.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step Indicator
  const StepIndicator = () => (
    <div className="step-indicator">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <React.Fragment key={step.id}>
            <div
              className={`step ${
                isActive ? 'active' : ''
              } ${isCompleted ? 'completed' : ''}`}
            >
              <div className="step-circle">
                {isCompleted ? (
                  <CheckCircle size={20} />
                ) : (
                  <Icon size={20} />
                )}
              </div>

              <span className="step-label">
                {step.title}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`step-line ${
                  isCompleted ? 'completed' : ''
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Reusable input props
  const renderInput = (props) => (
    <InputField
      {...props}
      touched={Boolean(touched[props.name])}
      onBlur={handleBlur}
      onChange={handleChange}
    />
  );

  return (
    <div className="auth-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="auth-card register-card apple-card"
      >
        <div className="auth-header">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.2,
              type: 'spring'
            }}
            className="auth-icon"
          >
            🏥
          </motion.span>

          <h2>Create Account</h2>
          <p>Join Telemedicine Platform</p>
        </div>

        {successMessage ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="success-message"
          >
            <CheckCircle size={48} />
            <h3>Success!</h3>
            <p>{successMessage}</p>
          </motion.div>
        ) : (
          <>
            <StepIndicator />

            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="server-error"
              >
                <AlertCircle size={20} />
                {serverError}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* STEP 1: ACCOUNT INFORMATION */}
                  {currentStep === 1 && (
                    <div className="step-content">
                      {renderInput({
                        label: 'Username',
                        name: 'username',
                        icon: User,
                        type: 'text',
                        value: formData.username,
                        placeholder: 'Choose a username',
                        error: errors.username,
                        required: true
                      })}

                      {renderInput({
                        label: 'Email',
                        name: 'email',
                        icon: Mail,
                        type: 'email',
                        value: formData.email,
                        placeholder: 'Enter your email',
                        error: errors.email,
                        required: true
                      })}

                      {renderInput({
                        label: 'Password',
                        name: 'password',
                        icon: Lock,
                        type: showPassword ? 'text' : 'password',
                        value: formData.password,
                        placeholder: 'Min 8 characters',
                        error: errors.password,
                        required: true,
                        showPasswordToggle: {
                          visible: showPassword,
                          onClick: () =>
                            setShowPassword((prev) => !prev)
                        }
                      })}

                      {renderInput({
                        label: 'Confirm Password',
                        name: 'confirm_password',
                        icon: Lock,
                        type: showConfirmPassword ? 'text' : 'password',
                        value: formData.confirm_password,
                        placeholder: 'Confirm password',
                        error: errors.confirm_password,
                        required: true,
                        showPasswordToggle: {
                          visible: showConfirmPassword,
                          onClick: () =>
                            setShowConfirmPassword((prev) => !prev)
                        }
                      })}
                    </div>
                  )}

                  {/* STEP 2: PERSONAL DETAILS */}
                  {currentStep === 2 && (
                    <div className="step-content">
                      <div className="form-row">
                        {renderInput({
                          label: 'First Name',
                          name: 'first_name',
                          icon: User,
                          type: 'text',
                          value: formData.first_name,
                          placeholder: 'First name'
                        })}

                        {renderInput({
                          label: 'Last Name',
                          name: 'last_name',
                          icon: User,
                          type: 'text',
                          value: formData.last_name,
                          placeholder: 'Last name'
                        })}
                      </div>

                      <div className="form-group">
                        <label>
                          I am a <span className="required">*</span>
                        </label>

                        <div className="role-selector">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            className={`role-option ${
                              formData.role === 'patient'
                                ? 'selected'
                                : ''
                            }`}
                            onClick={() => changeRole('patient')}
                          >
                            <Activity size={24} />
                            <span>Patient</span>
                          </motion.button>

                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            className={`role-option ${
                              formData.role === 'doctor'
                                ? 'selected'
                                : ''
                            }`}
                            onClick={() => changeRole('doctor')}
                          >
                            <Stethoscope size={24} />
                            <span>Doctor</span>
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: ROLE-SPECIFIC INFORMATION */}
                  {currentStep === 3 && (
                    <div className="step-content">
                      {formData.role === 'patient' ? (
                        <div className="role-fields">
                          <h4>
                            <Activity size={18} />
                            Patient Information
                          </h4>

                          {renderInput({
                            label: 'Date of Birth',
                            name: 'date_of_birth',
                            icon: Calendar,
                            type: 'date',
                            value: formData.date_of_birth,
                            error: errors.date_of_birth,
                            required: true
                          })}

                          {renderInput({
                            label: 'Phone Number',
                            name: 'phone',
                            icon: Phone,
                            type: 'tel',
                            value: formData.phone,
                            placeholder: '08012345678',
                            error: errors.phone,
                            required: true
                          })}

                          {renderInput({
                            label: 'Address',
                            name: 'address',
                            icon: MapPin,
                            type: 'text',
                            value: formData.address,
                            placeholder: 'Your residential address',
                            error: errors.address,
                            required: true
                          })}

                          {renderInput({
                            label: 'Emergency Contact',
                            name: 'emergency_contact',
                            icon: Phone,
                            type: 'tel',
                            value: formData.emergency_contact,
                            placeholder: 'Emergency contact number',
                            error: errors.emergency_contact,
                            required: true
                          })}
                        </div>
                      ) : (
                        <div className="role-fields">
                          <h4>
                            <Stethoscope size={18} />
                            Professional Information
                          </h4>

                          <div className="form-group">
                            <label htmlFor="specialization">
                              Specialization
                              <span className="required">*</span>
                            </label>

                            <select
                              id="specialization"
                              name="specialization"
                              value={formData.specialization}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              className={`apple-input ${
                                touched.specialization &&
                                errors.specialization
                                  ? 'error'
                                  : ''
                              }`}
                            >
                              <option value="">
                                Select Specialization
                              </option>

                              {SPECIALIZATIONS.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>

                            {touched.specialization &&
                              errors.specialization && (
                                <span className="error-message">
                                  <AlertCircle size={14} />
                                  {errors.specialization}
                                </span>
                              )}
                          </div>

                          {renderInput({
                            label: 'License Number',
                            name: 'license_number',
                            icon: Award,
                            type: 'text',
                            value: formData.license_number,
                            placeholder: 'Medical license number',
                            error: errors.license_number,
                            required: true
                          })}

                          {renderInput({
                            label: 'Hospital/Clinic',
                            name: 'hospital',
                            icon: Building2,
                            type: 'text',
                            value: formData.hospital,
                            placeholder: 'Hospital or clinic name',
                            error: errors.hospital,
                            required: true
                          })}

                          <div className="form-row">
                            {renderInput({
                              label: 'Years Experience',
                              name: 'years_experience',
                              icon: Briefcase,
                              type: 'number',
                              value: formData.years_experience,
                              placeholder: '0',
                              min: '0',
                              max: '80',
                              step: '1',
                              error: errors.years_experience,
                              required: true
                            })}

                            {renderInput({
                              label: 'Consultation Fee',
                              name: 'consultation_fee',
                              icon: DollarSign,
                              type: 'number',
                              value: formData.consultation_fee,
                              placeholder: '0.00',
                              min: '0',
                              step: '0.01',
                              error: errors.consultation_fee,
                              required: true
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* FORM NAVIGATION */}
              <div className="form-actions">
                {currentStep > 1 && (
                  <button
                    type="button"
                    className="btn-secondary apple-btn"
                    onClick={prevStep}
                    disabled={loading}
                  >
                    <ArrowLeft size={18} />
                    Back
                  </button>
                )}

                {currentStep < steps.length ? (
                  <button
                    type="button"
                    className="btn-primary apple-btn"
                    onClick={nextStep}
                    disabled={loading}
                  >
                    Next
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn-primary apple-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        Create Account
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </>
        )}

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
