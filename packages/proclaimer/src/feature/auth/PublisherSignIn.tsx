import { useEffect, useRef, useState } from "react";

import {
  IonButton,
  IonIcon,
  IonInput,
  IonInputOtp,
  IonItem,
  IonItemGroup,
  IonList,
  IonNote,
  IonSpinner,
} from "@ionic/react";
import { checkmarkCircle } from "ionicons/icons";

import type { Session } from "@supabase/supabase-js";

import { getSupabaseClient, type BackendSupabaseClient } from "../backend/supabase.ts";
import { sendPublisherOtp, signInPublisherWithPassword, verifyPublisherOtp } from "./actions.ts";
import { publisherAuthEmail } from "./email.ts";

const OTP_LENGTH = 6;

type BusyAction = "code" | "signin" | "signout";

const BUSY_LABELS: Record<BusyAction, string> = {
  code: "Sending code…",
  signin: "Signing in…",
  signout: "Signing out…",
};

export interface PublisherSignInProps {
  publisherId: string;
  client?: BackendSupabaseClient;
  onSignIn?: (session: Session | null) => void;
}

export const PublisherSignIn = ({ publisherId, client, onSignIn }: PublisherSignInProps) => {
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const verifyingRef = useRef(false);
  const lastEmailRef = useRef<string | null>(null);
  const onSignInRef = useRef(onSignIn);
  onSignInRef.current = onSignIn;
  const clientRef = useRef(client);
  clientRef.current = client;

  const email = publisherAuthEmail(publisherId);
  const isBusy = busyAction !== null;

  const resolveClient = (): BackendSupabaseClient | null => {
    if (clientRef.current) {
      return clientRef.current;
    }
    try {
      return getSupabaseClient();
    } catch {
      return null;
    }
  };

  const sendOtp = async () => {
    const supabase = resolveClient();
    if (!supabase) {
      setError("Sign-in is unavailable right now");
      return;
    }
    setBusyAction("code");
    setError(null);
    const result = await sendPublisherOtp(supabase, email);
    setBusyAction(null);
    if (result.error) {
      setError(result.error);
    }
  };

  const handleSignedIn = (session: Session | null) => {
    setBusyAction(null);
    setError(null);
    setIsSignedIn(true);
    onSignInRef.current?.(session);
  };

  // A fresh code is generated when the screen opens (unless this device is
  // already signed in to this account); the congregation admin can read it
  // from the auth OTP log and pass it to the publisher.
  useEffect(() => {
    if (lastEmailRef.current === email) {
      return;
    }
    lastEmailRef.current = email;
    setIsSignedIn(false);
    setOtp("");
    setPassword("");
    setError(null);

    const initialise = async () => {
      const supabase = resolveClient();
      if (!supabase) {
        setError("Sign-in is unavailable right now");
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session && data.session.user.email === email) {
          setIsSignedIn(true);
          onSignInRef.current?.(data.session);
          return;
        }
      } catch {
        // fall through and offer sign-in
      }
      await sendOtp();
    };
    void initialise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const verifyOtp = async (token: string) => {
    const supabase = resolveClient();
    if (!supabase) {
      setError("Sign-in is unavailable right now");
      return;
    }
    if (verifyingRef.current) {
      return;
    }
    verifyingRef.current = true;
    setBusyAction("signin");
    setError(null);
    const result = await verifyPublisherOtp(supabase, email, token);
    verifyingRef.current = false;
    if (result.error) {
      setBusyAction(null);
      setError(result.error);
      setOtp("");
      return;
    }
    handleSignedIn(result.session);
  };

  const signInWithPassword = async () => {
    const supabase = resolveClient();
    if (!supabase) {
      setError("Sign-in is unavailable right now");
      return;
    }
    setBusyAction("signin");
    setError(null);
    const result = await signInPublisherWithPassword(supabase, email, password);
    if (result.error) {
      setBusyAction(null);
      setError(result.error);
      return;
    }
    handleSignedIn(result.session);
  };

  const signOut = async () => {
    const supabase = resolveClient();
    setBusyAction("signout");
    if (supabase) {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // signing out is best-effort
      }
    }
    setBusyAction(null);
    setIsSignedIn(false);
    setOtp("");
    setPassword("");
  };

  if (isSignedIn) {
    return (
      <IonList inset>
        <IonItemGroup>
          <IonItem lines="none">
            <IonIcon icon={checkmarkCircle} color="success" slot="start" />
            <IonNote className="ion-padding-start">You are signed in</IonNote>
            <IonButton
              slot="end"
              size="small"
              fill="clear"
              disabled={isBusy}
              onClick={() => {
                void signOut();
              }}
            >
              Sign out
            </IonButton>
          </IonItem>
        </IonItemGroup>
      </IonList>
    );
  }

  return (
    <form
      autoComplete="on"
      onSubmit={(event) => {
        event.preventDefault();
        if (password.length > 0) {
          void signInWithPassword();
        }
      }}
    >
      <input
        type="email"
        name="username"
        value={email}
        readOnly
        autoComplete="username"
        style={{ display: "none" }}
      />
      <IonList inset>
        <IonItemGroup>
          <IonItem lines="none">
            <IonNote>Enter the six-digit sign-in code for this account.</IonNote>
          </IonItem>
          <IonItem lines="none">
            <IonInputOtp
              style={{ margin: "0 auto" }}
              length={OTP_LENGTH}
              value={otp}
              disabled={isBusy}
              onIonChange={(event) => {
                setOtp(event.detail.value ?? "");
              }}
              onIonComplete={(event) => {
                void verifyOtp(event.detail.value ?? "");
              }}
            />
          </IonItem>
          <IonItem lines="none">
            <IonNote>Or sign in with your password.</IonNote>
          </IonItem>
          <IonItem>
            <IonInput
              label="Password"
              labelPlacement="stacked"
              type="password"
              autocomplete="current-password"
              value={password}
              disabled={isBusy}
              onIonInput={(event) => {
                setPassword(event.detail.value ?? "");
              }}
            />
          </IonItem>
          {busyAction ? (
            <IonItem lines="none">
              <IonSpinner name="crescent" />
              <IonNote className="ion-padding-start">{BUSY_LABELS[busyAction]}</IonNote>
            </IonItem>
          ) : null}
          {error ? (
            <IonItem lines="none">
              <IonNote color="danger">{error}</IonNote>
            </IonItem>
          ) : null}
        </IonItemGroup>
      </IonList>
      <div className="ion-padding">
        <IonButton expand="block" type="submit" disabled={isBusy || password.length === 0}>
          Sign in
        </IonButton>
        <IonButton
          expand="block"
          fill="clear"
          disabled={isBusy}
          onClick={() => {
            void sendOtp();
          }}
        >
          Resend code
        </IonButton>
      </div>
    </form>
  );
};
