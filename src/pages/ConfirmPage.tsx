// src/pages/ConfirmPage.tsx
import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader } from "lucide-react";

type Status = "loading" | "success" | "error";

interface ConfirmResponse {
  message: string;
}

export default function ConfirmPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (!token) {
      setStatus("error");
      setMessage("Token di conferma mancante o non valido.");
      return;
    }

    const confirmAccount = async () => {
      try {
        const response = await fetch("/api/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data: ConfirmResponse = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.message || "Errore durante la conferma");
        }
      } catch (error) {
        console.error("Errore conferma:", error);
        setStatus("error");
        setMessage("Errore di connessione. Riprova più tardi.");
      }
    };

    confirmAccount();
  }, [searchParams]);

  const getIcon = () => {
    switch (status) {
      case "loading":
        return <Loader className="animate-spin text-blue-600" size={48} />;
      case "success":
        return <CheckCircle className="text-green-600" size={48} />;
      case "error":
        return <XCircle className="text-red-600" size={48} />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case "loading":
        return "Conferma in corso...";
      case "success":
        return "Email confermata!";
      case "error":
        return "Errore di conferma";
    }
  };

  const getBgColor = () => {
    switch (status) {
      case "loading":
        return "bg-blue-50 border-blue-200";
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-md w-full">
        <div className={`bg-white rounded-lg shadow-lg p-8 border-2 ${getBgColor()}`}>
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {getIcon()}
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {getTitle()}
            </h1>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              {message}
            </p>

            {status === "success" && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Prossimi passi:</strong><br />
                    La tua richiesta è stata inviata all'amministratore. 
                    Riceverai un'email quando il tuo account sarà approvato.
                  </p>
                </div>
                
                <Link
                  to="/login"
                  className="inline-block w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Vai al Login
                </Link>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <Link
                  to="/register"
                  className="inline-block w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Torna alla Registrazione
                </Link>
              </div>
            )}

            {status === "loading" && (
              <div className="text-sm text-gray-500">
                Attendere prego...
              </div>
            )}
          </div>
        </div>
        
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Torna alla Home
          </Link>
        </div>
      </div>
    </div>
  );
}