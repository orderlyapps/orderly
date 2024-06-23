import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { settingsOutline, homeOutline } from "ionicons/icons";
import { Spinner } from '../../../shell-components/ionic/spinner';
import { Suspense } from 'react';

export const SettingsPage = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot='start'>
            <IonBackButton></IonBackButton>
          </IonButtons>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <Suspense fallback={<Spinner></Spinner>}>
         <div className='full centered'>Settings Page</div>
        </Suspense>
      </IonContent>
    </IonPage>
  );
};

export const SettingsPageContent = 
   {
    label: "Settings",
    component: SettingsPage,
    isTab: true,
    icon: settingsOutline,
    path: "/settings",
    redirect: true,
  }