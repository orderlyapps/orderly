import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { BankCategoriesView } from "subbie-core";

const Categories = () => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton defaultHref="/banking" text="" />
        </IonButtons>
        <IonTitle>Categories</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent fullscreen>
      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">Categories</IonTitle>
        </IonToolbar>
      </IonHeader>
      <BankCategoriesView />
    </IonContent>
  </IonPage>
);

export default Categories;
