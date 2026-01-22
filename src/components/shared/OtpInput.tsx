"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  className?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({ 
  value, 
  onChange, 
  length = 6, 
  className 
}) => {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [otpValues, setOtpValues] = useState<string[]>(Array(length).fill(""));

  useEffect(() => {
    if (value) {
      const values = value.split("").slice(0, length);
      setOtpValues([...values, ...Array(length - values.length).fill("")]);
    }
  }, [value, length]);

  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return; // Only allow digits
    
    const newValues = [...otpValues];
    newValues[index] = val.slice(-1); // Only take the last character
    setOtpValues(newValues);
    
    const otpString = newValues.join("");
    onChange(otpString);
    
    // Move to next input if a digit was entered
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text");
    const digits = paste.replace(/\D/g, "").split("").slice(0, length);
    
    if (digits.length > 0) {
      const newValues = [...Array(length).fill(""), ...digits].slice(0, length);
      setOtpValues(newValues);
      onChange(newValues.join(""));
      
      // Focus the last filled input or the first empty one
      const lastFilledIndex = digits.length - 1;
      inputRefs.current[Math.min(lastFilledIndex, length - 1)]?.focus();
    }
  };

  return (
    <div className={cn("flex gap-3", className)}>
      {otpValues.map((value, index) => (
        <Input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="w-12 h-12 text-center text-xl font-bold rounded-xl"
        />
      ))}
    </div>
  );
};