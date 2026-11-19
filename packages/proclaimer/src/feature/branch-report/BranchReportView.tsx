import { IonText } from "@ionic/react";

import { monthLabel, previousMonthId, relativeMonthLabel } from "../../util/month.ts";
import { SlideTransition } from "../meeting/SlideTransition.tsx";
import { MonthNavigator } from "./MonthNavigator.tsx";

export interface BranchReportViewProps {
  monthId: string;
  /** Reserved for the report data hook; unused until report content lands. */
  congregationId?: string | null;
  onSelectMonth?: (monthId: string) => void;
}

export function BranchReportView({ monthId, onSelectMonth }: BranchReportViewProps) {
  return (
    <>
      <MonthNavigator
        monthId={monthId}
        label={monthLabel(monthId)}
        relativeLabel={relativeMonthLabel(monthId)}
        latestMonthId={previousMonthId()}
        onSelectMonth={onSelectMonth}
      />
      <div style={{ height: 24 }} />
      <SlideTransition transitionKey={monthId}>
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <IonText color="medium">
            <p>No branch report for {monthLabel(monthId)} yet.</p>
          </IonText>
        </div>
      </SlideTransition>
    </>
  );
}
