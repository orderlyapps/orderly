import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { homeOutline } from "ionicons/icons";
import { Suspense } from 'react';
import { Spinner } from '../../../shell-components/ionic/spinner';
import { OsanaModal } from 'feature';

export const HomePage = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot='start'>
            <IonBackButton></IonBackButton>
          </IonButtons>
          <IonTitle>Home</IonTitle>
          <IonButtons slot='end'>
            <OsanaModal></OsanaModal>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <Suspense fallback={<Spinner></Spinner>}>
         <div className='full centered'>Home Page</div>
        </Suspense>
      </IonContent>
    </IonPage>
  );
};

export const HomePageContent = 
   {
    label: "Home",
    component: HomePage,
    isTab: true,
    icon: homeOutline,
    path: "/home",
    redirect: true,
  }