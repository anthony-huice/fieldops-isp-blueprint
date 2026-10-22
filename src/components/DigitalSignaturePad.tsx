import React from "react";
import { validateSignatureStrokeSvg } from "../domain/fieldopsCore.js";

export interface DigitalSignaturePadProps {
  svgPathData: string;
  subscriberName: string;
  onConfirmSignature: (svgPath: string) => void;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  svgPathData,
  subscriberName,
  onConfirmSignature,
}) => {
  const isValid = validateSignatureStrokeSvg(svgPathData);

  return (
    <section aria-label="Digital Handwritten Signature Pad">
      <h3>Customer Installation Conformity — {subscriberName}</h3>
      <svg width={320} height={140} viewBox="0 0 320 140">
        <path d={svgPathData} stroke="#0f172a" strokeWidth={2.2} fill="none" />
      </svg>
      <button
        type="button"
        disabled={!isValid}
        onClick={() => isValid && onConfirmSignature(svgPathData)}
      >
        {isValid ? "Confirm Digital Signature" : "Awaiting Valid Stroke"}
      </button>
    </section>
  );
};
