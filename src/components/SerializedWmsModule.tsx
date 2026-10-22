import React from "react";
import {
  CustodyState,
  validateHardwareIdentifiers,
} from "../domain/fieldopsCore.js";

export interface SerializedEquipmentItem {
  id: string;
  modelName: string;
  gponSerial: string;
  macAddress: string;
  custodyState: CustodyState;
  custodianTechName?: string;
}

export interface SerializedWmsModuleProps {
  items: SerializedEquipmentItem[];
}

export const SerializedWmsModule: React.FC<SerializedWmsModuleProps> = ({
  items,
}) => {
  return (
    <section aria-label="FieldOps Serialized WMS">
      <h3>Serialized ONU / Router Custody Control (WMS)</h3>
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>GPON Serial</th>
            <th>MAC Address</th>
            <th>Custody State</th>
            <th>Identifier Integrity</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const check = validateHardwareIdentifiers(
              item.gponSerial,
              item.macAddress
            );
            return (
              <tr key={item.id}>
                <td>{item.modelName}</td>
                <td>{check.normalizedSerial}</td>
                <td>{check.normalizedMac}</td>
                <td>{item.custodyState}</td>
                <td>{check.valid ? "VERIFIED" : check.error}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};
