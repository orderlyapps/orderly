import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from "@ionic/react";
import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  BranchReportView,
  parseMonthId,
  previousMonthId,
  usePermissions,
  useSettings,
} from "proclaimer-core";

const BranchReport = () => {
  const router = useIonRouter();
  const { settings, isLoading: settingsLoading } = useSettings();
  const permissions = usePermissions(settings.congregationId || undefined);
  const { monthId: monthIdParam } = useParams<{ monthId?: string }>();
  // IonRouterOutlet remounts parameterized routes when the param changes, so
  // the month lives in state and the URL is synced silently — otherwise the
  // month slide transition would be destroyed on every navigation.
  const [monthId, setMonthId] = useState(() => {
    const latest = previousMonthId();
    return monthIdParam && parseMonthId(monthIdParam) !== null && monthIdParam <= latest
      ? monthIdParam
      : latest;
  });

  const selectMonth = (nextMonthId: string) => {
    setMonthId(nextMonthId);
    window.history.replaceState(null, "", `/secretary/branch-report/${nextMonthId}`);
  };

  const canUseBranchReport =
    permissions.hasElder || permissions.hasSecretary || permissions.isSuperAdmin;
  const isLoading = settingsLoading || !permissions.isLoaded;

  if (!isLoading && !canUseBranchReport) {
    return <Navigate to="/home" replace />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/secretary" />
          </IonButtons>
          <IonTitle>Branch Report</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 64 }}>
            <IonSpinner name="crescent" />
          </div>
        ) : (
          <BranchReportView
            monthId={monthId}
            congregationId={settings.congregationId || undefined}
            onSelectMonth={selectMonth}
            onSelectPublisher={(publisher) => {
              if (publisher.id == null) {
                return;
              }
              router.push(
                `/secretary/branch-report/${monthId}/publisher/${publisher.id}`,
                "forward",
              );
            }}
          />
        )}
        <div style={{ paddingBottom: 128 }} />
      </IonContent>
    </IonPage>
  );
};

export default BranchReport;
