import React from "react";
import {
  WorkOrderCard,
  WorkOrderPhase,
  validateKanbanPhaseTransition,
} from "../domain/fieldopsCore.js";

export interface DynamicKanbanBoardProps {
  tenantName: string;
  cards: WorkOrderCard[];
  onPhaseChange: (cardId: string, nextPhase: WorkOrderPhase) => void;
  onValidationRejected?: (cardId: string, reason: string) => void;
}

const ORDERED_PHASES: WorkOrderPhase[] = [
  "SALES_INTAKE",
  "TECHNICAL_FEASIBILITY",
  "READY_TO_INSTALL",
  "ASSIGNED_TO_CREW",
  "IN_PROGRESS",
  "PENDING_ACTIVATION",
  "ACTIVE_SUBSCRIBER",
];

export const DynamicKanbanBoard: React.FC<DynamicKanbanBoardProps> = ({
  tenantName,
  cards,
  onPhaseChange,
  onValidationRejected,
}) => {
  const handleAttemptMove = (card: WorkOrderCard, targetPhase: WorkOrderPhase) => {
    const check = validateKanbanPhaseTransition(card, targetPhase);
    if (!check.allowed) {
      onValidationRejected?.(card.id, check.reason || "Transition blocked by field gate.");
      return;
    }
    onPhaseChange(card.id, targetPhase);
  };

  return (
    <section aria-label={`FieldOps Kanban - ${tenantName}`}>
      <header>
        <h2>FieldOps FTTH Dispatch Board — {tenantName}</h2>
      </header>
      <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
        {ORDERED_PHASES.map((phase) => {
          const columnCards = cards.filter((c) => c.phase === phase);
          return (
            <div key={phase} style={{ minWidth: 260 }}>
              <h3>
                {phase} ({columnCards.length})
              </h3>
              {columnCards.map((card) => (
                <article key={card.id} style={{ padding: 12, marginBottom: 8 }}>
                  <strong>{card.subscriberName}</strong>
                  <p>Evidence Photos: {card.evidenceUrls.length}</p>
                  <p>Assigned Serials: {card.assignedSerials.join(", ") || "None"}</p>
                  <button
                    type="button"
                    onClick={() => handleAttemptMove(card, "PENDING_ACTIVATION")}
                  >
                    Advance to Activation
                  </button>
                </article>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
};
