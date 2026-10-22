import React from "react";
import {
  GpsCoordinate,
  calculateHaversineDistanceMeters,
} from "../domain/fieldopsCore.js";

export interface GpsPhotoEvidenceModuleProps {
  napLocation: GpsCoordinate;
  premisesLocation: GpsCoordinate;
  maxAllowedDropMeters?: number;
  evidenceUrls: string[];
}

export const GpsPhotoEvidenceModule: React.FC<GpsPhotoEvidenceModuleProps> = ({
  napLocation,
  premisesLocation,
  maxAllowedDropMeters = 250,
  evidenceUrls,
}) => {
  const dropDistanceMeters = calculateHaversineDistanceMeters(
    napLocation,
    premisesLocation
  );
  const withinBudget = dropDistanceMeters <= maxAllowedDropMeters;

  return (
    <section aria-label="Georeferenced FTTH Evidence">
      <h3>Georeferenced Field Verification (NAP to Premises)</h3>
      <p>
        Estimated Fiber Drop Distance: <strong>{dropDistanceMeters} m</strong>{" "}
        ({withinBudget ? "Within Optical Budget" : "Exceeds Drop Threshold"})
      </p>
      <p>Captured GeoPhotos: {evidenceUrls.length}</p>
    </section>
  );
};
