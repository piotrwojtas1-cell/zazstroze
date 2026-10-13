import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
}

function FieldShell({ id, label, error, hint, optional, className, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="label">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(opcjonalnie)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-danger-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  return [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
}

export function TextField({ label, error, hint, optional, className, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const generated = useId();
  const id = props.id ?? generated;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <input id={id} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...props} />
    </FieldShell>
  );
}

export function TextAreaField({ label, error, hint, optional, className, ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generated = useId();
  const id = props.id ?? generated;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <textarea id={id} className="input min-h-28" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...props} />
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  hint,
  optional,
  className,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generated = useId();
  const id = props.id ?? generated;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <select id={id} className="input appearance-auto" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: { label: ReactNode; description?: ReactNode; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const generated = useId();
  const id = props.id ?? generated;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-forest-900/30 accent-forest-700"
        aria-describedby={description ? `${id}-desc` : undefined}
        {...props}
      />
      <div className="text-sm leading-snug">
        <label htmlFor={id} className="cursor-pointer font-medium text-ink">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="mt-0.5 text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/** Przełącznik (role="switch") dla zgód i ustawień. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="text-sm">
        <p id={`${id}-l`} className="font-medium text-ink">
          {label}
        </p>
        {description && (
          <p id={`${id}-d`} className="mt-0.5 text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50",
          checked ? "bg-forest-600" : "bg-forest-900/20",
        )}
      >
        <span className={cn("inline-block size-5 rounded-full bg-white shadow transition", checked ? "translate-x-6" : "translate-x-1")} />
      </button>
    </div>
  );
}
