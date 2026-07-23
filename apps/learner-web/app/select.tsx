"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { CaretDown, Check } from "@phosphor-icons/react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
  wrapperClassName?: string;
}

interface SelectOption {
  value: string;
  label: string;
  disabled: boolean;
}

function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

function optionsFromChildren(children: ReactNode): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{ children?: ReactNode; disabled?: boolean; value?: number | string }>(child)
    ) {
      return [];
    }
    const label = nodeText(child.props.children).trim();
    return [
      {
        value: String(child.props.value ?? label),
        label,
        disabled: Boolean(child.props.disabled),
      },
    ];
  });
}

function nextEnabledIndex(options: SelectOption[], start: number, direction: 1 | -1): number {
  for (let step = 0; step < options.length; step += 1) {
    const index = (start + step * direction + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

export function Select({
  children,
  className = "",
  defaultValue,
  disabled = false,
  id,
  name,
  onChange,
  onKeyDown,
  value,
  wrapperClassName = "",
  ...props
}: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listboxId = `${triggerId}-listbox`;
  const options = useMemo(() => optionsFromChildren(children), [children]);
  const [internalValue, setInternalValue] = useState(() =>
    String(defaultValue ?? options.find((option) => !option.disabled)?.value ?? ""),
  );
  const [isOpen, setIsOpen] = useState(false);
  const controlledValue = value === undefined ? undefined : String(value);
  const selectedValue = controlledValue ?? internalValue;
  const selectedIndex = options.findIndex((option) => option.value === selectedValue);
  const selectedOption = options[selectedIndex] ?? options.find((option) => !option.disabled);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(selectedIndex, 0));
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [isOpen]);

  const choose = (option: SelectOption) => {
    if (option.disabled) return;
    if (controlledValue === undefined) setInternalValue(option.value);
    onChange?.({
      currentTarget: { name, value: option.value },
      target: { name, value: option.value },
    } as ChangeEvent<HTMLSelectElement>);
    setIsOpen(false);
  };

  const open = () => {
    setActiveIndex(
      selectedIndex >= 0 && !options[selectedIndex]?.disabled
        ? selectedIndex
        : nextEnabledIndex(options, 0, 1),
    );
    setIsOpen(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event as unknown as KeyboardEvent<HTMLSelectElement>);
    if (event.defaultPrevented || disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!isOpen) return open();
      setActiveIndex((current) => nextEnabledIndex(options, current + direction, direction));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) return open();
      const option = options[activeIndex];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <span
      ref={wrapperRef}
      className={`app-select ${wrapperClassName}`}
      data-ui-anchor="select-control"
    >
      {name ? <input type="hidden" name={name} value={selectedOption?.value ?? ""} /> : null}
      <button
        id={triggerId}
        type="button"
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`app-select-trigger ${className}`}
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
      >
        <span>{selectedOption?.label ?? ""}</span>
        <i aria-hidden="true">
          <CaretDown size={14} weight="bold" />
        </i>
      </button>
      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={triggerId}
          className="app-select-menu"
          data-ui-anchor="popover"
        >
          {options.map((option, index) => {
            const selected = option.value === selectedOption?.value;
            return (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                role="option"
                aria-disabled={option.disabled || undefined}
                aria-selected={selected}
                disabled={option.disabled}
                data-active={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                <span>{option.label}</span>
                {selected ? <Check size={16} weight="bold" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </span>
  );
}
