/**
 * Form controls for the garden app.
 *
 * `CpcInput` from the shared library is a terminal-style field with a simulated
 * caret, which cannot host a native date picker, a number spinner or a textarea.
 * Rather than bend it out of shape, these keep the CPC look with plain native
 * inputs. Buttons still come from `CpcButton`.
 */

const fieldClass =
  'w-full border-2 border-cpc-green-900 bg-black px-2 py-1 font-mono text-xs text-cpc-green-500 ' +
  'outline-none focus:border-cpc-green-500';

interface LabelledProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

function Labelled({ label, children, hint }: LabelledProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-cpc-green-900">{label}</span>
      {children}
      {hint && <span className="text-xs text-cpc-green-900">{hint}</span>}
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}

export function TextField({ label, value, onChange, placeholder, hint }: TextFieldProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <Labelled label={label} hint={hint}>
      <input
        type="text"
        className={fieldClass}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
      />
    </Labelled>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

export function TextAreaField({ label, value, onChange, rows = 4 }: TextAreaFieldProps) {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <Labelled label={label}>
      <textarea className={`${fieldClass} resize-y`} rows={rows} value={value} onChange={handleChange} />
    </Labelled>
  );
}

interface DateFieldProps {
  label: string;
  /** YYYY-MM-DD, the format the API speaks. */
  value: string;
  onChange: (value: string) => void;
}

export function DateField({ label, value, onChange }: DateFieldProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <Labelled label={label}>
      {/* A native date input already emits YYYY-MM-DD, so no conversion here. */}
      <input type="date" className={fieldClass} value={value} onChange={handleChange} />
    </Labelled>
  );
}

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  step?: number;
}

export function NumberField({ label, value, onChange, min, step }: NumberFieldProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <Labelled label={label}>
      <input
        type="number"
        className={fieldClass}
        value={value}
        min={min}
        step={step}
        onChange={handleChange}
      />
    </Labelled>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({ label, value, onChange, options, placeholder }: SelectFieldProps) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value);
  };

  return (
    <Labelled label={label}>
      <select className={fieldClass} value={value} onChange={handleChange}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Labelled>
  );
}
