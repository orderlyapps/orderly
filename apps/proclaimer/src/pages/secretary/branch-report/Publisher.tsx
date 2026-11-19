import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { Navigate, useParams } from "react-router-dom";
import {
  getPublisherDisplayName,
  parseMonthId,
  previousMonthId,
  PublisherReportView,
  usePermissions,
  usePublishers,
  useSettings,
} from "proclaimer-core";

const PublisherReport = () => {
  const { settings, isLoading: settingsLoading } = useSettings();
  const permissions = usePermissions(settings.congregationId || undefined);
  const { monthId: monthIdParam, publisherId } = useParams<{
    monthId?: string;
    publisherId?: string;
  }>();
  const { publishers } = usePublishers(settings.congregationId || undefined);
  const publisher = publishers.find((p) => p.id === publisherId);
  const latest = previousMonthId();
  const monthId =
    monthIdParam && parseMonthId(monthIdParam) !== null && monthIdParam <= latest
      ? monthIdParam
      : latest;

  const canUseSecretary = permissions.hasSecretary || permissions.isSuperAdmin;
  const isLoading = settingsLoading || !permissions.isLoaded;

  if (!isLoading && !canUseSecretary) {
    return <Navigate to="/home" replace />;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/secretary/branch-report/${monthId}`} />
          </IonButtons>
          <IonTitle>{publisher ? getPublisherDisplayName(publisher) : "Report History"}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 64 }}>
            <IonSpinner name="crescent" />
          </div>
        ) : (
          <PublisherReportView
            monthId={monthId}
            publisherId={publisherId}
            congregationId={settings.congregationId || undefined}
          />
        )}
        <div style={{ paddingBottom: 128 }} />
      </IonContent>
    </IonPage>
  );
};

export default PublisherReport;
