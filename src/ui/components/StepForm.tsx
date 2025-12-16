import React, { useState } from 'react';
import { SelectItem, SelectList } from './SelectList';
import { TextInput } from './TextInput';

export interface TextStep {
  type: 'text';
  key: string;
  label: string;
  placeholder?: string;
  mask?: boolean;
}

export interface SelectStep {
  type: 'select';
  key: string;
  label: string;
  options: {value: string; label: string;}[];
}

export type FormStep = TextStep | SelectStep;

interface StepFormProps<T extends Record<string, string>> {
  steps: FormStep[];
  initialValues: T;
  onSubmit: (values: T) => void;
  onCancel: () => void;
}

export function StepForm<T extends Record<string, string>>(
  {steps, initialValues, onSubmit, onCancel}: StepFormProps<T>,
): React.ReactElement {
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<T>(initialValues);
  const [selectIndex, setSelectIndex] = useState(0);

  const currentStep = steps[stepIndex];
  const total = steps.length;
  const label = `Step ${stepIndex + 1}/${total}: ${currentStep.label}`;

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onSubmit(values);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    } else {
      onCancel();
    }
  };

  const updateValue = (key: string, value: string) => {
    setValues({...values, [key]: value});
  };

  if (currentStep.type === 'select') {
    const items: SelectItem[] = currentStep.options.map(opt => ({id: opt.value, label: opt.label}));

    return (
      <SelectList
        title={label}
        items={items}
        selectedIndex={selectIndex}
        onSelect={idx => {
          setSelectIndex(idx);
          if (items[idx]) updateValue(currentStep.key, items[idx].id);
        }}
        onConfirm={() => handleNext()}
        onCancel={handleBack}
      />
    );
  }

  return (
    <TextInput
      label={label}
      value={values[currentStep.key] || ''}
      onChange={v => updateValue(currentStep.key, v)}
      onSubmit={handleNext}
      onCancel={handleBack}
      mask={currentStep.mask}
      placeholder={currentStep.placeholder}
    />
  );
}
